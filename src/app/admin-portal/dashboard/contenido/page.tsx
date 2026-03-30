'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, FileText, Video, Mic, ImagePlus, X, Loader2, Search, Link2 } from 'lucide-react';
import type { BlogPost, BlogMediaType, BlogStatus, Service, Profile } from '@/types/database';
import { BLOG_STATUS_LABELS, BLOG_STATUS_COLORS } from '@/lib/constants';
import { getAllBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, getBlogPostLinks, setBlogPostLinks, getServices } from '@/lib/supabase/queries';
import { uploadBlogMedia } from '@/lib/supabase/storage';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { isHtmlContent, markdownToBasicHtml } from '@/lib/blog-utils';

const RichTextEditor = dynamic(
  () => import('@/components/admin/rich-text-editor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const mediaTypeIcons: Record<string, React.ElementType> = {
  text: FileText,
  video: Video,
  audio: Mic,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Tag Input Component ────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const tag = input.trim().toLowerCase();
      if (!tags.includes(tag)) {
        onChange([...tags, tag]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[40px] focus-within:ring-2 focus-within:ring-ring">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Escribe y presiona Enter...' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
      />
    </div>
  );
}

// ─── Image Upload Button ────────────────────────────────────

function ImageUploadField({
  label,
  value,
  onChange,
  userId,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  userId?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadBlogMedia(file, userId);
      onChange(url);
    } catch {
      console.error('Error uploading image');
    }
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="relative group w-full h-32 rounded-lg overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
          />
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Click para subir imagen</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Linked Content Selector ────────────────────────────────

interface LinkedItem {
  type: 'service' | 'provider';
  id: string;
  label: string;
}

function LinkedContentSelector({
  items,
  onChange,
}: {
  items: LinkedItem[];
  onChange: (items: LinkedItem[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Service[]>([]);
  const [searching, setSearching] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const services = await getServices({ search: query, status: 'active' });
      setSearchResults(services.slice(0, 8));
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  function onSearchChange(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => handleSearch(value), 300);
  }

  function addService(service: Service) {
    if (items.some(i => i.type === 'service' && i.id === service.id)) return;
    onChange([...items, { type: 'service', id: service.id, label: service.title }]);
    setSearchQuery('');
    setSearchResults([]);
  }

  function addProvider(provider: Profile) {
    if (items.some(i => i.type === 'provider' && i.id === provider.id)) return;
    onChange([...items, { type: 'provider', id: provider.id, label: provider.company_name || provider.full_name }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />Servicios/Proveedores enlazados</Label>

      {/* Current items */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={`${item.type}-${item.id}`} variant="outline" className="gap-1 text-xs">
              {item.type === 'service' ? '🔧' : '👤'} {item.label}
              <button type="button" onClick={() => removeItem(i)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar servicio para enlazar..."
          className="pl-8"
        />
      </div>

      {/* Results dropdown */}
      {(searchResults.length > 0 || searching) && (
        <div className="border rounded-md max-h-48 overflow-y-auto">
          {searching ? (
            <div className="p-3 text-center text-sm text-muted-foreground">Buscando...</div>
          ) : searchResults.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer text-sm" onClick={() => addService(s)}>
              <div>
                <span className="font-medium">{s.title}</span>
                {s.provider && (
                  <span className="text-muted-foreground ml-2">por {s.provider.company_name || s.provider.full_name}</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); addService(s); }}>
                  + Servicio
                </Button>
                {s.provider && !items.some(i => i.type === 'provider' && i.id === s.provider_id) && (
                  <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); if (s.provider) addProvider(s.provider); }}>
                    + Proveedor
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function AdminContenidoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('contenido');

  // Form state — basic
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [mediaType, setMediaType] = useState<BlogMediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [status, setStatus] = useState<BlogStatus>('draft');
  const [publishDate, setPublishDate] = useState('');

  // Form state — SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Form state — linked content
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);

  // Image upload callback for RichTextEditor
  const handleEditorImageUpload = useCallback(async (file: File) => {
    const url = await uploadBlogMedia(file, user?.id);
    return url;
  }, [user?.id]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getAllBlogPosts();
      setPosts(data);
    } catch (err) {
      console.error('Error loading blog posts:', err);
    }
    setLoading(false);
  }

  function openCreateDialog() {
    setEditingPost(null);
    resetForm();
    setFormTab('contenido');
    setDialogOpen(true);
  }

  async function openEditDialog(post: BlogPost) {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    const excerptToLoad = post.excerpt ?? '';
    setExcerpt(isHtmlContent(excerptToLoad) ? excerptToLoad : excerptToLoad ? markdownToBasicHtml(excerptToLoad) : '');
    const contentToLoad = isHtmlContent(post.content) ? post.content : markdownToBasicHtml(post.content);
    setContent(contentToLoad);
    setCoverImage(post.cover_image ?? '');
    setMediaType(post.media_type);
    setMediaUrl(post.media_url ?? '');
    setStatus(post.status);
    setPublishDate(post.publish_date ? post.publish_date.slice(0, 10) : '');
    setMetaTitle(post.meta_title ?? '');
    setMetaDescription(post.meta_description ?? '');
    setFocusKeyword(post.focus_keyword ?? '');
    setOgImage(post.og_image ?? '');
    setTags(post.tags ?? []);
    setFormTab('contenido');

    // Load linked items
    try {
      const links = await getBlogPostLinks(post.id);
      const items: LinkedItem[] = links.map(l => {
        if (l.service) return { type: 'service' as const, id: l.service.id, label: l.service.title };
        if (l.provider) return { type: 'provider' as const, id: l.provider.id, label: l.provider.company_name || l.provider.full_name };
        return null;
      }).filter((x): x is LinkedItem => x !== null);
      setLinkedItems(items);
    } catch {
      setLinkedItems([]);
    }

    setDialogOpen(true);
  }

  function resetForm() {
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCoverImage('');
    setMediaType('text');
    setMediaUrl('');
    setStatus('draft');
    setPublishDate('');
    setMetaTitle('');
    setMetaDescription('');
    setFocusKeyword('');
    setOgImage('');
    setTags([]);
    setLinkedItems([]);
  }

  async function handleSave() {
    if (!title || !slug) return;
    setSaving(true);
    try {
      const postData = {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        cover_image: coverImage || null,
        media_type: mediaType,
        media_url: mediaUrl || null,
        status,
        publish_date: publishDate ? new Date(publishDate).toISOString() : null,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        focus_keyword: focusKeyword || null,
        og_image: ogImage || null,
        tags: tags.length > 0 ? tags : [],
      };

      let postId: string;

      if (editingPost) {
        await updateBlogPost(editingPost.id, postData);
        postId = editingPost.id;
      } else {
        const created = await createBlogPost({
          ...postData,
          excerpt: postData.excerpt ?? undefined,
          cover_image: postData.cover_image ?? undefined,
          media_url: postData.media_url ?? undefined,
          publish_date: postData.publish_date ?? undefined,
          meta_title: postData.meta_title ?? undefined,
          meta_description: postData.meta_description ?? undefined,
          focus_keyword: postData.focus_keyword ?? undefined,
          og_image: postData.og_image ?? undefined,
          author_id: user?.id,
        });
        postId = created.id;
      }

      // Save linked content
      const links = linkedItems.map(item => ({
        service_id: item.type === 'service' ? item.id : undefined,
        provider_id: item.type === 'provider' ? item.id : undefined,
      }));
      await setBlogPostLinks(postId, links);

      setDialogOpen(false);
      resetForm();
      loadData();
      toast({ title: editingPost ? 'Post actualizado' : 'Post creado' });
    } catch (err) {
      console.error('Error saving blog post:', err);
      toast({ title: 'Error al guardar', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteBlogPost(id);
      loadData();
      toast({ title: 'Post eliminado' });
    } catch (err) {
      console.error('Error deleting blog post:', err);
      toast({ title: 'Error al eliminar', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    }
  }

  const filteredPosts = statusFilter === 'all' ? posts : posts.filter(p => p.status === statusFilter);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contenido</h1>
        <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Nuevo Post</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Todos ({posts.length})</TabsTrigger>
          <TabsTrigger value="draft">Borradores ({posts.filter(p => p.status === 'draft').length})</TabsTrigger>
          <TabsTrigger value="published">Publicados ({posts.filter(p => p.status === 'published').length})</TabsTrigger>
          <TabsTrigger value="archived">Archivados ({posts.filter(p => p.status === 'archived').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Fecha Publicacion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin posts</TableCell></TableRow>
                  ) : filteredPosts.map(post => {
                    const MediaIcon = mediaTypeIcons[post.media_type] || FileText;
                    return (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MediaIcon className="h-4 w-4" />
                            <span className="text-sm capitalize">{post.media_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(post.tags ?? []).slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                            {(post.tags ?? []).length > 3 && (
                              <Badge variant="outline" className="text-[10px]">+{(post.tags ?? []).length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {post.publish_date ? new Date(post.publish_date).toLocaleDateString('es-MX') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={BLOG_STATUS_COLORS[post.status]}>{BLOG_STATUS_LABELS[post.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(post)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(post.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create / Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Editar Post' : 'Nuevo Post'}</DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList className="w-full">
              <TabsTrigger value="contenido" className="flex-1">Contenido</TabsTrigger>
              <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
              <TabsTrigger value="enlaces" className="flex-1">Enlaces</TabsTrigger>
            </TabsList>

            <div className="max-h-[60vh] overflow-y-auto pr-1 mt-4">

              {/* ─── Tab: Contenido ────────────────────────────── */}
              <TabsContent value="contenido" className="space-y-4 mt-0">
                <div>
                  <Label>Titulo</Label>
                  <Input value={title} onChange={e => { setTitle(e.target.value); if (!editingPost) setSlug(slugify(e.target.value)); }} placeholder="Titulo del post" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="url-del-post" />
                </div>
                <div>
                  <Label>Extracto</Label>
                  <RichTextEditor content={excerpt} onChange={setExcerpt} placeholder="Breve descripcion..." variant="simple" />
                </div>

                <ImageUploadField label="Imagen de portada" value={coverImage} onChange={setCoverImage} userId={user?.id} />

                <div>
                  <Label>Contenido</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Escribe el contenido..."
                    variant="full"
                    onImageUpload={handleEditorImageUpload}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de media</Label>
                    <Select value={mediaType} onValueChange={(v) => setMediaType(v as BlogMediaType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as BlogStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                        <SelectItem value="archived">Archivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {mediaType !== 'text' && (
                  <div>
                    <Label>URL del media</Label>
                    <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..." />
                  </div>
                )}
                <div>
                  <Label>Fecha de publicacion</Label>
                  <Input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} />
                </div>
              </TabsContent>

              {/* ─── Tab: SEO ──────────────────────────────────── */}
              <TabsContent value="seo" className="space-y-4 mt-0">
                <div>
                  <Label>Meta Titulo <span className="text-xs text-muted-foreground">(para buscadores, si es diferente al titulo)</span></Label>
                  <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Titulo para Google (max 60 chars)" maxLength={70} />
                  <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/70 caracteres</p>
                </div>
                <div>
                  <Label>Meta Descripcion</Label>
                  <Textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={3} placeholder="Descripcion para buscadores (max 160 chars)" maxLength={160} />
                  <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 caracteres</p>
                </div>
                <div>
                  <Label>Palabra clave (Focus Keyword)</Label>
                  <Input value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} placeholder="ej: catering para bodas" />
                </div>
                <div>
                  <Label>Etiquetas (Tags)</Label>
                  <TagInput tags={tags} onChange={setTags} />
                  <p className="text-xs text-muted-foreground mt-1">Presiona Enter o coma para agregar</p>
                </div>

                <ImageUploadField label="Imagen Open Graph (para redes sociales)" value={ogImage} onChange={setOgImage} userId={user?.id} />
              </TabsContent>

              {/* ─── Tab: Enlaces ───────────────────────────────── */}
              <TabsContent value="enlaces" className="space-y-4 mt-0">
                <p className="text-sm text-muted-foreground">
                  Enlaza servicios o proveedores a este post. Apareceran como recomendaciones al final del articulo.
                </p>
                <LinkedContentSelector items={linkedItems} onChange={setLinkedItems} />
              </TabsContent>

            </div>
          </Tabs>

          <Button onClick={handleSave} className="w-full mt-2" disabled={saving || !title || !slug}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : editingPost ? 'Guardar Cambios' : 'Crear Post'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

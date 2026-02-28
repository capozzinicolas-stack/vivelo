'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, FileText, Video, Mic } from 'lucide-react';
import type { BlogPost, BlogMediaType, BlogStatus } from '@/types/database';
import { BLOG_STATUS_LABELS, BLOG_STATUS_COLORS } from '@/lib/constants';
import { getAllBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost } from '@/lib/supabase/queries';

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

export default function AdminContenidoPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [mediaType, setMediaType] = useState<BlogMediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [status, setStatus] = useState<BlogStatus>('draft');
  const [publishDate, setPublishDate] = useState('');

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
    setDialogOpen(true);
  }

  function openEditDialog(post: BlogPost) {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? '');
    setContent(post.content);
    setCoverImage(post.cover_image ?? '');
    setMediaType(post.media_type);
    setMediaUrl(post.media_url ?? '');
    setStatus(post.status);
    setPublishDate(post.publish_date ? post.publish_date.slice(0, 10) : '');
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
  }

  async function handleSave() {
    if (!title || !slug) return;
    try {
      if (editingPost) {
        await updateBlogPost(editingPost.id, {
          title,
          slug,
          excerpt: excerpt || null,
          content,
          cover_image: coverImage || null,
          media_type: mediaType,
          media_url: mediaUrl || null,
          status,
          publish_date: publishDate ? new Date(publishDate).toISOString() : null,
        });
      } else {
        await createBlogPost({
          title,
          slug,
          excerpt: excerpt || undefined,
          content,
          cover_image: coverImage || undefined,
          media_type: mediaType,
          media_url: mediaUrl || undefined,
          status,
          publish_date: publishDate ? new Date(publishDate).toISOString() : undefined,
        });
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error saving blog post:', err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBlogPost(id);
      loadData();
    } catch (err) {
      console.error('Error deleting blog post:', err);
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
                    <TableHead>Fecha Publicacion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin posts</TableCell></TableRow>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Editar Post' : 'Nuevo Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
              <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} placeholder="Breve descripcion..." />
            </div>
            <div>
              <Label>Contenido</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Contenido en markdown..." />
            </div>
            <div>
              <Label>Imagen de portada (URL)</Label>
              <Input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="/ruta-imagen.jpg" />
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
            <Button onClick={handleSave} className="w-full">{editingPost ? 'Guardar Cambios' : 'Crear Post'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

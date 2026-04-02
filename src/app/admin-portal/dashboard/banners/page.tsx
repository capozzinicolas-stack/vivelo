'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useCatalog } from '@/providers/catalog-provider';
import { useToast } from '@/hooks/use-toast';
import type { LandingPageBanner, LandingBannerPosition } from '@/types/database';
import { EVENT_TYPES } from '@/data/event-types';

const POSITION_LABELS: Record<LandingBannerPosition, string> = {
  hero: 'Hero (arriba)',
  mid_feed: 'Mid-feed (dentro del grid)',
  bottom: 'Bottom (antes de links)',
};

export default function AdminBannersPage() {
  const { categories, zones } = useCatalog();
  const { toast } = useToast();
  const [banners, setBanners] = useState<LandingPageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('Ver mas');
  const [ctaUrl, setCtaUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bgColor, setBgColor] = useState('#43276c');
  const [position, setPosition] = useState<LandingBannerPosition>('hero');
  const [targetCategory, setTargetCategory] = useState('');
  const [targetZone, setTargetZone] = useState('');
  const [targetEventType, setTargetEventType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState(0);

  const loadBanners = async () => {
    try {
      const res = await fetch('/api/admin/banners');
      if (!res.ok) throw new Error('Error cargando banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (error) {
      console.error('[AdminBanners] Error:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los banners', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBanners(); }, []);

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setCtaText('Ver mas');
    setCtaUrl('');
    setImageUrl('');
    setBgColor('#43276c');
    setPosition('hero');
    setTargetCategory('');
    setTargetZone('');
    setTargetEventType('');
    setIsActive(true);
    setStartDate('');
    setEndDate('');
    setPriority(0);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (banner: LandingPageBanner) => {
    setEditingId(banner.id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setCtaText(banner.cta_text);
    setCtaUrl(banner.cta_url);
    setImageUrl(banner.image_url || '');
    setBgColor(banner.background_color || '#43276c');
    setPosition(banner.position);
    setTargetCategory(banner.target_category || '');
    setTargetZone(banner.target_zone || '');
    setTargetEventType(banner.target_event_type || '');
    setIsActive(banner.is_active);
    setStartDate(banner.start_date ? banner.start_date.slice(0, 10) : '');
    setEndDate(banner.end_date ? banner.end_date.slice(0, 10) : '');
    setPriority(banner.priority);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !ctaUrl.trim()) {
      toast({ title: 'Error', description: 'Titulo y URL del CTA son requeridos', variant: 'destructive' });
      return;
    }

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      cta_text: ctaText.trim() || 'Ver mas',
      cta_url: ctaUrl.trim(),
      image_url: imageUrl.trim() || null,
      background_color: bgColor.trim() || '#43276c',
      position,
      target_category: targetCategory || null,
      target_zone: targetZone || null,
      target_event_type: targetEventType || null,
      is_active: isActive,
      start_date: startDate || null,
      end_date: endDate || null,
      priority,
    };

    try {
      const url = editingId ? `/api/admin/banners/${editingId}` : '/api/admin/banners';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando banner');

      toast({ title: editingId ? 'Banner actualizado' : 'Banner creado' });
      setDialogOpen(false);
      resetForm();
      loadBanners();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error guardando', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error eliminando banner');
      toast({ title: 'Banner eliminado' });
      loadBanners();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el banner', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (banner: LandingPageBanner) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      if (!res.ok) throw new Error('Error actualizando');
      loadBanners();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el banner', variant: 'destructive' });
    }
  };

  const getTargetLabel = (banner: LandingPageBanner) => {
    const parts: string[] = [];
    if (banner.target_category) {
      const cat = categories.find(c => c.slug === banner.target_category);
      parts.push(cat?.label || banner.target_category);
    }
    if (banner.target_zone) {
      const zone = zones.find(z => z.slug === banner.target_zone);
      parts.push(zone?.label || banner.target_zone);
    }
    if (banner.target_event_type) {
      const et = EVENT_TYPES.find(e => e.slug === banner.target_event_type);
      parts.push(et?.label || banner.target_event_type);
    }
    return parts.length > 0 ? parts.join(' + ') : 'Global (todas las paginas)';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banners de Landing Pages</h1>
          <p className="text-muted-foreground">Gestiona banners contextuales que aparecen en las paginas de categoria, zona y tipo de evento.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo Banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Banner' : 'Crear Banner'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Titulo *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titulo del banner" />
              </div>
              <div className="grid gap-2">
                <Label>Subtitulo</Label>
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtitulo opcional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Texto del boton</Label>
                  <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Ver mas" />
                </div>
                <div className="grid gap-2">
                  <Label>URL del boton *</Label>
                  <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="/servicios" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>URL de imagen</Label>
                  <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="grid gap-2">
                  <Label>Color de fondo</Label>
                  <div className="flex gap-2">
                    <Input value={bgColor} onChange={e => setBgColor(e.target.value)} placeholder="#43276c" />
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Posicion *</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as LandingBannerPosition)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridad</Label>
                  <Input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} />
                  <p className="text-xs text-muted-foreground">Mayor numero = mayor prioridad</p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Segmentacion (donde aparece)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-xs text-muted-foreground">Deja todos vacios para que aparezca en todas las landing pages. Selecciona uno o mas para restringir.</p>
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select value={targetCategory || '__none__'} onValueChange={(v) => setTargetCategory(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Todas las categorias" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Todas las categorias</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Zona</Label>
                    <Select value={targetZone || '__none__'} onValueChange={(v) => setTargetZone(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Todas las zonas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Todas las zonas</SelectItem>
                        {zones.map(z => (
                          <SelectItem key={z.slug} value={z.slug}>{z.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de evento</Label>
                    <Select value={targetEventType || '__none__'} onValueChange={(v) => setTargetEventType(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Todos los eventos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Todos los eventos</SelectItem>
                        {EVENT_TYPES.map(et => (
                          <SelectItem key={et.slug} value={et.slug}>{et.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Fecha de inicio</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Fecha de fin</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Activo</Label>
              </div>

              <Button onClick={handleSave} className="w-full">{editingId ? 'Guardar cambios' : 'Crear banner'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Posicion</TableHead>
                <TableHead>Segmentacion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay banners. Crea uno para empezar.
                  </TableCell>
                </TableRow>
              ) : (
                banners.map(banner => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{banner.title}</p>
                        {banner.subtitle && <p className="text-xs text-muted-foreground">{banner.subtitle}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{POSITION_LABELS[banner.position]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getTargetLabel(banner)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={banner.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(banner)}
                      >
                        {banner.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{banner.priority}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(banner)} aria-label="Editar banner">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)} aria-label="Eliminar banner">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

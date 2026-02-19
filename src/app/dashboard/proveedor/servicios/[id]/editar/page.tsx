'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { categories } from '@/data/categories';
import { ZONES, PRICE_UNITS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { getServiceById, updateService } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload } from '@/components/media-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';
import Link from 'next/link';

export default function EditarServicioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('por evento');
  const [minGuests, setMinGuests] = useState('1');
  const [maxGuests, setMaxGuests] = useState('100');
  const [minHours, setMinHours] = useState('1');
  const [maxHours, setMaxHours] = useState('12');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState('0');
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState('0');

  const isPerHour = priceUnit === 'por hora';

  useEffect(() => {
    getServiceById(id).then(s => {
      if (!s) return;
      setTitle(s.title);
      setDescription(s.description);
      setCategory(s.category);
      setBasePrice(s.base_price.toString());
      setPriceUnit(s.price_unit);
      setMinGuests(s.min_guests.toString());
      setMaxGuests(s.max_guests.toString());
      setMinHours((s.min_hours || 1).toString());
      setMaxHours((s.max_hours || 12).toString());
      setSelectedZones(s.zones);
      setImages(s.images || []);
      setVideos(s.videos || []);
      setBufferBeforeMinutes((s.buffer_before_minutes || 0).toString());
      setBufferAfterMinutes((s.buffer_after_minutes || 0).toString());
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) => prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !category || !basePrice) {
      toast({ title: 'Campos requeridos', description: 'Completa titulo, categoria y precio.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await updateService(id, {
        title,
        description,
        category: category as ServiceCategory,
        base_price: parseFloat(basePrice),
        price_unit: priceUnit,
        min_guests: parseInt(minGuests) || 1,
        max_guests: parseInt(maxGuests) || 100,
        min_hours: parseFloat(minHours) || 1,
        max_hours: parseFloat(maxHours) || 12,
        zones: selectedZones,
        images,
        videos,
        buffer_before_minutes: parseInt(bufferBeforeMinutes) || 0,
        buffer_after_minutes: parseInt(bufferAfterMinutes) || 0,
      });
      toast({ title: 'Servicio actualizado!' });
      router.push('/dashboard/proveedor/servicios');
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el servicio.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/proveedor/servicios"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">Editar Servicio</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informacion Basica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Titulo *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
            <div><Label>Descripcion</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={4} /></div>
            <div><Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Precio Base *</Label><Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="mt-1" /></div>
              <div><Label>Unidad de Precio *</Label>
                <Select value={priceUnit} onValueChange={setPriceUnit}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICE_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min. Invitados</Label><Input type="number" value={minGuests} onChange={(e) => setMinGuests(e.target.value)} className="mt-1" /></div>
              <div><Label>Max. Invitados</Label><Input type="number" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className="mt-1" /></div>
            </div>
            {isPerHour && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Min. Horas</Label><Input type="number" step="0.5" value={minHours} onChange={(e) => setMinHours(e.target.value)} className="mt-1" /></div>
                <div><Label>Max. Horas</Label><Input type="number" step="0.5" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} className="mt-1" /></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tiempos de Preparacion</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Tiempo adicional antes y despues del evento para montaje y desmontaje.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Minutos antes</Label><Input type="number" min="0" step="15" value={bufferBeforeMinutes} onChange={(e) => setBufferBeforeMinutes(e.target.value)} className="mt-1" /></div>
              <div><Label>Minutos despues</Label><Input type="number" min="0" step="15" value={bufferAfterMinutes} onChange={(e) => setBufferAfterMinutes(e.target.value)} className="mt-1" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos y Videos</CardTitle>
            <p className="text-sm text-muted-foreground">Sube hasta 5 imagenes y 2 videos</p>
          </CardHeader>
          <CardContent>
            {user && (
              <MediaUpload
                userId={user.id}
                images={images}
                videos={videos}
                onImagesChange={setImages}
                onVideosChange={setVideos}
                maxImages={5}
                maxVideos={2}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Zonas de Servicio</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ZONES.map((z) => (
                <label key={z} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedZones.includes(z)} onCheckedChange={() => toggleZone(z)} />
                  <span className="text-sm">{z}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  );
}

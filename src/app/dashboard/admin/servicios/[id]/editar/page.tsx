'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { categories } from '@/data/categories';
import { ZONES, PRICE_UNITS } from '@/lib/constants';
import { getServiceById, updateService, updateServiceStatus, createExtra, updateExtra as updateExtraQuery, deleteExtra } from '@/lib/supabase/queries';
import { generateServiceSku, generateExtraSku } from '@/lib/sku';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload } from '@/components/media-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ServiceCategory, ServiceStatus, Extra } from '@/types/database';

const statusOptions: { value: ServiceStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'draft', label: 'Borrador' },
  { value: 'archived', label: 'Archivado' },
];

export default function AdminEditarServicioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [providerName, setProviderName] = useState('');
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
  const [status, setStatus] = useState<ServiceStatus>('active');
  const [sku, setSku] = useState('');
  const [baseEventHours, setBaseEventHours] = useState('');
  const [serviceExtras, setServiceExtras] = useState<Extra[]>([]);
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');
  const [newExtraPriceType, setNewExtraPriceType] = useState<'fixed' | 'per_person' | 'per_hour'>('fixed');
  const [newExtraMaxQty, setNewExtraMaxQty] = useState('1');
  const [newExtraDependsGuests, setNewExtraDependsGuests] = useState(false);
  const [newExtraDependsHours, setNewExtraDependsHours] = useState(false);

  const isPerHour = priceUnit === 'por hora';
  const showMinMaxHours = isPerHour;

  useEffect(() => {
    getServiceById(id).then(s => {
      if (!s) return;
      setProviderId(s.provider_id);
      setProviderName(s.provider?.full_name || 'N/A');
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
      setStatus(s.status);
      setSku(s.sku || '');
      setBaseEventHours(s.base_event_hours?.toString() || '');
      setServiceExtras(s.extras || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) => prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        sku: sku || undefined,
        base_event_hours: !isPerHour && baseEventHours ? parseFloat(baseEventHours) : null,
      });
      await updateServiceStatus(id, status);
      toast({ title: 'Servicio actualizado!' });
      router.push('/dashboard/admin/servicios');
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el servicio.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExtra = async () => {
    if (!newExtraName || !newExtraPrice) {
      toast({ title: 'Completa nombre y precio del extra', variant: 'destructive' });
      return;
    }
    try {
      const extraSku = sku ? generateExtraSku(sku, serviceExtras.length) : undefined;
      const created = await createExtra({
        service_id: id,
        name: newExtraName,
        price: parseFloat(newExtraPrice),
        price_type: newExtraPriceType,
        max_quantity: parseInt(newExtraMaxQty) || 1,
        sku: extraSku,
        depends_on_guests: newExtraDependsGuests,
        depends_on_hours: newExtraDependsHours,
      });
      setServiceExtras([...serviceExtras, created]);
      setNewExtraName('');
      setNewExtraPrice('');
      setNewExtraPriceType('fixed');
      setNewExtraMaxQty('1');
      setNewExtraDependsGuests(false);
      setNewExtraDependsHours(false);
      toast({ title: 'Extra agregado!' });
    } catch {
      toast({ title: 'Error al agregar extra', variant: 'destructive' });
    }
  };

  const handleDeleteExtra = async (extraId: string) => {
    try {
      await deleteExtra(extraId);
      setServiceExtras(serviceExtras.filter(e => e.id !== extraId));
      toast({ title: 'Extra eliminado' });
    } catch {
      toast({ title: 'Error al eliminar extra', variant: 'destructive' });
    }
  };

  const handleUpdateExtra = async (extra: Extra, field: string, value: string | boolean) => {
    try {
      await updateExtraQuery(extra.id, { [field]: value });
      setServiceExtras(serviceExtras.map(e => e.id === extra.id ? { ...e, [field]: value } : e));
    } catch {
      toast({ title: 'Error al actualizar extra', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/admin/servicios"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Servicio (Admin)</h1>
          <p className="text-sm text-muted-foreground">Proveedor: <Badge variant="outline">{providerName}</Badge></p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Estado del Servicio</CardTitle></CardHeader>
          <CardContent>
            <Select value={status} onValueChange={(v) => setStatus(v as ServiceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

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
            {showMinMaxHours && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Min. Horas</Label><Input type="number" step="0.5" value={minHours} onChange={(e) => setMinHours(e.target.value)} className="mt-1" /></div>
                <div><Label>Max. Horas</Label><Input type="number" step="0.5" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} className="mt-1" /></div>
              </div>
            )}
            {!isPerHour && (
              <div>
                <Label>Duracion base del servicio (horas)</Label>
                <Input type="number" step="0.5" min="0.5" value={baseEventHours} onChange={(e) => setBaseEventHours(e.target.value)} placeholder="Ej: 5" className="mt-1 max-w-[200px]" />
                <p className="text-xs text-muted-foreground mt-1">Si se define, el horario de fin se calcula automaticamente al reservar.</p>
              </div>
            )}
            {sku && (
              <div>
                <Label>SKU</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={sku} readOnly className="bg-muted font-mono" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setSku(generateServiceSku(category))}>Regenerar</Button>
                </div>
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
            {providerId && (
              <MediaUpload
                userId={providerId}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Extras del Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceExtras.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Sin extras</p>}
          {serviceExtras.map((extra) => (
            <div key={extra.id} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{extra.name}</span>
                  {extra.sku && <span className="text-xs text-muted-foreground ml-2 font-mono">{extra.sku}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${extra.price}</span>
                  <span className="text-xs text-muted-foreground">
                    {extra.price_type === 'fixed' ? 'Fijo' : extra.price_type === 'per_person' ? 'Por persona' : 'Por hora'}
                  </span>
                  <span className="text-xs text-muted-foreground">max: {extra.max_quantity}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteExtra(extra.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Elige la siguiente opcion solo en caso de que tu extra este atado a la cantidad contratada del servicio principal.</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={extra.depends_on_guests} onCheckedChange={(v) => handleUpdateExtra(extra, 'depends_on_guests', !!v)} />
                    <span className="text-sm">Min. cantidad = invitados</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={extra.depends_on_hours} onCheckedChange={(v) => handleUpdateExtra(extra, 'depends_on_hours', !!v)} />
                    <span className="text-sm">Min. cantidad = horas</span>
                  </label>
                </div>
              </div>
            </div>
          ))}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Agregar nuevo extra</p>
            <Input placeholder="Nombre" value={newExtraName} onChange={(e) => setNewExtraName(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Precio" value={newExtraPrice} onChange={(e) => setNewExtraPrice(e.target.value)} />
              <Select value={newExtraPriceType} onValueChange={(v: 'fixed' | 'per_person' | 'per_hour') => setNewExtraPriceType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fijo</SelectItem>
                  <SelectItem value="per_person">Por persona</SelectItem>
                  <SelectItem value="per_hour">Por hora</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Max cant." value={newExtraMaxQty} onChange={(e) => setNewExtraMaxQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Elige la siguiente opcion solo en caso de que tu extra este atado a la cantidad contratada del servicio principal.</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={newExtraDependsGuests} onCheckedChange={(v) => setNewExtraDependsGuests(!!v)} />
                  <span className="text-sm">Min. cantidad = invitados</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={newExtraDependsHours} onCheckedChange={(v) => setNewExtraDependsHours(!!v)} />
                  <span className="text-sm">Min. cantidad = horas</span>
                </label>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleAddExtra}><Plus className="h-4 w-4 mr-1" />Agregar Extra</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

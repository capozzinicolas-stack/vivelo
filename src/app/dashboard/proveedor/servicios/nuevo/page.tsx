'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { categories } from '@/data/categories';
import { ZONES, PRICE_UNITS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { createService } from '@/lib/supabase/queries';
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
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';

interface ExtraInput { name: string; price: string; price_type: 'fixed' | 'per_person' | 'per_hour'; max_quantity: string; sku: string; depends_on_guests: boolean; depends_on_hours: boolean; }

export default function NuevoServicioPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { toast } = useToast();
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
  const [extras, setExtras] = useState<ExtraInput[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState('0');
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState('0');
  const [sku, setSku] = useState('');
  const [baseEventHours, setBaseEventHours] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPerHour = priceUnit === 'por hora';
  const showMinMaxHours = isPerHour;

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) => prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    const newSku = generateServiceSku(val);
    setSku(newSku);
    setExtras(prev => prev.map((ex, i) => ({ ...ex, sku: generateExtraSku(newSku, i) })));
  };

  const addExtra = () => {
    const newSku = sku ? generateExtraSku(sku, extras.length) : '';
    setExtras([...extras, { name: '', price: '', price_type: 'fixed', max_quantity: '1', sku: newSku, depends_on_guests: false, depends_on_hours: false }]);
  };
  const removeExtra = (i: number) => setExtras(extras.filter((_, idx) => idx !== i));
  const updateExtra = (i: number, field: keyof ExtraInput, value: string | boolean) => {
    const updated = [...extras];
    updated[i] = { ...updated[i], [field]: value };
    setExtras(updated);
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
      await createService(
        {
          provider_id: user.id,
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
        },
        extras.filter(e => e.name && e.price).map(e => ({
          name: e.name,
          price: parseFloat(e.price),
          price_type: e.price_type,
          max_quantity: parseInt(e.max_quantity) || 1,
          sku: e.sku || undefined,
          depends_on_guests: e.depends_on_guests,
          depends_on_hours: e.depends_on_hours,
        }))
      );
      toast({ title: 'Servicio creado!', description: `"${title}" ha sido creado exitosamente.` });
      router.push('/dashboard/proveedor/servicios');
    } catch (err) {
      console.error('Error creating service:', err);
      toast({ title: 'Error', description: 'No se pudo crear el servicio.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Crear Nuevo Servicio</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informacion Basica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Titulo *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Buffet Mexicano Premium" className="mt-1" /></div>
            <div><Label>Descripcion</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe tu servicio..." className="mt-1" rows={4} /></div>
            <div><Label>Categoria *</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar categoria" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {sku && (
              <div>
                <Label>SKU</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={sku} readOnly className="bg-muted font-mono" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { const newSku = generateServiceSku(category); setSku(newSku); setExtras(prev => prev.map((ex, i) => ({ ...ex, sku: generateExtraSku(newSku, i) }))); }}>Regenerar</Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Precio Base *</Label><Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" className="mt-1" /></div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos y Videos</CardTitle>
            <p className="text-sm text-muted-foreground">Sube hasta 5 imagenes y 2 videos de tu servicio</p>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Extras</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addExtra}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {extras.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Sin extras por ahora</p>}
            {extras.map((ex, i) => (
              <div key={i} className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Extra #{i + 1}{ex.sku && <span className="text-xs text-muted-foreground ml-2 font-mono">{ex.sku}</span>}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExtra(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
                <Input placeholder="Nombre" value={ex.name} onChange={(e) => updateExtra(i, 'name', e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Precio" value={ex.price} onChange={(e) => updateExtra(i, 'price', e.target.value)} />
                  <Select value={ex.price_type} onValueChange={(v) => updateExtra(i, 'price_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fijo</SelectItem>
                      <SelectItem value="per_person">Por persona</SelectItem>
                      <SelectItem value="per_hour">Por hora</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Max cant." value={ex.max_quantity} onChange={(e) => updateExtra(i, 'max_quantity', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Elige la siguiente opcion solo en caso de que tu extra este atado a la cantidad contratada del servicio principal.</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={ex.depends_on_guests} onCheckedChange={(v) => updateExtra(i, 'depends_on_guests', !!v)} />
                      <span className="text-sm">Min. cantidad = invitados</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={ex.depends_on_hours} onCheckedChange={(v) => updateExtra(i, 'depends_on_hours', !!v)} />
                      <span className="text-sm">Min. cantidad = horas</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : 'Crear Servicio'}
        </Button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { categories } from '@/data/categories';
import { ZONES } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { createService } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';

interface ExtraInput { name: string; price: string; price_type: 'fixed' | 'per_person'; max_quantity: string; }

export default function NuevoServicioPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('');
  const [minGuests, setMinGuests] = useState('1');
  const [maxGuests, setMaxGuests] = useState('100');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [extras, setExtras] = useState<ExtraInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) => prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]);
  };

  const addExtra = () => setExtras([...extras, { name: '', price: '', price_type: 'fixed', max_quantity: '1' }]);
  const removeExtra = (i: number) => setExtras(extras.filter((_, idx) => idx !== i));
  const updateExtra = (i: number, field: keyof ExtraInput, value: string) => {
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
          price_unit: priceUnit || 'por evento',
          min_guests: parseInt(minGuests) || 1,
          max_guests: parseInt(maxGuests) || 100,
          zones: selectedZones,
        },
        extras.filter(e => e.name && e.price).map(e => ({
          name: e.name,
          price: parseFloat(e.price),
          price_type: e.price_type,
          max_quantity: parseInt(e.max_quantity) || 1,
        }))
      );
      toast({ title: 'Servicio creado!', description: `"${title}" ha sido creado exitosamente.` });
      router.push('/dashboard/proveedor/servicios');
    } catch {
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
            <div><Label>Titulo *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Buffet Criollo Premium" className="mt-1" /></div>
            <div><Label>Descripcion</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe tu servicio..." className="mt-1" rows={4} /></div>
            <div><Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar categoria" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Precio Base *</Label><Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" className="mt-1" /></div>
              <div><Label>Unidad de Precio</Label><Input value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} placeholder="por persona, por evento..." className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min. Invitados</Label><Input type="number" value={minGuests} onChange={(e) => setMinGuests(e.target.value)} className="mt-1" /></div>
              <div><Label>Max. Invitados</Label><Input type="number" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className="mt-1" /></div>
            </div>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Extras</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addExtra}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {extras.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Sin extras por ahora</p>}
            {extras.map((ex, i) => (
              <div key={i} className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Extra #{i + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExtra(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
                <Input placeholder="Nombre" value={ex.name} onChange={(e) => updateExtra(i, 'name', e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Precio" value={ex.price} onChange={(e) => updateExtra(i, 'price', e.target.value)} />
                  <Select value={ex.price_type} onValueChange={(v) => updateExtra(i, 'price_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fixed">Fijo</SelectItem><SelectItem value="per_person">Por persona</SelectItem></SelectContent>
                  </Select>
                  <Input type="number" placeholder="Max cant." value={ex.max_quantity} onChange={(e) => updateExtra(i, 'max_quantity', e.target.value)} />
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

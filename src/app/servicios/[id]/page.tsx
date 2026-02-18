'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getServiceById, createBooking } from '@/lib/supabase/queries';
import { categoryMap } from '@/data/categories';
import { COMMISSION_RATE } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { ExtrasSelector, type SelectedExtraItem } from '@/components/services/extras-selector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Star, MapPin, ArrowLeft, CalendarIcon, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Service } from '@/types/database';

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtraItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getServiceById(id).then(s => {
      setService(s);
      if (s) setGuests(s.min_guests);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  if (!service) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Servicio no encontrado</h1>
        <Button asChild><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver a servicios</Link></Button>
      </div>
    );
  }

  const cat = categoryMap[service.category];
  const extras = service.extras || [];

  const isPerPerson = service.price_unit.includes('persona');
  const baseTotal = isPerPerson ? service.base_price * guests : service.base_price;
  const extrasTotal = selectedExtras.reduce((sum, sel) => {
    const extra = extras.find((e) => e.id === sel.extra_id);
    if (!extra) return sum;
    const price = extra.price_type === 'per_person' ? extra.price * guests * sel.quantity : extra.price * sel.quantity;
    return sum + price;
  }, 0);
  const subtotal = baseTotal + extrasTotal;
  const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
  const total = subtotal + commission;

  const handleSubmit = async () => {
    if (!user) return;
    if (!date) { toast({ title: 'Selecciona una fecha', variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      await createBooking({
        service_id: service.id,
        client_id: user.id,
        provider_id: service.provider_id,
        event_date: format(date, 'yyyy-MM-dd'),
        guest_count: guests,
        base_total: baseTotal,
        extras_total: extrasTotal,
        commission,
        total,
        selected_extras: selectedExtras.map(sel => {
          const extra = extras.find(e => e.id === sel.extra_id)!;
          return { extra_id: sel.extra_id, name: extra.name, quantity: sel.quantity, price: extra.price * sel.quantity };
        }),
        notes: notes || null,
      });

      toast({ title: 'Reserva solicitada!', description: `Tu solicitud para "${service.title}" ha sido enviada al proveedor.` });
      router.push('/dashboard/cliente/reservas');
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la reserva. Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6"><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link></Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className={`${cat?.color.split(' ')[0] || 'bg-gray-200'} h-64 md:h-96 rounded-xl flex items-center justify-center`}>
            {cat && <cat.icon className="h-20 w-20 text-muted-foreground/30" />}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {cat && <Badge className={cat.color}>{cat.label}</Badge>}
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="font-medium">{service.avg_rating}</span><span className="text-muted-foreground">({service.review_count} resenas)</span></div>
            </div>
            <h1 className="text-3xl font-bold">{service.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{service.description}</p>
            <div className="flex flex-wrap gap-2">
              {service.zones.map((z) => <Badge key={z} variant="outline"><MapPin className="h-3 w-3 mr-1" />{z}</Badge>)}
            </div>
          </div>

          {extras.length > 0 && (
            <>
              <Separator />
              <ExtrasSelector extras={extras} selectedExtras={selectedExtras} onSelectionChange={setSelectedExtras} />
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                <span className="text-2xl">${service.base_price.toLocaleString()}</span>
                <span className="text-sm font-normal text-muted-foreground">{service.price_unit}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">Inicia sesion para reservar</p>
                  <Button asChild className="w-full"><Link href="/login">Iniciar Sesion</Link></Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Fecha del evento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start mt-1">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {date ? format(date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} /></PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Cantidad ({service.price_unit.includes('persona') ? 'invitados' : 'unidades'})</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Input type="number" min={service.min_guests} max={service.max_guests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Min: {service.min_guests} | Max: {service.max_guests}</p>
                  </div>

                  <div>
                    <Label>Notas (opcional)</Label>
                    <Textarea placeholder="Detalles adicionales..." value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Base</span><span>${baseTotal.toLocaleString()}</span></div>
                    {extrasTotal > 0 && <div className="flex justify-between"><span>Extras</span><span>${extrasTotal.toLocaleString()}</span></div>}
                    <div className="flex justify-between text-muted-foreground"><span>Comision ({(COMMISSION_RATE * 100).toFixed(0)}%)</span><span>${commission.toLocaleString()}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toLocaleString()}</span></div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : 'Solicitar Reserva'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

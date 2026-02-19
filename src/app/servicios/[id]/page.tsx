'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getServiceById, createBooking, checkVendorAvailability, createSubBookings } from '@/lib/supabase/queries';
import { calculateEffectiveTimes, resolveBuffers } from '@/lib/availability';
import { categoryMap } from '@/data/categories';
import { COMMISSION_RATE, TIME_SLOTS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { ExtrasSelector, type SelectedExtraItem } from '@/components/services/extras-selector';
import { MediaGallery } from '@/components/services/media-gallery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Star, MapPin, ArrowLeft, CalendarIcon, Users, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Service } from '@/types/database';

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(diff / 60, 0.5);
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('14:00');
  const [guests, setGuests] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtraItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getServiceById(id).then(s => {
      setService(s);
      if (s) setGuests(s.min_guests);
    }).finally(() => setLoading(false));
  }, [id]);

  // Enforce minimum quantities when guests or time changes
  useEffect(() => {
    if (!service) return;
    const allExtras = service.extras || [];
    const updated = selectedExtras.map(sel => {
      const extra = allExtras.find(e => e.id === sel.extra_id);
      if (!extra) return sel;
      let minQty = 1;
      if (extra.depends_on_guests) minQty = Math.max(1, guests);
      if (extra.depends_on_hours) minQty = Math.max(1, Math.ceil(calcHours(startTime, endTime)));
      if (sel.quantity < minQty) return { ...sel, quantity: minQty };
      return sel;
    });
    const changed = updated.some((u, i) => u.quantity !== selectedExtras[i].quantity);
    if (changed) setSelectedExtras(updated);
  }, [guests, startTime, endTime, service]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const isPerPerson = service.price_unit === 'por persona';
  const isPerHour = service.price_unit === 'por hora';
  const isPerEvento = service.price_unit === 'por evento';
  const hasBaseEventHours = isPerEvento && service.base_event_hours;

  // For "por evento" with base_event_hours, auto-compute endTime from startTime
  const computedEndTime = hasBaseEventHours
    ? (() => {
        const [h, m] = startTime.split(':').map(Number);
        const totalMin = h * 60 + m + (service.base_event_hours! * 60);
        const eh = Math.floor(totalMin / 60);
        const em = Math.round(totalMin % 60);
        return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
      })()
    : endTime;

  const eventHours = hasBaseEventHours ? service.base_event_hours! : calcHours(startTime, computedEndTime);

  // Base calculation
  let baseTotal = service.base_price;
  if (isPerPerson) baseTotal = service.base_price * guests;
  if (isPerHour) baseTotal = service.base_price * eventHours;

  const extrasTotal = selectedExtras.reduce((sum, sel) => {
    const extra = extras.find((e) => e.id === sel.extra_id);
    if (!extra) return sum;
    let price = extra.price * sel.quantity;
    if (extra.price_type === 'per_person') price = extra.price * guests * sel.quantity;
    if (extra.price_type === 'per_hour') price = extra.price * eventHours * sel.quantity;
    return sum + price;
  }, 0);

  const subtotal = baseTotal + extrasTotal;
  const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
  const total = subtotal + commission;

  const handleSubmit = async () => {
    if (!user) return;
    if (!date) { toast({ title: 'Selecciona una fecha', variant: 'destructive' }); return; }
    const actualEndTime = hasBaseEventHours ? computedEndTime : endTime;
    if (actualEndTime <= startTime) { toast({ title: 'La hora de fin debe ser despues de la hora de inicio', variant: 'destructive' }); return; }
    if (isPerHour && eventHours < (service.min_hours || 1)) { toast({ title: `Minimo ${service.min_hours} horas para este servicio`, variant: 'destructive' }); return; }
    if (isPerHour && eventHours > (service.max_hours || 12)) { toast({ title: `Maximo ${service.max_hours} horas para este servicio`, variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      const eventDate = format(date, 'yyyy-MM-dd');
      const buffers = resolveBuffers(service, service.provider);
      const effective = calculateEffectiveTimes({
        eventDate,
        startTime,
        endTime: actualEndTime,
        bufferBeforeMinutes: buffers.bufferBeforeMinutes,
        bufferAfterMinutes: buffers.bufferAfterMinutes,
      });

      const availability = await checkVendorAvailability(
        service.provider_id,
        effective.effective_start,
        effective.effective_end,
      );

      if (!availability.available) {
        const reason = availability.has_calendar_block
          ? 'El proveedor tiene un bloqueo en ese horario.'
          : `El proveedor ya tiene ${availability.overlapping_bookings} reserva(s) en ese horario (maximo: ${availability.max_concurrent}).`;
        toast({ title: 'Horario no disponible', description: reason, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const booking = await createBooking({
        service_id: service.id,
        client_id: user.id,
        provider_id: service.provider_id,
        event_date: eventDate,
        start_time: startTime,
        end_time: actualEndTime,
        event_hours: eventHours,
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
        start_datetime: effective.start_datetime,
        end_datetime: effective.end_datetime,
        effective_start: effective.effective_start,
        effective_end: effective.effective_end,
        billing_type_snapshot: service.price_unit,
      });

      // Create sub-bookings for each selected extra
      if (selectedExtras.length > 0) {
        const subItems = selectedExtras.map(sel => {
          const extra = extras.find(e => e.id === sel.extra_id)!;
          let subtotal = extra.price * sel.quantity;
          if (extra.price_type === 'per_person') subtotal = extra.price * guests * sel.quantity;
          if (extra.price_type === 'per_hour') subtotal = extra.price * eventHours * sel.quantity;
          return {
            extra_id: sel.extra_id,
            sku: extra.sku || undefined,
            name: extra.name,
            quantity: sel.quantity,
            unit_price: extra.price,
            price_type: extra.price_type,
            subtotal,
          };
        });
        await createSubBookings(booking.id, subItems);
      }

      toast({ title: 'Reserva solicitada!', description: `Tu solicitud para "${service.title}" ha sido enviada al proveedor.` });
      router.push('/dashboard/cliente/reservas');
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la reserva. Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pricingLabel = isPerPerson ? 'por persona' : isPerHour ? 'por hora' : 'precio fijo';

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6"><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link></Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {(service.images?.length > 0 || service.videos?.length > 0) ? (
            <MediaGallery images={service.images || []} videos={service.videos || []} title={service.title} />
          ) : (
            <div className={`${cat?.color.split(' ')[0] || 'bg-gray-200'} h-64 md:h-96 rounded-xl flex items-center justify-center`}>
              {cat && <cat.icon className="h-20 w-20 text-muted-foreground/30" />}
            </div>
          )}

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
              <ExtrasSelector extras={extras} selectedExtras={selectedExtras} onSelectionChange={setSelectedExtras} guestCount={guests} eventHours={eventHours} />
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                <span className="text-2xl">${service.base_price.toLocaleString()}</span>
                <span className="text-sm font-normal text-muted-foreground">{pricingLabel}</span>
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
                    <Label>Fecha del evento *</Label>
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

                  {hasBaseEventHours ? (
                    <div>
                      <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Hora de inicio *</Label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        Este servicio dura {service.base_event_hours} horas (termina a las {computedEndTime})
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Inicio *</Label>
                          <Select value={startTime} onValueChange={setStartTime}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Fin *</Label>
                          <Select value={endTime} onValueChange={setEndTime}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.filter(t => t.value > startTime).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground -mt-2">
                        Duracion: {eventHours} hora{eventHours !== 1 ? 's' : ''}
                        {(isPerHour || isPerPerson) && ` · Min: ${service.min_hours || 1}h | Max: ${service.max_hours || 12}h`}
                      </p>
                    </>
                  )}

                  <div>
                    <Label className="flex items-center gap-1"><Users className="h-3 w-3" /> Invitados *</Label>
                    <Input type="number" min={service.min_guests} max={service.max_guests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Min: {service.min_guests} | Max: {service.max_guests}</p>
                  </div>

                  <div>
                    <Label>Notas (opcional)</Label>
                    <Textarea placeholder="Detalles adicionales..." value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>
                        {isPerPerson && `$${service.base_price.toLocaleString()} x ${guests} personas`}
                        {isPerHour && `$${service.base_price.toLocaleString()} x ${eventHours}h`}
                        {!isPerPerson && !isPerHour && 'Servicio'}
                      </span>
                      <span>${baseTotal.toLocaleString()}</span>
                    </div>
                    {extrasTotal > 0 && <div className="flex justify-between"><span>Extras</span><span>${extrasTotal.toLocaleString()}</span></div>}
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

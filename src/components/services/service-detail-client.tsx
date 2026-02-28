'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkVendorAvailability, getClientEventNames, incrementServiceViewCount } from '@/lib/supabase/queries';
import { trackViewItem } from '@/lib/analytics';
import { resolveBuffers, calculateEffectiveTimes } from '@/lib/availability';
import { useCatalog } from '@/providers/catalog-provider';
import { TIME_SLOTS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { ExtrasSelector, type SelectedExtraItem } from '@/components/services/extras-selector';
import { MediaGallery } from '@/components/services/media-gallery';
import { CategoryDetailsDisplay } from '@/components/services/category-details-display';
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
import { AlertTriangle, Star, MapPin, CalendarIcon, Users, Clock, Loader2, Search, PartyPopper, ChevronsUpDown, Check, ShoppingCart, Tag, Timer, DollarSign } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Service, Profile, Campaign } from '@/types/database';

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(diff / 60, 0.5);
}

interface ServiceDetailClientProps {
  service: Service;
  provider: Profile | null;
  bookingCount: number;
  activeCampaign?: Campaign | null;
}

export function ServiceDetailClient({ service, provider, bookingCount, activeCampaign }: ServiceDetailClientProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { items, addItem } = useCart();
  const { toast } = useToast();
  const { categoryMap, subcategoryMap, getCategoryIcon } = useCatalog();

  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('14:00');
  const [guests, setGuests] = useState(service.min_guests);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtraItem[]>([]);
  const [notes, setNotes] = useState('');
  const [eventName, setEventName] = useState('');
  const [existingEventNames, setExistingEventNames] = useState<string[]>([]);
  const [eventNameOpen, setEventNameOpen] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{ checking: boolean; available: boolean | null; reason: string }>({ checking: false, available: null, reason: '' });

  // Track view on mount
  useEffect(() => {
    incrementServiceViewCount(service.id);
    trackViewItem({ id: service.id, title: service.title, category: service.category, base_price: service.base_price });
  }, [service.id, service.title, service.category, service.base_price]);

  useEffect(() => {
    const cartNames = Array.from(new Set(items.map(i => i.event_name).filter(Boolean) as string[]));
    if (user) {
      getClientEventNames(user.id).then(dbNames => {
        const merged = Array.from(new Set([...dbNames, ...cartNames]));
        setExistingEventNames(merged);
      });
    } else {
      setExistingEventNames(cartNames);
    }
  }, [user, items]);

  // When guests or hours change, adjust selected extras that depend on them
  const extras = service.extras || [];
  const isPerPerson = service.price_unit === 'por persona';
  const isPerHour = service.price_unit === 'por hora';
  const isPerEvento = service.price_unit === 'por evento';
  const hasBaseEventHours = isPerEvento && service.base_event_hours;

  useEffect(() => {
    const svcExtras = service.extras || [];
    setSelectedExtras(prev => prev.map(sel => {
      const extra = svcExtras.find(e => e.id === sel.extra_id);
      if (!extra) return sel;
      if (extra.depends_on_guests) {
        const minQty = Math.max(1, guests);
        return { ...sel, quantity: Math.max(minQty, Math.min(extra.max_quantity, sel.quantity)) };
      }
      if (extra.depends_on_hours) {
        const hrs = service.base_event_hours && service.price_unit === 'por evento'
          ? service.base_event_hours
          : calcHours(startTime, endTime);
        const minQty = Math.max(1, Math.ceil(hrs));
        return { ...sel, quantity: Math.max(minQty, Math.min(extra.max_quantity, sel.quantity)) };
      }
      return sel;
    }));
  }, [guests, startTime, endTime, service]);

  // Real-time availability check when date/time changes
  useEffect(() => {
    if (!date) {
      setAvailabilityStatus({ checking: false, available: null, reason: '' });
      return;
    }

    const actualEnd = (service.price_unit === 'por evento' && service.base_event_hours)
      ? (() => {
          const [h, m] = startTime.split(':').map(Number);
          const totalMin = h * 60 + m + (service.base_event_hours! * 60);
          const eh = Math.floor(totalMin / 60);
          const em = Math.round(totalMin % 60);
          return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
        })()
      : endTime;

    if (actualEnd <= startTime) return;

    setAvailabilityStatus(prev => ({ ...prev, checking: true }));

    const eventDate = format(date, 'yyyy-MM-dd');
    const buffers = resolveBuffers(service, provider ?? undefined);
    const effective = calculateEffectiveTimes({
      eventDate,
      startTime,
      endTime: actualEnd,
      bufferBeforeMinutes: buffers.bufferBeforeMinutes,
      bufferAfterMinutes: buffers.bufferAfterMinutes,
    });

    const controller = new AbortController();

    checkVendorAvailability(service.provider_id, effective.effective_start, effective.effective_end)
      .then(result => {
        if (controller.signal.aborted) return;
        if (!result.available) {
          const reason = result.has_calendar_block
            ? 'El proveedor tiene un bloqueo en ese horario.'
            : `El proveedor ya tiene ${result.overlapping_bookings} reserva(s) en ese horario (maximo: ${result.max_concurrent}).`;
          setAvailabilityStatus({ checking: false, available: false, reason });
        } else {
          setAvailabilityStatus({ checking: false, available: true, reason: '' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAvailabilityStatus({ checking: false, available: null, reason: '' });
        }
      });

    return () => controller.abort();
  }, [date, startTime, endTime, service, provider]);

  const cat = categoryMap[service.category];

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

  let baseTotal = service.base_price;
  if (isPerPerson) baseTotal = service.base_price * guests;
  if (isPerHour) baseTotal = service.base_price * eventHours;

  const extrasTotal = selectedExtras.reduce((sum, sel) => {
    const extra = extras.find((e) => e.id === sel.extra_id);
    if (!extra) return sum;
    return sum + extra.price * sel.quantity;
  }, 0);

  const total = baseTotal + extrasTotal;

  // Campaign discount
  const discountPct = activeCampaign?.discount_pct || 0;
  const discountAmount = discountPct > 0 ? Math.round(total * (discountPct / 100)) : 0;
  const finalTotal = total - discountAmount;

  const handleAddToCart = () => {
    if (!date) { toast({ title: 'Selecciona una fecha', variant: 'destructive' }); return; }
    const actualEndTime = hasBaseEventHours ? computedEndTime : endTime;
    if (actualEndTime <= startTime) { toast({ title: 'La hora de fin debe ser despues de la hora de inicio', variant: 'destructive' }); return; }
    if (isPerHour && eventHours < (service.min_hours || 1)) { toast({ title: `Minimo ${service.min_hours} horas para este servicio`, variant: 'destructive' }); return; }
    if (isPerHour && eventHours > (service.max_hours || 12)) { toast({ title: `Maximo ${service.max_hours} horas para este servicio`, variant: 'destructive' }); return; }

    addItem({
      id: crypto.randomUUID(),
      service_id: service.id,
      service_snapshot: {
        title: service.title,
        base_price: service.base_price,
        price_unit: service.price_unit,
        base_event_hours: service.base_event_hours ?? null,
        provider_id: service.provider_id,
        provider_name: provider?.company_name || provider?.full_name || 'Proveedor',
        category: service.category,
        image: service.images?.[0] ?? null,
        min_guests: service.min_guests,
        max_guests: service.max_guests,
      },
      event_date: format(date, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: actualEndTime,
      event_hours: eventHours,
      guest_count: guests,
      base_total: baseTotal,
      extras_total: extrasTotal,
      total: finalTotal,
      selected_extras: selectedExtras.map(sel => {
        const extra = extras.find(e => e.id === sel.extra_id)!;
        return { extra_id: sel.extra_id, name: extra.name, quantity: sel.quantity, unit_price: extra.price, subtotal: extra.price * sel.quantity };
      }),
      notes: notes || null,
      event_name: eventName || null,
      added_at: new Date().toISOString(),
    });

    toast({ title: 'Agregado al carrito', description: `"${service.title}" fue agregado a tu carrito.` });
  };

  const handleExploreSimilar = () => {
    const params = new URLSearchParams();
    if (service.category) params.set('categoria', service.category);
    if (service.zones.length > 0) params.set('zona', service.zones[0]);
    if (date) params.set('fecha', format(date, 'yyyy-MM-dd'));
    router.push(`/servicios?${params.toString()}`);
  };

  const pricingLabel = isPerPerson ? 'por persona' : isPerHour ? 'por hora' : 'precio fijo';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {(service.images?.length > 0 || service.videos?.length > 0) ? (
          <MediaGallery images={service.images || []} videos={service.videos || []} title={service.title} />
        ) : (
          <div className={`${cat?.color.split(' ')[0] || 'bg-gray-200'} h-64 md:h-96 rounded-xl flex items-center justify-center`}>
            {cat && (() => { const CatIcon = getCategoryIcon(cat.slug); return <CatIcon className="h-20 w-20 text-muted-foreground/30" />; })()}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {cat && <Badge className={cat.color}>{cat.label}</Badge>}
            {service.subcategory && subcategoryMap[service.subcategory] && (
              <Badge variant="secondary">{subcategoryMap[service.subcategory].label}</Badge>
            )}
            <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="font-medium">{service.avg_rating}</span><span className="text-muted-foreground">({service.review_count} resenas)</span></div>
            <div className="flex items-center gap-1 text-muted-foreground"><ShoppingCart className="h-3.5 w-3.5" /><span className="text-sm">{bookingCount} contratacion{bookingCount !== 1 ? 'es' : ''}</span></div>
          </div>
          <h1 className="text-3xl font-bold">{service.title}</h1>
          {provider && (
            <p className="text-sm text-muted-foreground">
              Ofrecido por{' '}
              <Link href={`/proveedores/${service.provider_id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                {provider.company_name || provider.full_name}
              </Link>
            </p>
          )}

          {activeCampaign && discountPct > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-700 border-red-200">{discountPct}% OFF</Badge>
              <span className="text-sm text-muted-foreground">{activeCampaign.external_name}</span>
            </div>
          )}

          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{service.description}</p>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informacion del servicio</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Precio</p>
                <p className="text-sm text-muted-foreground">${service.base_price.toLocaleString()} {pricingLabel}</p>
              </div>
            </div>
            {service.base_event_hours && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Timer className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Duracion</p>
                  <p className="text-sm text-muted-foreground">{service.base_event_hours} hora{service.base_event_hours !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Capacidad</p>
                <p className="text-sm text-muted-foreground">{service.min_guests} - {service.max_guests.toLocaleString()} invitados</p>
              </div>
            </div>
            {isPerHour && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Horas</p>
                  <p className="text-sm text-muted-foreground">Min: {service.min_hours || 1}h / Max: {service.max_hours || 12}h</p>
                </div>
              </div>
            )}
            {service.subcategory && subcategoryMap[service.subcategory] && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Tag className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tipo</p>
                  <p className="text-sm text-muted-foreground">{subcategoryMap[service.subcategory].label}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Cobertura</p>
                <p className="text-sm text-muted-foreground">{service.zones.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>

        {service.category_details && Object.keys(service.category_details).some(k => {
          const v = service.category_details![k];
          return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
        }) && (
          <>
            <Separator />
            <CategoryDetailsDisplay category={service.category} details={service.category_details} />
          </>
        )}

        {extras.length > 0 && (
          <>
            <Separator />
            <ExtrasSelector extras={extras} selectedExtras={selectedExtras} onSelectionChange={setSelectedExtras} guests={guests} eventHours={eventHours} />
          </>
        )}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              {discountPct > 0 ? (
                <>
                  <span className="text-lg line-through text-muted-foreground">${service.base_price.toLocaleString()}</span>
                  <span className="text-2xl text-red-600">${Math.round(service.base_price * (1 - discountPct / 100)).toLocaleString()}</span>
                </>
              ) : (
                <span className="text-2xl">${service.base_price.toLocaleString()}</span>
              )}
              <span className="text-sm font-normal text-muted-foreground">{pricingLabel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

                <div>
                  <Label className="flex items-center gap-1"><PartyPopper className="h-3 w-3" /> Nombre del evento (opcional)</Label>
                  <Popover open={eventNameOpen} onOpenChange={setEventNameOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={eventNameOpen} className="w-full justify-between mt-1 font-normal">
                        {eventName || 'Ej: Fiesta 50 años, Boda Ana y Pedro...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Escribe o selecciona..." value={eventName} onValueChange={setEventName} />
                        <CommandList>
                          <CommandEmpty>Escribe para crear un nuevo evento</CommandEmpty>
                          {existingEventNames.length > 0 && (
                            <CommandGroup heading="Eventos anteriores">
                              {existingEventNames.map(name => (
                                <CommandItem key={name} value={name} onSelect={(val) => { setEventName(val); setEventNameOpen(false); }}>
                                  <Check className={cn('mr-2 h-4 w-4', eventName === name ? 'opacity-100' : 'opacity-0')} />
                                  {name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">Agrupa tus reservas bajo un mismo evento</p>
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
                  {selectedExtras.map(sel => {
                    const extra = extras.find(e => e.id === sel.extra_id);
                    if (!extra) return null;
                    const subtotal = extra.price * sel.quantity;
                    return (
                      <div key={sel.extra_id} className="flex justify-between text-muted-foreground">
                        <span>{extra.name} x {sel.quantity}</span>
                        <span>${subtotal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento ({discountPct}%)</span>
                      <span>-${discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${finalTotal.toLocaleString()}</span></div>
                </div>

                {availabilityStatus.checking && date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando disponibilidad...
                  </div>
                )}

                {availabilityStatus.available === false && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      No disponible en este horario
                    </div>
                    <p className="text-xs text-muted-foreground">{availabilityStatus.reason}</p>
                    <Button variant="outline" size="sm" onClick={handleExploreSimilar} className="w-full gap-2 mt-1">
                      <Search className="h-3 w-3" />
                      Explorar servicios similares
                    </Button>
                  </div>
                )}

                {availabilityStatus.available === true && date && (
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Disponible
                  </p>
                )}

                <Button className="w-full" size="lg" onClick={handleAddToCart} disabled={availabilityStatus.available === false || availabilityStatus.checking}>
                  <ShoppingCart className="h-4 w-4 mr-2" />Agregar al Carrito
                </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

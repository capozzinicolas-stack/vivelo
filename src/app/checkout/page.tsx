'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { StripeProvider } from '@/providers/stripe-provider';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { createOrder, createBooking, createSubBookings, checkVendorAvailability } from '@/lib/supabase/queries';
import { calculateEffectiveTimes, resolveBuffers } from '@/lib/availability';
import { getServiceById } from '@/lib/supabase/queries';
import { COMMISSION_RATE } from '@/lib/constants';
import { categoryMap } from '@/data/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, AlertTriangle, CalendarIcon, Clock, Users, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import type { ServiceCategory } from '@/types/database';

type AvailabilityResult = { itemId: string; available: boolean; reason?: string };

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { items, clearCart, cartTotal } = useCart();

  const [verifying, setVerifying] = useState(true);
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Keep a snapshot of cart items for booking creation after payment
  const cartSnapshotRef = useRef(items);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, user, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!authLoading && items.length === 0 && !orderId) {
      router.push('/carrito');
    }
  }, [authLoading, items, orderId, router]);

  // Keep cart snapshot updated until payment flow starts
  useEffect(() => {
    if (!clientSecret) {
      cartSnapshotRef.current = items;
    }
  }, [items, clientSecret]);

  // Verify availability of all items
  useEffect(() => {
    if (!user || items.length === 0) return;

    async function verifyAll() {
      setVerifying(true);
      const results: AvailabilityResult[] = [];

      for (const item of items) {
        try {
          const service = await getServiceById(item.service_id);
          if (!service) {
            results.push({ itemId: item.id, available: false, reason: 'Servicio no encontrado' });
            continue;
          }

          const buffers = resolveBuffers(service, service.provider ?? undefined);
          const effective = calculateEffectiveTimes({
            eventDate: item.event_date,
            startTime: item.start_time,
            endTime: item.end_time,
            bufferBeforeMinutes: buffers.bufferBeforeMinutes,
            bufferAfterMinutes: buffers.bufferAfterMinutes,
          });

          const result = await checkVendorAvailability(
            item.service_snapshot.provider_id,
            effective.effective_start,
            effective.effective_end
          );

          if (!result.available) {
            results.push({
              itemId: item.id,
              available: false,
              reason: result.has_calendar_block
                ? 'El proveedor tiene un bloqueo en ese horario'
                : `El proveedor ya tiene ${result.overlapping_bookings} reserva(s) en ese horario`,
            });
          } else {
            results.push({ itemId: item.id, available: true });
          }
        } catch {
          results.push({ itemId: item.id, available: true });
        }
      }

      setAvailabilityResults(results);
      setVerifying(false);
    }

    verifyAll();
  }, [user, items]);

  const unavailableItems = availabilityResults.filter(r => !r.available);
  const allAvailable = unavailableItems.length === 0 && !verifying;
  const commission = Math.round(cartTotal * COMMISSION_RATE * 100) / 100;

  const handleCreateOrderAndPay = async () => {
    if (!user || !allAvailable) return;

    setCreatingOrder(true);
    setError('');

    try {
      // 1. Create order (NO bookings yet — those are created after payment)
      const order = await createOrder({
        client_id: user.id,
        subtotal: cartTotal,
        platform_fee: commission,
        total: cartTotal,
      });

      setOrderId(order.id);

      // 2. Create payment intent
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: cartTotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el pago');

      // Check if it's mock mode
      if (data.clientSecret?.includes('_mock')) {
        // In mock mode, create bookings and redirect
        await createBookingsForOrder(order.id, user.id);
        clearCart();
        router.push(`/checkout/confirmacion/${order.id}`);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    } finally {
      setCreatingOrder(false);
    }
  };

  const createBookingsForOrder = async (orderIdParam: string, userId: string) => {
    const cartItems = cartSnapshotRef.current;

    for (const item of cartItems) {
      const service = await getServiceById(item.service_id);
      const buffers = service ? resolveBuffers(service, service.provider ?? undefined) : { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 };
      const effective = calculateEffectiveTimes({
        eventDate: item.event_date,
        startTime: item.start_time,
        endTime: item.end_time,
        bufferBeforeMinutes: buffers.bufferBeforeMinutes,
        bufferAfterMinutes: buffers.bufferAfterMinutes,
      });

      const itemCommission = Math.round(item.total * COMMISSION_RATE * 100) / 100;

      const booking = await createBooking({
        service_id: item.service_id,
        client_id: userId,
        provider_id: item.service_snapshot.provider_id,
        event_date: item.event_date,
        start_time: item.start_time,
        end_time: item.end_time,
        event_hours: item.event_hours,
        guest_count: item.guest_count,
        base_total: item.base_total,
        extras_total: item.extras_total,
        commission: itemCommission,
        total: item.total,
        selected_extras: item.selected_extras.map(ext => ({
          extra_id: ext.extra_id,
          name: ext.name,
          quantity: ext.quantity,
          price: ext.subtotal,
        })),
        notes: item.notes,
        event_name: item.event_name,
        start_datetime: effective.start_datetime,
        end_datetime: effective.end_datetime,
        effective_start: effective.effective_start,
        effective_end: effective.effective_end,
        billing_type_snapshot: item.service_snapshot.price_unit,
        order_id: orderIdParam,
      });

      // Create sub-bookings for extras
      if (item.selected_extras.length > 0 && service) {
        try {
          const extras = service.extras || [];
          const subItems = item.selected_extras.map(sel => {
            const extra = extras.find(e => e.id === sel.extra_id);
            return {
              extra_id: sel.extra_id,
              sku: extra?.sku || undefined,
              name: sel.name,
              quantity: sel.quantity,
              unit_price: sel.unit_price,
              price_type: extra?.price_type || 'fixed',
              subtotal: sel.subtotal,
            };
          });
          await createSubBookings(booking.id, subItems);
        } catch {
          console.error('Failed to create sub-bookings for', booking.id);
        }
      }
    }
  };

  const handlePaymentSuccess = async () => {
    if (!orderId || !user) return;

    try {
      // Create bookings AFTER successful payment
      await createBookingsForOrder(orderId, user.id);
    } catch (err) {
      console.error('Error creating bookings after payment:', err);
      // Payment was successful, so proceed anyway — webhook will handle confirmation
    }

    clearCart();
    router.push(`/checkout/confirmacion/${orderId}`);
  };

  if (authLoading) {
    return <div className="container mx-auto px-4 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6"><Link href="/carrito"><ArrowLeft className="h-4 w-4 mr-2" />Volver al carrito</Link></Button>

      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Order details */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-semibold text-lg">Resumen de tu pedido</h2>

          {verifying && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando disponibilidad de todos los servicios...
            </div>
          )}

          {unavailableItems.length > 0 && (
            <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" />
                Algunos servicios ya no estan disponibles
              </div>
              {unavailableItems.map(r => {
                const item = items.find(i => i.id === r.itemId);
                return (
                  <p key={r.itemId} className="text-sm text-muted-foreground">
                    {item?.service_snapshot.title}: {r.reason}
                  </p>
                );
              })}
              <Button variant="outline" size="sm" asChild><Link href="/carrito">Editar carrito</Link></Button>
            </div>
          )}

          {items.map(item => {
            const cat = categoryMap[item.service_snapshot.category as ServiceCategory];
            const unavailable = availabilityResults.find(r => r.itemId === item.id && !r.available);
            return (
              <Card key={item.id} className={unavailable ? 'opacity-50 border-destructive/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      {item.service_snapshot.image ? (
                        <Image src={item.service_snapshot.image} alt={item.service_snapshot.title} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${cat?.color.split(' ')[0] || 'bg-gray-200'}`}>
                          {cat && <cat.icon className="h-6 w-6 text-muted-foreground/30" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{item.service_snapshot.title}</h3>
                      <p className="text-xs text-muted-foreground">por {item.service_snapshot.provider_name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <Badge variant="outline" className="gap-1 py-0"><CalendarIcon className="h-2.5 w-2.5" />{format(new Date(item.event_date + 'T12:00:00'), 'dd MMM', { locale: es })}</Badge>
                        <Badge variant="outline" className="gap-1 py-0"><Clock className="h-2.5 w-2.5" />{item.start_time}-{item.end_time}</Badge>
                        <Badge variant="outline" className="gap-1 py-0"><Users className="h-2.5 w-2.5" />{item.guest_count}</Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold">${item.total.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right: Payment */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              {!clientSecret ? (
                <>
                  {/* Order summary */}
                  <h2 className="font-semibold text-lg">Total a pagar</h2>
                  <div className="space-y-2 text-sm">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="truncate mr-2">{item.service_snapshot.title}</span>
                        <span className="shrink-0">${item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${cartTotal.toLocaleString()} MXN</span>
                  </div>

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/5 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCreateOrderAndPay}
                    disabled={!allAvailable || creatingOrder}
                  >
                    {creatingOrder ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparando pago...</>
                    ) : (
                      `Pagar $${cartTotal.toLocaleString()} MXN`
                    )}
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Pago seguro procesado por Stripe. No almacenamos datos de tu tarjeta.</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Stripe payment form */}
                  <StripeProvider clientSecret={clientSecret}>
                    <StripePaymentForm
                      amount={cartTotal}
                      orderId={orderId!}
                      onSuccess={handlePaymentSuccess}
                    />
                  </StripeProvider>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { StripeProvider } from '@/providers/stripe-provider';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { createOrder, createBooking, createSubBookings, checkVendorAvailability, getCancellationPolicyById, getActiveCampaignForService, getRelatedServices } from '@/lib/supabase/queries';
import { calculateEffectiveTimes, resolveBuffers } from '@/lib/availability';
import { getServiceById } from '@/lib/supabase/queries';
import { ServiceCard } from '@/components/services/service-card';
import { COMMISSION_RATE } from '@/lib/constants';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { getProviderCommissionRate, calculateCommission } from '@/lib/commission';
import { useCatalog } from '@/providers/catalog-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, AlertTriangle, CalendarIcon, Clock, Users, ShieldCheck, RefreshCcw, Headphones, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import type { Service } from '@/types/database';
type AvailabilityResult = { itemId: string; available: boolean; reason?: string };

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { items, clearCart, cartTotal } = useCart();
  const { categoryMap, getCategoryIcon } = useCatalog();

  const [verifying, setVerifying] = useState(true);
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
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

  // Pre-fill referral code from localStorage
  useEffect(() => {
    const storedRef = localStorage.getItem('vivelo-referral-code');
    if (storedRef) setReferralCode(storedRef);
  }, []);

  // Track begin checkout + load cross-sell
  useEffect(() => {
    if (user && items.length > 0) {
      trackBeginCheckout(items, cartTotal);
      const categories = Array.from(new Set(items.map(i => i.service_snapshot.category)));
      const excludeIds = items.map(i => i.service_id);
      getRelatedServices(categories, excludeIds, 4).then(setRelatedServices).catch(() => {});
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
  // Order-level commission uses default rate for display; actual per-booking rates are calculated at booking creation
  const commission = Math.round(cartTotal * COMMISSION_RATE * 100) / 100;

  const handleCreateOrderAndPay = async () => {
    if (!user || !allAvailable) return;

    setCreatingOrder(true);
    setError('');

    try {
      // Calculate campaign discounts for all items
      let discountTotal = 0;
      for (const item of items) {
        try {
          const campaign = await getActiveCampaignForService(item.service_id);
          if (campaign && campaign.discount_pct > 0) {
            const itemDiscount = Math.round(item.total * (campaign.discount_pct / 100));
            discountTotal += itemDiscount;
          }
        } catch { /* ignore campaign lookup errors */ }
      }

      const finalTotal = cartTotal - discountTotal;

      // 1. Create order (NO bookings yet — those are created after payment)
      const order = await createOrder({
        client_id: user.id,
        subtotal: cartTotal,
        platform_fee: commission,
        total: finalTotal,
        ...(discountTotal > 0 ? { discount_total: discountTotal, original_total: cartTotal } : {}),
      });

      setOrderId(order.id);

      // 2. Create payment intent
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: finalTotal }),
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

      // Get per-provider commission rate (falls back to COMMISSION_RATE)
      const providerRate = await getProviderCommissionRate(item.service_snapshot.provider_id);
      let itemCommission = calculateCommission(item.total, providerRate);

      // Snapshot the cancellation policy at purchase time
      let cancellation_policy_snapshot: Record<string, unknown> | null = null;
      const policyId = service?.cancellation_policy_id;
      if (policyId) {
        try {
          const policy = await getCancellationPolicyById(policyId);
          if (policy) {
            cancellation_policy_snapshot = {
              id: policy.id,
              name: policy.name,
              rules: policy.rules,
            };
          }
        } catch {
          // Non-blocking: proceed without snapshot
        }
      }

      // Check for active campaign discount
      let campaignId: string | undefined;
      let discountAmount = 0;
      let discountPct = 0;
      let bookingTotal = item.total;
      try {
        const campaign = await getActiveCampaignForService(item.service_id);
        if (campaign && campaign.discount_pct > 0) {
          campaignId = campaign.id;
          discountPct = campaign.discount_pct;
          discountAmount = Math.round(item.total * (discountPct / 100));
          bookingTotal = item.total - discountAmount;

          // Adjust commission with campaign's commission_reduction_pct
          if (campaign.commission_reduction_pct > 0) {
            const adjustedRate = Math.max(0, providerRate - (campaign.commission_reduction_pct / 100));
            itemCommission = calculateCommission(bookingTotal, adjustedRate);
          }
        }
      } catch { /* ignore campaign lookup errors */ }

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
        commission_rate_snapshot: providerRate,
        total: bookingTotal,
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
        cancellation_policy_snapshot,
        ...(campaignId ? { campaign_id: campaignId, discount_amount: discountAmount, discount_pct: discountPct } : {}),
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

    trackPurchase(orderId, cartSnapshotRef.current, cartTotal);
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
            const cat = categoryMap[item.service_snapshot.category];
            const unavailable = availabilityResults.find(r => r.itemId === item.id && !r.available);
            const CatIcon = cat ? getCategoryIcon(cat.slug) : null;
            return (
              <Card key={item.id} className={unavailable ? 'opacity-50 border-destructive/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      {item.service_snapshot.image ? (
                        <Image src={item.service_snapshot.image} alt={item.service_snapshot.title} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${cat?.color.split(' ')[0] || 'bg-gray-200'}`}>
                          {CatIcon && <CatIcon className="h-6 w-6 text-muted-foreground/30" />}
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

          {/* Referral code */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium">Codigo de referido</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: VIVELO-ABC123"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cross-sell */}
          {relatedServices.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Tambien te puede interesar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedServices.slice(0, 4).map(s => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}
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

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" />
                      <span>Pago 100% seguro</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RefreshCcw className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                      <span>Cancelacion flexible</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Headphones className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                      <span>Soporte 24/7</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="text-[10px] font-bold text-slate-600">stripe</span>
                      <span>Procesado por Stripe</span>
                    </div>
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

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, CreatePaymentIntentSchema } from '@/lib/validations/api-schemas';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const validation = await validateBody(request, CreatePaymentIntentSchema);
    if (validation.error !== null) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { bookingId, orderId, amount, metadata } = validation.data!

    // Verify the order/booking belongs to this user
    const { supabase } = auth;
    if (orderId) {
      const { data: order } = await supabase.from('orders').select('client_id, discount_total').eq('id', orderId).single();
      if (!order || order.client_id !== auth.user.id) {
        return NextResponse.json({ error: 'Orden no encontrada o no autorizada' }, { status: 403 });
      }

      // Validate campaign discounts server-side.
      // For each booking with a campaign_id snapshotted:
      //   - Fetch the actual campaign by id (not by service lookup, to cover provider promos)
      //   - Verify status='active', dates in range, usage_limit not exceeded
      //   - Verify the service is still subscribed to the campaign
      //   - For provider promos, verify coupon_code matches the snapshot
      if (order.discount_total && order.discount_total > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('service_id, campaign_id, coupon_code')
          .eq('order_id', orderId)
          .not('campaign_id', 'is', null);

        if (bookings && bookings.length > 0) {
          const now = new Date().toISOString();
          for (const b of bookings) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('*')
              .eq('id', b.campaign_id)
              .maybeSingle();

            if (!campaign) {
              return NextResponse.json({ error: 'Una campana de descuento ya no existe. Vuelve a crear la orden.' }, { status: 400 });
            }
            if (campaign.status !== 'active' || campaign.start_date > now || campaign.end_date < now) {
              return NextResponse.json({ error: 'Una campana de descuento ya no es valida. Vuelve a crear la orden.' }, { status: 400 });
            }
            if (campaign.usage_limit != null && (campaign.used_count ?? 0) >= campaign.usage_limit) {
              return NextResponse.json({ error: 'Un cupon ya alcanzo su limite de usos. Vuelve a crear la orden.' }, { status: 400 });
            }

            // Verify subscription still active for this service
            const { data: sub } = await supabase
              .from('campaign_subscriptions')
              .select('id')
              .eq('campaign_id', campaign.id)
              .eq('service_id', b.service_id)
              .eq('status', 'active')
              .maybeSingle();
            if (!sub) {
              return NextResponse.json({ error: 'Un descuento ya no aplica a uno de tus servicios. Vuelve a crear la orden.' }, { status: 400 });
            }

            // Provider promos: verify coupon code matches
            if (campaign.source === 'provider') {
              if (!b.coupon_code || !campaign.coupon_code || b.coupon_code.toUpperCase() !== campaign.coupon_code.toUpperCase()) {
                return NextResponse.json({ error: 'El cupon ya no es valido. Vuelve a crear la orden.' }, { status: 400 });
              }
            }
          }
        }
      }
    } else if (bookingId) {
      const { data: booking } = await supabase.from('bookings').select('client_id').eq('id', bookingId).single();
      if (!booking || booking.client_id !== auth.user.id) {
        return NextResponse.json({ error: 'Reserva no encontrada o no autorizada' }, { status: 403 });
      }
    }

    const amountInCents = Math.round(amount * 100);
    const refId = orderId || bookingId || 'unknown';

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const isMock = !secretKey || secretKey === 'sk_test_placeholder';

    if (isMock) {
      console.log('[Stripe] Mock mode — no secret key or placeholder');
      const fakeId = `pi_mock_${Date.now()}_${refId.slice(0, 8)}`;
      return NextResponse.json({ clientSecret: `${fakeId}_secret_mock`, paymentIntentId: fakeId });
    }

    console.log(`[Stripe] Creating PaymentIntent: amount=${amountInCents} currency=mxn ref=${refId} keyPrefix=${secretKey.substring(0, 12)}...`);

    const stripe = new Stripe(secretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn',
      metadata: {
        ...(orderId ? { orderId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...metadata,
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log(`[Stripe] PaymentIntent created: ${paymentIntent.id}`);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    const stripeError = error as { type?: string; code?: string; statusCode?: number };
    console.error('[Stripe] Error creando PaymentIntent:', {
      message,
      type: stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

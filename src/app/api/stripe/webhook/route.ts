import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

// Create a Supabase admin client that bypasses RLS (for webhook use only)
function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const isMock = !secretKey || secretKey === 'sk_test_placeholder';

    if (isMock || !webhookSecret) {
      console.log('[Stripe Webhook Mock] Evento recibido');
      return NextResponse.json({ received: true, mock: true });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'Falta firma' }, { status: 400 });

    const stripe = new Stripe(secretKey);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Firma invalida:', err);
      return NextResponse.json({ error: 'Firma invalida' }, { status: 400 });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        const bookingId = pi.metadata?.bookingId;
        console.log(`[Stripe] Pago exitoso: ${pi.id}, Order: ${orderId}, Booking: ${bookingId}`);

        const supabase = createAdminSupabase();

        if (orderId) {
          // New order-based flow: update order + all its bookings
          await supabase
            .from('orders')
            .update({ status: 'paid', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('id', orderId);

          // Confirm all bookings in this order
          const { data: orderBookings } = await supabase
            .from('bookings')
            .update({ status: 'confirmed', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('order_id', orderId)
            .select('id, service:services(title), provider_id');

          // Push each confirmed booking to Google Calendar (non-blocking)
          if (orderBookings && orderBookings.length > 0) {
            try {
              const { pushBookingToGoogle } = await import('@/lib/google-calendar/sync');
              for (const booking of orderBookings) {
                const { data: fullBooking } = await supabase
                  .from('bookings')
                  .select('*, service:services(title)')
                  .eq('id', booking.id)
                  .single();
                if (fullBooking) {
                  pushBookingToGoogle(fullBooking).catch(err =>
                    console.error(`[Stripe Webhook] Google Calendar push failed for booking ${booking.id}:`, err)
                  );
                }
              }
            } catch (err) {
              console.error('[Stripe Webhook] Google Calendar integration error:', err);
            }
          }
        } else if (bookingId) {
          // Legacy single-booking flow (backwards compatible)
          await supabase
            .from('bookings')
            .update({ status: 'confirmed', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('id', bookingId);

          try {
            const { pushBookingToGoogle } = await import('@/lib/google-calendar/sync');
            const { data: fullBooking } = await supabase
              .from('bookings')
              .select('*, service:services(title)')
              .eq('id', bookingId)
              .single();
            if (fullBooking) {
              pushBookingToGoogle(fullBooking).catch(err =>
                console.error('[Stripe Webhook] Google Calendar push failed:', err)
              );
            }
          } catch (err) {
            console.error('[Stripe Webhook] Google Calendar integration error:', err);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.error(`[Stripe] Pago fallido: ${pi.id}, Error: ${pi.last_payment_error?.message}`);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
        console.log(`[Stripe] Reembolso confirmado: ${charge.id}, PI: ${piId}, Amount refunded: ${charge.amount_refunded}`);

        // Booking should already be marked as cancelled by /api/bookings/cancel
        // This is just a confirmation log. Optionally verify:
        if (piId) {
          const supabase = createAdminSupabase();
          const { data: booking } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('stripe_payment_intent_id', piId)
            .single();

          if (booking && booking.status !== 'cancelled') {
            console.warn(`[Stripe] Booking ${booking.id} has refund but status is '${booking.status}', expected 'cancelled'`);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}

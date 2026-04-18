import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { PROVIDER_ACCEPTANCE_HOURS } from '@/lib/constants';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const isMock = process.env.NODE_ENV === 'development' && (!secretKey || secretKey === 'sk_test_placeholder');

    if (isMock || !webhookSecret) {
      console.log('[Stripe Webhook Mock] Evento recibido');
      return NextResponse.json({ received: true, mock: true });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'Falta firma' }, { status: 400 });

    const stripe = new Stripe(secretKey!);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Firma invalida:', err);
      return NextResponse.json({ error: 'Firma invalida' }, { status: 400 });
    }

    // Idempotency check: skip already-processed events
    const supabaseAdmin = createAdminSupabaseClient();
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('id')
      .eq('id', event.id)
      .single();

    if (existingEvent) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      // ─── AUTH: Card authorized, PI awaiting capture ─────────────────
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        console.log(`[Stripe] Pago autorizado (capturable): ${pi.id}, Order: ${orderId}`);

        if (!orderId) {
          console.warn(`[Stripe] amount_capturable_updated without orderId, skipping`);
          break;
        }

        // Update order to 'authorized'
        const { data: updatedOrders } = await supabaseAdmin
          .from('orders')
          .update({ status: 'authorized', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('status', 'pending')
          .select('id, total, client_id');

        if (!updatedOrders || updatedOrders.length === 0) {
          console.log(`[Stripe] Order ${orderId} already past pending, skipping auth update`);
          break;
        }

        // Set acceptance deadline + stripe PI on all pending bookings
        const deadline = new Date(Date.now() + PROVIDER_ACCEPTANCE_HOURS * 60 * 60 * 1000).toISOString();
        const { data: orderBookings } = await supabaseAdmin
          .from('bookings')
          .update({
            stripe_payment_intent_id: pi.id,
            provider_acceptance_deadline: deadline,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId)
          .eq('status', 'pending')
          .select('id, client_id, provider_id, service_id, event_date, start_time, total, service:services(title)');

        console.log(`[Stripe] Set deadline on ${orderBookings?.length || 0} bookings for order ${orderId}`);

        // WhatsApp: notify client of authorization + each provider of new booking
        if (orderBookings && orderBookings.length > 0) {
          try {
            const { waClientPaymentAuthorized, waProviderNewBooking } = await import('@/lib/whatsapp');
            const clientId = updatedOrders[0].client_id;

            const { data: clientProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name, phone')
              .eq('id', clientId)
              .single();

            if (clientProfile?.phone) {
              waClientPaymentAuthorized({
                clientId,
                clientPhone: clientProfile.phone,
                clientName: clientProfile.full_name || 'Cliente',
                orderId,
                total: updatedOrders[0].total,
              });
            }

            for (const booking of orderBookings) {
              const providerId = (booking as Record<string, unknown>).provider_id as string;
              const serviceId = (booking as Record<string, unknown>).service_id as string;
              const serviceData = booking.service as unknown as { title: string } | null;
              const serviceTitle = serviceData?.title || 'Servicio';
              const eventDate = (booking as Record<string, unknown>).event_date as string || '';

              const { data: providerProfile } = await supabaseAdmin
                .from('profiles')
                .select('full_name, phone')
                .eq('id', providerId)
                .single();

              if (providerProfile?.phone) {
                waProviderNewBooking({
                  providerId,
                  providerPhone: providerProfile.phone,
                  providerName: providerProfile.full_name || 'Proveedor',
                  serviceTitle,
                  serviceId,
                  clientName: clientProfile?.full_name || 'Cliente',
                  eventDate,
                  bookingId: booking.id,
                });
              }
            }
          } catch (err) {
            console.error('[Stripe Webhook] WhatsApp notification error:', err);
          }
        }
        break;
      }

      // ─── CAPTURED: PI was captured (by provider accept) ─────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        const bookingId = pi.metadata?.bookingId;
        console.log(`[Stripe] Pago capturado: ${pi.id}, Order: ${orderId}, Booking: ${bookingId}`);

        if (orderId) {
          // Update order to 'paid' — bookings already confirmed by accept endpoint
          await supabaseAdmin
            .from('orders')
            .update({ status: 'paid', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .in('status', ['pending', 'authorized']);

          console.log(`[Stripe] Order ${orderId} → paid`);

          // Provider Referrals V2: activate pending_signup referrals (non-blocking)
          try {
            const { data: confirmedBookings } = await supabaseAdmin
              .from('bookings')
              .select('id, provider_id')
              .eq('order_id', orderId)
              .eq('status', 'confirmed');

            if (confirmedBookings && confirmedBookings.length > 0) {
              const providerFirstBooking = new Map<string, { id: string }>();
              for (const b of confirmedBookings) {
                const pid = (b as { provider_id?: string | null }).provider_id;
                if (pid && !providerFirstBooking.has(pid)) {
                  providerFirstBooking.set(pid, { id: b.id });
                }
              }
              const providerIds = Array.from(providerFirstBooking.keys());

              if (providerIds.length > 0) {
                const { data: pendingRewards } = await supabaseAdmin
                  .from('referral_rewards')
                  .select('id, referrer_id, referred_id')
                  .in('referred_id', providerIds)
                  .eq('status', 'pending_signup');

                if (pendingRewards && pendingRewards.length > 0) {
                  const { computeExpectedBenefits, diffBenefitsToInsert, initialBenefitStatus } = await import('@/lib/referrals');
                  const referrersToRecompute = new Set<string>();

                  for (const reward of pendingRewards) {
                    const first = providerFirstBooking.get(reward.referred_id);
                    if (!first) continue;

                    const { error: activateErr } = await supabaseAdmin
                      .from('referral_rewards')
                      .update({
                        status: 'active_sale',
                        activated_at: new Date().toISOString(),
                        first_booking_id: first.id,
                      })
                      .eq('id', reward.id)
                      .eq('status', 'pending_signup');

                    if (activateErr) {
                      console.error(`[Stripe Webhook] Failed to activate referral ${reward.id}:`, activateErr);
                      continue;
                    }
                    referrersToRecompute.add(reward.referrer_id);
                  }

                  for (const referrerId of Array.from(referrersToRecompute)) {
                    try {
                      const { count: activeCount } = await supabaseAdmin
                        .from('referral_rewards')
                        .select('id', { count: 'exact', head: true })
                        .eq('referrer_id', referrerId)
                        .eq('status', 'active_sale');

                      const { data: profileRow } = await supabaseAdmin
                        .from('profiles')
                        .select('early_adopter_ends_at')
                        .eq('id', referrerId)
                        .single();

                      const { data: existingBenefits } = await supabaseAdmin
                        .from('provider_referral_benefits')
                        .select('benefit_type, triggered_by_referral_count')
                        .eq('provider_id', referrerId);

                      const expected = computeExpectedBenefits(activeCount || 0);
                      const toInsert = diffBenefitsToInsert(expected, existingBenefits || []);

                      if (toInsert.length > 0) {
                        const status = initialBenefitStatus(
                          (profileRow as { early_adopter_ends_at?: string | null } | null)?.early_adopter_ends_at || null
                        );
                        const rows = toInsert.map(b => ({
                          provider_id: referrerId,
                          benefit_type: b.benefit_type,
                          tier_level: b.tier_level,
                          triggered_by_referral_count: b.triggered_by_referral_count,
                          total_sales_granted: b.total_sales_granted,
                          sales_consumed: 0,
                          status,
                          activated_at: status === 'active' ? new Date().toISOString() : null,
                        }));
                        const { error: insertErr } = await supabaseAdmin
                          .from('provider_referral_benefits')
                          .insert(rows);
                        if (insertErr) {
                          console.error(`[Stripe Webhook] Failed to insert benefits for ${referrerId}:`, insertErr);
                        } else {
                          console.log(`[Stripe Webhook] Generated ${rows.length} benefits for referrer ${referrerId}`);
                        }
                      }
                    } catch (err) {
                      console.error(`[Stripe Webhook] Benefit recompute failed for ${referrerId}:`, err);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('[Stripe Webhook] Provider referrals activation error:', err);
          }
        } else if (bookingId) {
          // Legacy single-booking flow (backwards compatible, idempotent)
          const { data: updatedLegacy } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .eq('status', 'pending')
            .select('id');

          if (!updatedLegacy || updatedLegacy.length === 0) {
            console.log(`[Stripe] Booking ${bookingId} already processed, skipping`);
            break;
          }

          try {
            const { pushBookingToGoogle } = await import('@/lib/google-calendar/sync');
            const { data: fullBooking } = await supabaseAdmin
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

      // ─── PI CANCELED: defensive cleanup ─────────────────────────────
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        console.log(`[Stripe] PaymentIntent cancelado: ${pi.id}, Order: ${orderId}`);

        if (orderId) {
          // Mark pending bookings as rejected
          const { data: rejectedBookings } = await supabaseAdmin
            .from('bookings')
            .update({
              status: 'rejected',
              provider_rejected_at: new Date().toISOString(),
              provider_rejection_reason: 'Pago cancelado por Stripe',
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', orderId)
            .eq('status', 'pending')
            .select('id');

          console.log(`[Stripe] Rejected ${rejectedBookings?.length || 0} pending bookings for cancelled PI`);

          // Mark order as cancelled
          await supabaseAdmin
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .in('status', ['pending', 'authorized']);
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

        if (piId) {
          const { data: booking } = await supabaseAdmin
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

    // Record processed event for idempotency
    try {
      await supabaseAdmin
        .from('stripe_webhook_events')
        .insert({
          id: event.id,
          event_type: event.type,
          processed_at: new Date().toISOString(),
        });
    } catch (recordErr) {
      console.error('[Stripe Webhook] Failed to record event:', recordErr);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}

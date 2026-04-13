import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

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
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        const bookingId = pi.metadata?.bookingId;
        console.log(`[Stripe] Pago exitoso: ${pi.id}, Order: ${orderId}, Booking: ${bookingId}`);

        if (orderId) {
          // New order-based flow: update order + all its bookings (idempotent)
          const { data: updatedOrders } = await supabaseAdmin
            .from('orders')
            .update({ status: 'paid', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('status', 'pending')
            .select('id');

          if (!updatedOrders || updatedOrders.length === 0) {
            console.log(`[Stripe] Order ${orderId} already processed, skipping`);
            break;
          }

          // Confirm all bookings in this order
          const { data: orderBookings } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('order_id', orderId)
            .eq('status', 'pending')
            .select('*, service:services(title)');

          // Increment used_count atomically for each unique campaign used in this order.
          // Idempotent via stripe_webhook_events table check above — if this webhook runs
          // twice for the same event, the outer idempotency guard short-circuits.
          if (orderBookings && orderBookings.length > 0) {
            const campaignIds = orderBookings
              .map(b => (b as { campaign_id?: string | null }).campaign_id)
              .filter((id): id is string => !!id);
            const uniqueCampaignIds = Array.from(new Set(campaignIds));
            for (const campaignId of uniqueCampaignIds) {
              try {
                const { error: rpcErr } = await supabaseAdmin.rpc('increment_campaign_usage', {
                  p_campaign_id: campaignId,
                });
                if (rpcErr) {
                  console.error(`[Stripe Webhook] increment_campaign_usage failed for ${campaignId}:`, rpcErr);
                }
              } catch (err) {
                console.error(`[Stripe Webhook] increment_campaign_usage exception for ${campaignId}:`, err);
              }
            }
          }

          // Send WhatsApp booking confirmations (non-blocking)
          if (orderBookings && orderBookings.length > 0) {
            try {
              const { waClientBookingConfirmed, waProviderNewBooking } = await import('@/lib/whatsapp');
              for (const booking of orderBookings) {
                const clientId = (booking as Record<string, unknown>).client_id as string;
                const providerId = (booking as Record<string, unknown>).provider_id as string;
                const serviceId = (booking as Record<string, unknown>).service_id as string;
                const serviceData = booking.service as { title: string } | null;
                const serviceTitle = serviceData?.title || 'Servicio';
                const eventDate = (booking as Record<string, unknown>).event_date as string || '';
                const startTime = (booking as Record<string, unknown>).start_time as string || '';

                const { data: clientProfile } = await supabaseAdmin
                  .from('profiles')
                  .select('full_name, phone')
                  .eq('id', clientId)
                  .single();

                if (clientProfile?.phone) {
                  waClientBookingConfirmed({
                    bookingId: booking.id,
                    serviceId,
                    serviceTitle,
                    clientId,
                    clientPhone: clientProfile.phone,
                    clientName: clientProfile.full_name || 'Cliente',
                    eventDate,
                    startTime,
                    total: (booking as Record<string, unknown>).total as number || 0,
                  });
                }

                // Notify provider of new booking
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

          // Push each confirmed booking to Google Calendar (non-blocking)
          if (orderBookings && orderBookings.length > 0) {
            try {
              const { pushBookingToGoogle } = await import('@/lib/google-calendar/sync');
              await Promise.allSettled(
                orderBookings.map(booking =>
                  pushBookingToGoogle(booking).catch(err =>
                    console.error(`[Stripe Webhook] Google Calendar push failed for booking ${booking.id}:`, err)
                  )
                )
              );
            } catch (err) {
              console.error('[Stripe Webhook] Google Calendar integration error:', err);
            }
          }

          // Provider Referrals V2: activate pending_signup referrals when
          // a provider completes their first confirmed sale. Non-blocking.
          // Idempotent via stripe_webhook_events guard above + unique index on benefits.
          if (orderBookings && orderBookings.length > 0) {
            try {
              const providerFirstBooking = new Map<string, { id: string }>();
              for (const b of orderBookings) {
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

                  // Recompute benefits for each affected referrer (insert delta only)
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
            } catch (err) {
              console.error('[Stripe Webhook] Provider referrals activation error:', err);
            }
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

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  console.log(`[ExpirePendingBookings] Running at ${now}`);

  // Find bookings with expired acceptance deadline
  const { data: expiredBookings, error } = await supabase
    .from('bookings')
    .select('id, order_id, provider_id, client_id, service_id, campaign_id, total, service:services(title)')
    .eq('status', 'pending')
    .not('provider_acceptance_deadline', 'is', null)
    .lt('provider_acceptance_deadline', now);

  if (error) {
    console.error('[ExpirePendingBookings] Error fetching:', error);
    return NextResponse.json({ error: 'Error fetching expired bookings' }, { status: 500 });
  }

  if (!expiredBookings || expiredBookings.length === 0) {
    console.log('[ExpirePendingBookings] No expired bookings found');
    return NextResponse.json({ processed: 0 });
  }

  console.log(`[ExpirePendingBookings] Found ${expiredBookings.length} expired bookings`);

  let processed = 0;
  const reason = 'Tiempo de aceptacion vencido (48h)';

  for (const booking of expiredBookings) {
    // Reject the booking
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'rejected',
        provider_rejected_at: now,
        provider_rejection_reason: reason,
        updated_at: now,
      })
      .eq('id', booking.id)
      .eq('status', 'pending');

    if (updateErr) {
      console.error(`[ExpirePendingBookings] Failed to reject booking ${booking.id}:`, updateErr);
      continue;
    }

    // Decrement campaign usage
    if (booking.campaign_id) {
      try {
        await supabase.rpc('decrement_campaign_usage', { p_campaign_id: booking.campaign_id });
      } catch (err) {
        console.error(`[ExpirePendingBookings] decrement_campaign_usage failed for ${booking.campaign_id}:`, err);
      }
    }

    // Check order: if all bookings are now rejected/cancelled → cancel PI
    if (booking.order_id) {
      try {
        const { data: siblings } = await supabase
          .from('bookings')
          .select('id, status, total')
          .eq('order_id', booking.order_id);

        const allRejectedOrCancelled = siblings?.every(b =>
          b.status === 'rejected' || b.status === 'cancelled'
        ) ?? false;

        const allSettled = siblings?.every(b =>
          b.status === 'confirmed' || b.status === 'rejected' || b.status === 'cancelled'
        ) ?? false;

        if (allRejectedOrCancelled || allSettled) {
          const { data: order } = await supabase
            .from('orders')
            .select('stripe_payment_intent_id')
            .eq('id', booking.order_id)
            .single();

          const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
          const isMock = !secretKey || secretKey === 'sk_test_placeholder';

          if (order?.stripe_payment_intent_id && !isMock) {
            const stripe = new Stripe(secretKey!);

            if (allRejectedOrCancelled) {
              try {
                await stripe.paymentIntents.cancel(order.stripe_payment_intent_id);
                console.log(`[ExpirePendingBookings] Cancelled PI ${order.stripe_payment_intent_id}`);
              } catch (stripeErr) {
                console.error(`[ExpirePendingBookings] Stripe cancel failed:`, stripeErr);
              }

              await supabase
                .from('orders')
                .update({ status: 'cancelled', updated_at: now })
                .eq('id', booking.order_id);

            } else if (allSettled) {
              // Partial capture for confirmed bookings
              const confirmedTotal = siblings
                ?.filter(b => b.status === 'confirmed')
                .reduce((sum, b) => sum + (b.total || 0), 0) ?? 0;

              if (confirmedTotal > 0) {
                try {
                  await stripe.paymentIntents.capture(order.stripe_payment_intent_id, {
                    amount_to_capture: Math.round(confirmedTotal * 100),
                  });
                  console.log(`[ExpirePendingBookings] Partial capture of ${confirmedTotal} MXN`);
                } catch (stripeErr) {
                  console.error(`[ExpirePendingBookings] Stripe partial capture failed:`, stripeErr);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`[ExpirePendingBookings] Order check failed for ${booking.order_id}:`, err);
      }
    }

    // WhatsApp notifications (non-blocking)
    try {
      const { waProviderBookingRejected, waClientBookingRejected } = await import('@/lib/whatsapp');
      const serviceData = booking.service as unknown as { title: string } | null;
      const serviceTitle = serviceData?.title || 'Servicio';

      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', booking.client_id)
        .single();

      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', booking.provider_id)
        .single();

      if (providerProfile?.phone) {
        waProviderBookingRejected({
          providerId: booking.provider_id,
          providerPhone: providerProfile.phone,
          providerName: providerProfile.full_name || 'Proveedor',
          serviceTitle,
          serviceId: booking.service_id,
          clientName: clientProfile?.full_name || 'Cliente',
          bookingId: booking.id,
        });
      }

      if (clientProfile?.phone) {
        waClientBookingRejected({
          clientId: booking.client_id,
          clientPhone: clientProfile.phone,
          clientName: clientProfile.full_name || 'Cliente',
          serviceTitle,
          serviceId: booking.service_id,
          bookingId: booking.id,
        });
      }
    } catch (err) {
      console.error(`[ExpirePendingBookings] WhatsApp failed for booking ${booking.id}:`, err);
    }

    processed++;
  }

  console.log(`[ExpirePendingBookings] Processed ${processed} bookings`);
  return NextResponse.json({ processed });
}

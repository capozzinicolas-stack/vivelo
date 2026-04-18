import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const auth = await requireRole(['provider']);
    if (isAuthError(auth)) return auth;

    const { bookingId } = await params;
    const supabase = createAdminSupabaseClient();

    // 1. Fetch booking with order
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*, order:orders(id, stripe_payment_intent_id, status), service:services(title)')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // 2. Verify ownership
    if (booking.provider_id !== auth.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Verify status and deadline
    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se pueden aceptar reservas pendientes' }, { status: 400 });
    }

    if (booking.provider_acceptance_deadline) {
      const deadline = new Date(booking.provider_acceptance_deadline);
      if (deadline < new Date()) {
        return NextResponse.json({ error: 'El plazo para aceptar esta reserva ya vencio' }, { status: 400 });
      }
    }

    // 4. Confirm booking
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        provider_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'pending');

    if (updateErr) {
      console.error('[Provider Accept] DB update failed:', updateErr);
      return NextResponse.json({ error: 'Error actualizando la reserva' }, { status: 500 });
    }

    // 5. Check if ALL bookings in the order are now confirmed
    const order = booking.order as { id: string; stripe_payment_intent_id: string | null; status: string } | null;
    let captured = false;

    if (order?.id) {
      const { data: siblings } = await supabase
        .from('bookings')
        .select('id, status, total')
        .eq('order_id', order.id);

      const allConfirmed = siblings?.every(b => b.id === bookingId ? true : b.status === 'confirmed') ?? false;
      const allSettled = siblings?.every(b => {
        if (b.id === bookingId) return true; // this one is now confirmed
        return b.status === 'confirmed' || b.status === 'rejected' || b.status === 'cancelled';
      }) ?? false;

      if (allConfirmed && order.stripe_payment_intent_id) {
        // All accepted → full capture
        const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
        const isMock = !secretKey || secretKey === 'sk_test_placeholder';

        if (!isMock) {
          try {
            const stripe = new Stripe(secretKey!);
            await stripe.paymentIntents.capture(order.stripe_payment_intent_id);
            captured = true;
            console.log(`[Provider Accept] Full capture of PI ${order.stripe_payment_intent_id}`);
          } catch (stripeErr) {
            console.error('[Provider Accept] Stripe capture failed:', stripeErr);
            // Don't fail the accept — booking is confirmed, capture can be retried
          }
        } else {
          captured = true;
          console.log('[Provider Accept] Mock mode — skipping Stripe capture');
        }
      } else if (allSettled && !allConfirmed && order.stripe_payment_intent_id) {
        // Mix of confirmed and rejected — partial capture for confirmed amount
        const confirmedTotal = siblings
          ?.filter(b => b.id === bookingId ? true : b.status === 'confirmed')
          .reduce((sum, b) => sum + (b.total || 0), 0) ?? 0;

        if (confirmedTotal > 0) {
          const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
          const isMock = !secretKey || secretKey === 'sk_test_placeholder';

          if (!isMock) {
            try {
              const stripe = new Stripe(secretKey!);
              await stripe.paymentIntents.capture(order.stripe_payment_intent_id, {
                amount_to_capture: Math.round(confirmedTotal * 100),
              });
              captured = true;
              console.log(`[Provider Accept] Partial capture of ${confirmedTotal} MXN for PI ${order.stripe_payment_intent_id}`);
            } catch (stripeErr) {
              console.error('[Provider Accept] Stripe partial capture failed:', stripeErr);
            }
          } else {
            captured = true;
          }
        }
      }
    }

    // 6. Increment campaign usage if booking has campaign_id
    const campaignId = (booking as { campaign_id?: string | null }).campaign_id;
    if (campaignId) {
      try {
        await supabase.rpc('increment_campaign_usage', { p_campaign_id: campaignId });
      } catch (err) {
        console.error(`[Provider Accept] increment_campaign_usage failed for ${campaignId}:`, err);
      }
    }

    // 7. WhatsApp notifications (non-blocking)
    try {
      const { waProviderBookingAccepted, waClientBookingConfirmed } = await import('@/lib/whatsapp');
      const serviceData = booking.service as { title: string } | null;
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
        waProviderBookingAccepted({
          providerId: booking.provider_id,
          providerPhone: providerProfile.phone,
          providerName: providerProfile.full_name || 'Proveedor',
          serviceTitle,
          serviceId: booking.service_id,
          clientName: clientProfile?.full_name || 'Cliente',
          eventDate: booking.event_date,
          bookingId,
        });
      }

      if (clientProfile?.phone) {
        waClientBookingConfirmed({
          clientId: booking.client_id,
          clientPhone: clientProfile.phone,
          clientName: clientProfile.full_name || 'Cliente',
          serviceTitle,
          serviceId: booking.service_id,
          eventDate: booking.event_date,
          startTime: booking.start_time || '',
          total: booking.total,
          bookingId,
        });
      }
    } catch (err) {
      console.error('[Provider Accept] WhatsApp notification error:', err);
    }

    return NextResponse.json({
      success: true,
      captured,
      bookingId,
    });
  } catch (error) {
    console.error('[Provider Accept] Error:', error);
    return NextResponse.json({ error: 'Error procesando la aceptacion' }, { status: 500 });
  }
}

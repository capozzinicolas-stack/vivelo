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
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim()
      : null;

    if (!reason) {
      return NextResponse.json({ error: 'Se requiere un motivo de rechazo' }, { status: 400 });
    }

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

    // 3. Verify status
    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se pueden rechazar reservas pendientes' }, { status: 400 });
    }

    // 4. Reject booking
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'rejected',
        provider_rejected_at: new Date().toISOString(),
        provider_rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'pending');

    if (updateErr) {
      console.error('[Provider Reject] DB update failed:', updateErr);
      return NextResponse.json({ error: 'Error actualizando la reserva' }, { status: 500 });
    }

    // 5. Decrement campaign usage if booking has campaign_id
    const campaignId = (booking as { campaign_id?: string | null }).campaign_id;
    if (campaignId) {
      try {
        await supabase.rpc('decrement_campaign_usage', { p_campaign_id: campaignId });
      } catch (err) {
        console.error(`[Provider Reject] decrement_campaign_usage failed for ${campaignId}:`, err);
      }
    }

    // 6. Check other bookings in the order to decide PI action
    const order = booking.order as { id: string; stripe_payment_intent_id: string | null; status: string } | null;

    if (order?.id) {
      const { data: siblings } = await supabase
        .from('bookings')
        .select('id, status, total')
        .eq('order_id', order.id);

      // This booking is now 'rejected' (update above), but siblings still shows old status
      // So we treat current bookingId as 'rejected' manually
      const allRejectedOrCancelled = siblings?.every(b => {
        if (b.id === bookingId) return true; // this one is now rejected
        return b.status === 'rejected' || b.status === 'cancelled';
      }) ?? false;

      const allSettled = siblings?.every(b => {
        if (b.id === bookingId) return true;
        return b.status === 'confirmed' || b.status === 'rejected' || b.status === 'cancelled';
      }) ?? false;

      const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
      const isMock = !secretKey || secretKey === 'sk_test_placeholder';

      if (allRejectedOrCancelled && order.stripe_payment_intent_id) {
        // All rejected/cancelled → cancel PI entirely
        if (!isMock) {
          try {
            const stripe = new Stripe(secretKey!);
            await stripe.paymentIntents.cancel(order.stripe_payment_intent_id);
            console.log(`[Provider Reject] Cancelled PI ${order.stripe_payment_intent_id}`);
          } catch (stripeErr) {
            console.error('[Provider Reject] Stripe cancel failed:', stripeErr);
          }
        }

        // Update order to cancelled
        await supabase
          .from('orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', order.id);

      } else if (allSettled && !allRejectedOrCancelled && order.stripe_payment_intent_id) {
        // Mix: some confirmed, this one rejected — partial capture
        const confirmedTotal = siblings
          ?.filter(b => b.id !== bookingId && b.status === 'confirmed')
          .reduce((sum, b) => sum + (b.total || 0), 0) ?? 0;

        if (confirmedTotal > 0 && !isMock) {
          try {
            const stripe = new Stripe(secretKey!);
            await stripe.paymentIntents.capture(order.stripe_payment_intent_id, {
              amount_to_capture: Math.round(confirmedTotal * 100),
            });
            console.log(`[Provider Reject] Partial capture of ${confirmedTotal} MXN for PI ${order.stripe_payment_intent_id}`);
          } catch (stripeErr) {
            console.error('[Provider Reject] Stripe partial capture failed:', stripeErr);
          }
        }
      }
      // else: other bookings still pending — wait for them
    }

    // 7. WhatsApp notifications (non-blocking)
    try {
      const { waProviderBookingRejected, waClientBookingRejected } = await import('@/lib/whatsapp');
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
        waProviderBookingRejected({
          providerId: booking.provider_id,
          providerPhone: providerProfile.phone,
          providerName: providerProfile.full_name || 'Proveedor',
          serviceTitle,
          serviceId: booking.service_id,
          clientName: clientProfile?.full_name || 'Cliente',
          bookingId,
        });
      }

      if (clientProfile?.phone) {
        waClientBookingRejected({
          clientId: booking.client_id,
          clientPhone: clientProfile.phone,
          clientName: clientProfile.full_name || 'Cliente',
          serviceTitle,
          serviceId: booking.service_id,
          bookingId,
        });
      }
    } catch (err) {
      console.error('[Provider Reject] WhatsApp notification error:', err);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      reason,
    });
  } catch (error) {
    console.error('[Provider Reject] Error:', error);
    return NextResponse.json({ error: 'Error procesando el rechazo' }, { status: 500 });
  }
}

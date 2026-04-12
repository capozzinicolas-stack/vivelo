import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';

/**
 * C2 FIX — Confirms bookings after client-side creation.
 *
 * Covers the race condition where the Stripe webhook fires before
 * createBookingsForOrder() finishes. The webhook marks the order as
 * 'paid' but finds no bookings to confirm. This endpoint is called
 * by the client AFTER booking creation — if the order is already
 * 'paid', it confirms the bookings that the webhook missed.
 *
 * If the order is still 'pending' (webhook hasn't arrived yet),
 * this is a no-op — the webhook will confirm them when it arrives.
 *
 * Idempotent: only updates bookings with status='pending'.
 */

const ConfirmBookingsSchema = z.object({
  orderId: z.string().uuid('orderId invalido'),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const body = await request.json().catch(() => null);
    const parsed = ConfirmBookingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Body invalido' },
        { status: 400 }
      );
    }
    const { orderId } = parsed.data;

    const supabaseAdmin = createAdminSupabaseClient();

    // 1. Fetch order and verify ownership
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, status, stripe_payment_intent_id')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.client_id !== auth.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 2. Only confirm if the order is already 'paid' (webhook already ran)
    if (order.status !== 'paid') {
      // Webhook hasn't arrived yet — it will handle confirmation when it does
      console.log(
        `[Confirm Bookings] Order ${orderId} status is '${order.status}', not 'paid' — skipping (webhook will handle)`
      );
      return NextResponse.json({ confirmed: 0, skipped: true });
    }

    // 3. Confirm all pending bookings for this order
    const { data: confirmedBookings } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .select('id, campaign_id');

    const confirmedCount = confirmedBookings?.length ?? 0;

    // 4. Increment campaign usage for any campaigns used (same logic as webhook)
    if (confirmedBookings && confirmedBookings.length > 0) {
      const campaignIds = confirmedBookings
        .map(b => b.campaign_id)
        .filter((id): id is string => !!id);
      const uniqueCampaignIds = Array.from(new Set(campaignIds));

      for (const campaignId of uniqueCampaignIds) {
        try {
          await supabaseAdmin.rpc('increment_campaign_usage', {
            p_campaign_id: campaignId,
          });
        } catch (err) {
          console.error(`[Confirm Bookings] increment_campaign_usage failed for ${campaignId}:`, err);
        }
      }
    }

    console.log(
      `[Confirm Bookings] Order ${orderId}: confirmed ${confirmedCount} bookings`
    );

    return NextResponse.json({
      confirmed: confirmedCount,
      skipped: false,
    });
  } catch (error) {
    console.error('[Confirm Bookings] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Error confirmando reservas' },
      { status: 500 }
    );
  }
}

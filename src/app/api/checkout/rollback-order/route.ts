import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';

/**
 * C1 FIX — Compensating rollback for failed createBookingsForOrder.
 *
 * Used by the checkout page when booking creation fails mid-loop after
 * a successful Stripe charge. Refunds the PaymentIntent in full and
 * cancels any partial bookings that were already persisted, leaving
 * the order in a consistent 'cancelled' state.
 *
 * Idempotent: a second call with the same orderId returns 409 without
 * re-refunding. The cleanup only touches bookings/orders not already
 * in 'cancelled' status.
 *
 * NO changes to commission.ts, snapshots, webhook, or payment flow.
 * Reuses the same cancellation pattern as /api/bookings/cancel.
 */

const RollbackOrderSchema = z.object({
  orderId: z.string().uuid('orderId inválido'),
  paymentIntentId: z.string().optional().nullable(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const body = await request.json().catch(() => null);
    const parsed = RollbackOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Body inválido' },
        { status: 400 }
      );
    }
    const { orderId, paymentIntentId: bodyPI, reason } = parsed.data;

    const supabaseAdmin = createAdminSupabaseClient();

    // 1. Fetch order and verify ownership
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, status, stripe_payment_intent_id, total')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.client_id !== auth.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 2. Idempotency check: if already rolled back, return 409
    if (order.status === 'cancelled' || order.status === 'refunded') {
      console.log(`[Checkout Rollback] Order ${orderId} already in ${order.status}, skipping`);
      return NextResponse.json(
        { error: 'La orden ya fue cancelada', already_rolled_back: true },
        { status: 409 }
      );
    }

    console.log(
      `[Checkout Rollback] Starting rollback for order ${orderId}, reason: ${reason || 'unspecified'}, user: ${auth.user.id}`
    );

    // 3. Resolve PaymentIntent id
    // Priority: order.stripe_payment_intent_id (set by webhook) > body.paymentIntentId (client-provided)
    const stripePI = order.stripe_payment_intent_id || bodyPI || null;

    // 4. Refund via Stripe (skip in mock mode)
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const isMock =
      process.env.NODE_ENV === 'development' &&
      (!secretKey || secretKey === 'sk_test_placeholder');

    let stripeRefundId: string | null = null;
    let refundedAmount: number | null = null;

    if (stripePI && !isMock) {
      try {
        const stripe = new Stripe(secretKey!);
        // Full refund — no amount parameter refunds the entire charge
        const refund = await stripe.refunds.create({
          payment_intent: stripePI,
          reason: 'requested_by_customer',
          metadata: {
            orderId,
            rollbackReason: reason || 'booking_creation_failed',
            rolledBackBy: auth.user.id,
          },
        });
        stripeRefundId = refund.id;
        refundedAmount = refund.amount / 100; // centavos -> MXN
        console.log(
          `[Checkout Rollback] Stripe refund created: ${refund.id}, amount: ${refundedAmount} MXN, PI: ${stripePI}`
        );
      } catch (stripeErr) {
        console.error(
          `[Checkout Rollback] Stripe refund FAILED for PI ${stripePI}, order ${orderId}:`,
          stripeErr
        );
        // Do not proceed with DB cleanup if refund failed — leaves order in inconsistent state
        // but prevents marking as cancelled when money is still captured.
        return NextResponse.json(
          {
            error:
              'Error procesando el reembolso en Stripe. Contacta a soporte con el código de orden.',
            orderId,
            paymentIntentId: stripePI,
          },
          { status: 502 }
        );
      }
    } else if (isMock) {
      console.log(`[Checkout Rollback Mock] Simulated refund for order ${orderId}`);
    } else if (!stripePI) {
      console.warn(
        `[Checkout Rollback] No PaymentIntent found for order ${orderId} — proceeding with DB cleanup only`
      );
    }

    // 5. Cancel any partial bookings for this order
    // Uses the same cancellation pattern as /api/bookings/cancel:
    // refund_amount=total, refund_percent=100, commission=0.
    // Filter by .neq('status','cancelled') for idempotency.
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, total')
      .eq('order_id', orderId)
      .neq('status', 'cancelled');

    let bookingsCancelled = 0;
    if (existingBookings && existingBookings.length > 0) {
      for (const b of existingBookings) {
        const { error: updateErr } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: auth.user.id,
            refund_amount: b.total,
            refund_percent: 100,
            commission: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', b.id)
          .neq('status', 'cancelled');

        if (updateErr) {
          console.error(
            `[Checkout Rollback] Failed to cancel booking ${b.id}:`,
            updateErr
          );
        } else {
          bookingsCancelled++;
        }
      }
      console.log(
        `[Checkout Rollback] Cancelled ${bookingsCancelled}/${existingBookings.length} partial bookings for order ${orderId}`
      );
    }

    // 6. Mark order as cancelled
    const { error: orderUpdateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .in('status', ['pending', 'paid', 'partially_fulfilled', 'fulfilled']);

    if (orderUpdateErr) {
      console.error(
        `[Checkout Rollback] Failed to mark order ${orderId} as cancelled:`,
        orderUpdateErr
      );
      return NextResponse.json(
        { error: 'Error actualizando estado de la orden' },
        { status: 500 }
      );
    }

    console.log(
      `[Checkout Rollback] SUCCESS — Order ${orderId} rolled back. Refund: ${stripeRefundId || 'none'}, Bookings cancelled: ${bookingsCancelled}`
    );

    return NextResponse.json({
      success: true,
      orderId,
      stripe_refund_id: stripeRefundId,
      refunded_amount: refundedAmount,
      bookings_cancelled: bookingsCancelled,
    });
  } catch (error) {
    console.error('[Checkout Rollback] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Error procesando el rollback' },
      { status: 500 }
    );
  }
}

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
      const { data: order } = await supabase.from('orders').select('client_id').eq('id', orderId).single();
      if (!order || order.client_id !== auth.user.id) {
        return NextResponse.json({ error: 'Orden no encontrada o no autorizada' }, { status: 403 });
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

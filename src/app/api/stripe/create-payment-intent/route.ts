import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      bookingId?: string;
      orderId?: string;
      amount: number;
      metadata?: Record<string, string>;
    };

    const { bookingId, orderId, amount, metadata } = body;

    if (!amount || (!bookingId && !orderId)) {
      return NextResponse.json({ error: 'Se requieren amount y (bookingId o orderId).' }, { status: 400 });
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

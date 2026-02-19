import { NextRequest, NextResponse } from 'next/server';
import { stripe, isMockStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, metadata } = await request.json() as { bookingId: string; amount: number; metadata?: Record<string, string> };

    if (!bookingId || !amount) {
      return NextResponse.json({ error: 'Se requieren bookingId y amount.' }, { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);

    if (isMockStripe || !stripe) {
      const fakeId = `pi_mock_${Date.now()}_${bookingId.slice(0, 8)}`;
      return NextResponse.json({ clientSecret: `${fakeId}_secret_mock`, paymentIntentId: fakeId });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn',
      metadata: { bookingId, ...metadata },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('[Stripe] Error creando PaymentIntent:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud de pago.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe, isMockStripe } from '@/lib/stripe';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    if (isMockStripe || !stripe || !webhookSecret) {
      console.log('[Stripe Webhook Mock] Evento recibido');
      return NextResponse.json({ received: true, mock: true });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'Falta firma' }, { status: 400 });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Firma invalida:', err);
      return NextResponse.json({ error: 'Firma invalida' }, { status: 400 });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe] Pago exitoso: ${pi.id}, Booking: ${pi.metadata?.bookingId}`);
        // TODO: Update booking status to 'confirmed'
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.error(`[Stripe] Pago fallido: ${pi.id}, Error: ${pi.last_payment_error?.message}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}

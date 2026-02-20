import Stripe from 'stripe';
import { COMMISSION_RATE } from '@/lib/constants';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey && stripeSecretKey !== 'sk_test_placeholder'
  ? new Stripe(stripeSecretKey, { typescript: true })
  : null;

export const isMockStripe = !stripe;

export function calculateOrderAmount(baseTotal: number, extrasTotal: number) {
  // Client pays: base + extras (commission is NOT added to client total)
  // Commission is deducted from provider's share
  const total = Math.round((baseTotal + extrasTotal) * 100) / 100;
  const commission = Math.round(total * COMMISSION_RATE * 100) / 100;
  return { subtotal: total, commission, total };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

import Stripe from 'stripe';
import { COMMISSION_RATE } from '@/lib/constants';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey && stripeSecretKey !== 'sk_test_placeholder'
  ? new Stripe(stripeSecretKey, { typescript: true })
  : null;

export const isMockStripe = !stripe;

export function calculateOrderAmount(baseTotal: number, extrasTotal: number) {
  const subtotal = baseTotal + extrasTotal;
  const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
  const total = Math.round((subtotal + commission) * 100) / 100;
  return { subtotal, commission, total };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

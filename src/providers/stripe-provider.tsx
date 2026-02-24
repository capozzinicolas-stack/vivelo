'use client';

import { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = stripePublishableKey && stripePublishableKey !== 'pk_test_placeholder'
  ? loadStripe(stripePublishableKey)
  : null;

interface StripeProviderProps {
  clientSecret: string;
  children: ReactNode;
}

export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
  if (!stripePromise) {
    // Mock mode — render children without Stripe
    return <>{children}</>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#7c3aed',
            borderRadius: '8px',
          },
        },
        locale: 'es',
      }}
    >
      {children}
    </Elements>
  );
}

export { stripePromise };

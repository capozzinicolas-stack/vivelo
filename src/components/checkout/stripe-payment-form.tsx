'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

interface StripePaymentFormProps {
  amount: number;
  orderId: string;
  onSuccess: () => void;
}

export function StripePaymentForm({ amount, orderId, onSuccess }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setStatus('processing');
    setErrorMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/confirmacion/${orderId}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Error al procesar el pago.');
      setStatus('error');
    } else {
      setStatus('success');
      onSuccess();
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold">Pago exitoso!</h3>
        <p className="text-muted-foreground">Redirigiendo a tu confirmacion...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        Informacion de Pago
      </h3>

      <PaymentElement />

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={!stripe || status === 'processing'}>
        {status === 'processing' ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
        ) : (
          `Pagar $${amount.toLocaleString()} MXN`
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Tu pago es procesado de forma segura por Stripe. No almacenamos datos de tu tarjeta.
      </p>
    </form>
  );
}

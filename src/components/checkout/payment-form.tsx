'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, CreditCard } from 'lucide-react';

interface PaymentFormProps {
  bookingId: string;
  amount: number;
}

export function PaymentForm({ bookingId, amount }: PaymentFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handlePay = async () => {
    setStatus('processing');
    setError('');
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Mock: simulate success
      setStatus('success');
      setTimeout(() => router.push('/dashboard/cliente/reservas'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar pago');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold">Pago exitoso!</h3>
        <p className="text-muted-foreground">Redirigiendo a tus reservas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" />Informacion de Pago</h3>
      <p className="text-sm text-muted-foreground">Modo demo: el pago se simulara automaticamente.</p>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div><Label>Numero de tarjeta</Label><Input placeholder="4242 4242 4242 4242" disabled={status === 'processing'} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vencimiento</Label><Input placeholder="12/28" disabled={status === 'processing'} /></div>
            <div><Label>CVC</Label><Input placeholder="123" disabled={status === 'processing'} /></div>
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" size="lg" onClick={handlePay} disabled={status === 'processing'}>
        {status === 'processing' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</> : `Pagar $${amount.toLocaleString()}`}
      </Button>
    </div>
  );
}

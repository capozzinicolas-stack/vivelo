'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getBookingById } from '@/lib/supabase/queries';
import { BookingSummary } from '@/components/checkout/booking-summary';
import { PaymentForm } from '@/components/checkout/payment-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Booking } from '@/types/database';

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBookingById(bookingId).then(setBooking).finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="container mx-auto px-4 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Reserva no encontrada</h1>
        <Button asChild><Link href="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Volver al dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" asChild className="mb-6"><Link href="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link></Button>
      <h1 className="text-2xl font-bold mb-8">Confirmar y Pagar</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card><CardContent className="p-6"><BookingSummary booking={booking} /></CardContent></Card>
        <Card><CardContent className="p-6"><PaymentForm bookingId={booking.id} amount={booking.total} /></CardContent></Card>
      </div>
    </div>
  );
}

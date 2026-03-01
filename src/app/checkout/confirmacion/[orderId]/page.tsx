'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrderById } from '@/lib/supabase/queries';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PromoBanner } from '@/components/marketing/promo-banner';
import { CheckCircle, Loader2, Calendar, ArrowRight } from 'lucide-react';
import type { Order } from '@/types/database';

export default function ConfirmacionPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { clearCart, itemCount } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Clear cart on mount (in case it wasn't cleared)
  useEffect(() => {
    if (itemCount > 0) clearCart();
  }, [itemCount, clearCart]);

  useEffect(() => {
    getOrderById(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="text-center space-y-4 mb-8">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold">Pago confirmado!</h1>
        <p className="text-muted-foreground">
          Tu pedido ha sido procesado exitosamente. Los proveedores seran notificados.
        </p>
      </div>

      {order && (
        <Card className="mb-8">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Detalles del pedido</h2>
              <Badge className="bg-green-100 text-green-800">{order.status === 'paid' ? 'Pagado' : order.status}</Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              Orden #{order.id.slice(0, 8).toUpperCase()}
            </div>

            {order.bookings && order.bookings.length > 0 && (
              <div className="space-y-3">
                {order.bookings.map(booking => (
                  <div key={booking.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{booking.service?.title || 'Servicio'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(booking.event_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">${booking.total.toLocaleString()}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{booking.status === 'confirmed' ? 'Confirmado' : booking.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total pagado</span>
              <span>${order.total.toLocaleString()} MXN</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!order && (
        <Card className="mb-8">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>Tu pago fue procesado correctamente.</p>
            <p className="text-sm mt-1">Los detalles de tu orden estaran disponibles en tu dashboard.</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <PromoBanner bannerKey="post_purchase_banner" variant="card" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg">
          <Link href="/dashboard/cliente/reservas">
            Ver mis reservas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link href="/servicios">Seguir comprando</Link>
        </Button>
      </div>
    </div>
  );
}

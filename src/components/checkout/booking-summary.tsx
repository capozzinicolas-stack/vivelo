import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { COMMISSION_RATE } from '@/lib/constants';
import type { Booking } from '@/types/database';

export function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{booking.service?.title || 'Servicio'}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span>{new Date(booking.event_date).toLocaleDateString('es-MX')}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Invitados</span><span>{booking.guest_count}</span></div>
      </div>
      <Separator />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Base</span><span>${booking.base_total.toLocaleString()}</span></div>
        {booking.extras_total > 0 && <div className="flex justify-between"><span>Extras</span><span>${booking.extras_total.toLocaleString()}</span></div>}
        {booking.selected_extras.map((ex) => (
          <div key={ex.extra_id} className="flex justify-between text-muted-foreground pl-4"><span>{ex.name} x{ex.quantity}</span><span>${ex.price.toLocaleString()}</span></div>
        ))}
        <div className="flex justify-between text-muted-foreground"><span>Comision ({(COMMISSION_RATE * 100).toFixed(0)}%)</span><span>${booking.commission.toLocaleString()}</span></div>
        <Separator />
        <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${booking.total.toLocaleString()}</span></div>
      </div>
      <Badge className="bg-yellow-100 text-yellow-800">{booking.status === 'pending' ? 'Pendiente de pago' : booking.status}</Badge>
    </div>
  );
}

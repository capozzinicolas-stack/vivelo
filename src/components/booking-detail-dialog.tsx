'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { updateBookingStatus } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Clock, MapPin, Users, Mail, PartyPopper, Loader2 } from 'lucide-react';
import type { Booking, BookingStatus } from '@/types/database';

interface BookingDetailDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'provider' | 'client';
  onStatusChange?: (id: string, status: BookingStatus) => void;
}

export function BookingDetailDialog({ booking, open, onOpenChange, role, onStatusChange }: BookingDetailDialogProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!booking) return null;

  const service = booking.service;
  const contact = role === 'provider' ? booking.client : booking.provider;
  const extras = booking.sub_bookings?.length
    ? booking.sub_bookings
    : booking.selected_extras?.map(se => ({
        name: se.name,
        quantity: se.quantity,
        unit_price: se.price / (se.quantity || 1),
        subtotal: se.price,
      })) || [];

  const handleAction = async (newStatus: BookingStatus) => {
    setActionLoading(newStatus);
    try {
      await updateBookingStatus(booking.id, newStatus);
      const label = BOOKING_STATUS_LABELS[newStatus];
      toast({ title: `Reserva ${label}`, description: `La reserva ha sido actualizada a "${label}".` });
      onStatusChange?.(booking.id, newStatus);
      onOpenChange(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la reserva.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={BOOKING_STATUS_COLORS[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
          </div>
          <DialogTitle className="text-xl">
            {service ? (
              <Link href={`/servicios/${service.id}`} className="hover:text-primary hover:underline">
                {service.title}
              </Link>
            ) : 'Reserva'}
          </DialogTitle>
          <DialogDescription>Detalle de la reservacion</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event name */}
          {booking.event_name && (
            <div className="flex items-center gap-2 text-sm">
              <PartyPopper className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Evento:</span>
              <span>{booking.event_name}</span>
            </div>
          )}

          {/* Date, time, duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(booking.event_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{booking.start_time} - {booking.end_time}</span>
              <span className="text-muted-foreground">({booking.event_hours}h)</span>
            </div>
            {service?.zones && service.zones.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{service.zones.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Guests */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{booking.guest_count} invitados</span>
          </div>

          <Separator />

          {/* Contact info */}
          {contact && (
            <div>
              <p className="text-sm font-medium mb-2">
                {role === 'provider' ? 'Informacion del cliente' : 'Proveedor'}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{role === 'provider' ? contact.full_name : (contact.company_name || contact.full_name)}</p>
                  {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
                </div>
                {contact.email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="h-3 w-3 mr-1" />Enviar mensaje
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Extras breakdown */}
          {extras.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Extras solicitados</p>
              <div className="space-y-1">
                {extras.map((ex, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{ex.name} x {ex.quantity}</span>
                    <span>${ex.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price breakdown */}
          <div>
            <p className="text-sm font-medium mb-2">Desglose de precio</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio base</span>
                <span>${booking.base_total.toLocaleString()}</span>
              </div>
              {booking.extras_total > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extras</span>
                  <span>${booking.extras_total.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${booking.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Notas</p>
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </div>
            </>
          )}

          {/* Action buttons (provider only) */}
          {role === 'provider' && (
            <>
              <Separator />
              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAction('confirmed')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'confirmed' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Aceptar Reservacion
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleAction('rejected')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Rechazar
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleAction('cancelled')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'cancelled' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Cancelar Reservacion
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

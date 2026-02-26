'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { updateBookingStatus } from '@/lib/supabase/queries';
import { calculateRefund } from '@/lib/cancellation';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Clock, MapPin, Users, Mail, PartyPopper, Loader2 } from 'lucide-react';
import type { Booking, BookingStatus, CancellationPolicy, CancellationRule } from '@/types/database';

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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundPreview, setRefundPreview] = useState<{ refund_percent: number; refund_amount: number } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [policyName, setPolicyName] = useState<string | null>(null);

  // Recalculate refund preview when cancel dialog opens
  useEffect(() => {
    if (!cancelDialogOpen || !booking) {
      setRefundPreview(null);
      setPolicyName(null);
      return;
    }

    const policy = resolvePolicy(booking);
    if (policy) {
      const eventDate = booking.start_datetime || `${booking.event_date}T${booking.start_time || '00:00'}:00`;
      const result = calculateRefund(policy, eventDate, booking.total);
      setRefundPreview(result);
      setPolicyName((policy as CancellationPolicy).name || null);
    } else {
      setRefundPreview({ refund_percent: 0, refund_amount: 0 });
      setPolicyName(null);
    }
  }, [cancelDialogOpen, booking]);

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

  const handleCancelWithRefund = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, cancelledBy: role }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cancelar');
      }

      const hasRefund = data.refund_amount > 0;
      toast({
        title: 'Reserva cancelada',
        description: hasRefund
          ? `Se proceso un reembolso de $${data.refund_amount.toLocaleString()} MXN (${data.refund_percent}%).`
          : 'La reserva ha sido cancelada sin reembolso.',
      });

      onStatusChange?.(booking.id, 'cancelled');
      setCancelDialogOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo cancelar la reserva.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = booking.status === 'confirmed' || booking.status === 'pending';

  return (
    <>
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

            {/* Refund info (if already cancelled) */}
            {booking.status === 'cancelled' && (booking.refund_amount ?? 0) > 0 && (
              <>
                <Separator />
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Reembolso procesado</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto reembolsado ({booking.refund_percent}%)</span>
                    <span className="font-medium">${(booking.refund_amount ?? 0).toLocaleString()} MXN</span>
                  </div>
                </div>
              </>
            )}

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

            {/* Action buttons */}
            {canCancel && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {role === 'provider' && booking.status === 'pending' && (
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
                  {(booking.status === 'confirmed' || (booking.status === 'pending' && role === 'client')) && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setCancelDialogOpen(true)}
                      disabled={!!actionLoading}
                    >
                      Cancelar Reservacion
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation confirmation dialog with refund preview */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancelar reservacion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Vamos a ayudarte a resolverlo. Antes de cancelar, revisa los detalles:</p>

                {refundPreview && (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    {policyName && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{policyName}</Badge>
                        <span className="text-xs text-muted-foreground">Politica de cancelacion</span>
                      </div>
                    )}

                    {refundPreview.refund_amount > 0 ? (
                      <p className="text-sm text-foreground">
                        Al cancelar ahora, recibiras un reembolso del <span className="font-semibold">{refundPreview.refund_percent}%</span> de tu pago.
                      </p>
                    ) : (
                      <p className="text-sm text-foreground">
                        Dado el tiempo restante antes del evento, esta cancelacion no incluye reembolso.
                      </p>
                    )}

                    <div className="border-t pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total pagado</span>
                        <span>${booking.total.toLocaleString()} MXN</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Tu reembolso</span>
                        <span className={refundPreview.refund_amount > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                          ${refundPreview.refund_amount.toLocaleString()} MXN
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Esta accion no se puede deshacer. El reembolso se procesara automaticamente a tu metodo de pago original.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Mejor no</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelWithRefund();
              }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Si, cancelar reservacion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Resolve the cancellation policy for a booking:
 * 1. From the stored snapshot
 * 2. From the service's linked policy
 * 3. Fallback: null
 */
function resolvePolicy(booking: Booking): CancellationPolicy | { rules: CancellationRule[] } | null {
  // Try snapshot first
  const snapshot = booking.cancellation_policy_snapshot;
  if (snapshot && Array.isArray((snapshot as { rules?: unknown }).rules)) {
    return snapshot as unknown as CancellationPolicy;
  }

  // Try service cancellation policy
  const service = booking.service;
  if (service?.cancellation_policy) {
    return service.cancellation_policy;
  }

  return null;
}

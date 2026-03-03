'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { useCart, type CartItem } from '@/providers/cart-provider';
import { getBookingsByClient } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookingDetailDialog } from '@/components/booking-detail-dialog';
import { CreateReviewDialog } from '@/components/dashboard/create-review-dialog';
import { Loader2, FolderOpen, ShoppingCart, Star, CalendarIcon, Users, Clock } from 'lucide-react';
import type { Booking } from '@/types/database';

function getEffectiveTotal(b: Booking): number {
  return b.status === 'cancelled' && b.refund_amount ? b.total - b.refund_amount : b.total;
}

type EventGroup = {
  eventName: string;
  bookings: Booking[];
  cartItems: CartItem[];
  totalBookings: number;
  totalCart: number;
  grandTotal: number;
  serviceCount: number;
};

export default function ClienteEventosPage() {
  const { user } = useAuthContext();
  const { items: cartItems } = useCart();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    getBookingsByClient(user.id).then(setBookings).finally(() => setLoading(false));
  }, [user]);

  const eventGroups: EventGroup[] = useMemo(() => {
    const groups: Record<string, { bookings: Booking[]; cartItems: CartItem[] }> = {};

    bookings.forEach(b => {
      const key = b.event_name || 'Sin evento asignado';
      if (!groups[key]) groups[key] = { bookings: [], cartItems: [] };
      groups[key].bookings.push(b);
    });

    cartItems.forEach(item => {
      const key = item.event_name || 'Sin evento asignado';
      if (!groups[key]) groups[key] = { bookings: [], cartItems: [] };
      groups[key].cartItems.push(item);
    });

    return Object.entries(groups).map(([eventName, { bookings: evtBookings, cartItems: evtCartItems }]) => {
      const totalBookings = evtBookings.reduce((sum, b) => sum + getEffectiveTotal(b), 0);
      const totalCart = evtCartItems.reduce((sum, item) => sum + item.total, 0);
      return {
        eventName,
        bookings: evtBookings,
        cartItems: evtCartItems,
        totalBookings,
        totalCart,
        grandTotal: totalBookings + totalCart,
        serviceCount: evtBookings.length + evtCartItems.length,
      };
    }).sort((a, b) => b.grandTotal - a.grandTotal);
  }, [bookings, cartItems]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Eventos</h1>
        <p className="text-sm text-muted-foreground">
          {eventGroups.length} evento{eventGroups.length !== 1 ? 's' : ''}
        </p>
      </div>

      {eventGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No tienes eventos aun. Al contratar servicios, asigna un nombre de evento para verlos agrupados aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {eventGroups.map(group => (
            <Card key={group.eventName}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      {group.eventName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.serviceCount} servicio{group.serviceCount !== 1 ? 's' : ''}
                      {group.cartItems.length > 0 && (
                        <span className="ml-1 text-amber-600">({group.cartItems.length} en carrito)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Gasto total</p>
                    <p className="text-2xl font-bold text-primary">${group.grandTotal.toLocaleString()}</p>
                    {group.totalCart > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Contratado: ${group.totalBookings.toLocaleString()} · En carrito: ${group.totalCart.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {group.cartItems.map(item => (
                    <div
                      key={`cart-${item.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ShoppingCart className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.service_snapshot.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{new Date(item.event_date).toLocaleDateString('es-MX')}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{item.start_time} - {item.end_time}</span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{item.guest_count}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">En carrito</Badge>
                        <span className="font-medium">${item.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}

                  {group.bookings.map(b => {
                    const effectiveTotal = getEffectiveTotal(b);
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{b.service?.title || 'Servicio'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{new Date(b.event_date).toLocaleDateString('es-MX')}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{b.start_time} - {b.end_time}</span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{b.guest_count}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                          <span className="font-medium">
                            ${effectiveTotal.toLocaleString()}
                            {b.status === 'cancelled' && b.refund_amount ? (
                              <span className="text-xs text-muted-foreground line-through ml-1">${b.total.toLocaleString()}</span>
                            ) : null}
                          </span>
                          {b.status === 'completed' && !reviewedBookingIds.has(b.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setReviewBooking(b); setReviewDialogOpen(true); }}
                            >
                              <Star className="h-3 w-3 mr-1" />Review
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role="client"
        onStatusChange={(id, newStatus) => {
          setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
        }}
      />

      {reviewBooking && (
        <CreateReviewDialog
          bookingId={reviewBooking.id}
          serviceTitle={reviewBooking.service?.title || 'Servicio'}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onReviewCreated={() => {
            setReviewedBookingIds(prev => { const next = new Set(Array.from(prev)); next.add(reviewBooking.id); return next; });
          }}
        />
      )}
    </div>
  );
}

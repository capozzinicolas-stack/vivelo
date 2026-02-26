'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { useCart, type CartItem } from '@/providers/cart-provider';
import { getBookingsByClient } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookingDetailDialog } from '@/components/booking-detail-dialog';
import { Loader2, List, FolderOpen, ShoppingCart } from 'lucide-react';
import type { Booking, BookingStatus } from '@/types/database';

const statusTabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas', cancelled: 'Canceladas' };

export default function ClienteReservasPage() {
  const { user } = useAuthContext();
  const { items: cartItems } = useCart();
  const [tab, setTab] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'event'>('list');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBookingsByClient(user.id).then(setBookings).finally(() => setLoading(false));
  }, [user]);

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  // Cart items filtered the same way (cart items always show on "all" and "pending" tabs)
  const filteredCartItems = (tab === 'all' || tab === 'pending') ? cartItems : [];

  // Group by event name (bookings + cart items)
  const groupedByEvent = useMemo(() => {
    const groups: Record<string, { bookings: Booking[]; cartItems: CartItem[] }> = {};
    filtered.forEach(b => {
      const key = b.event_name || 'Sin evento';
      if (!groups[key]) groups[key] = { bookings: [], cartItems: [] };
      groups[key].bookings.push(b);
    });
    filteredCartItems.forEach(item => {
      const key = item.event_name || 'Sin evento';
      if (!groups[key]) groups[key] = { bookings: [], cartItems: [] };
      groups[key].cartItems.push(item);
    });
    return groups;
  }, [filtered, filteredCartItems]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Reservas</h1>
        <div className="flex gap-1">
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4 mr-1" />Lista
          </Button>
          <Button variant={viewMode === 'event' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('event')}>
            <FolderOpen className="h-4 w-4 mr-1" />Por Evento
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {statusTabs.map((s) => <TabsTrigger key={s} value={s}>{tabLabels[s]}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {viewMode === 'list' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Invitados</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && filteredCartItems.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay reservas</TableCell></TableRow>
                  ) : (
                    <>
                      {filteredCartItems.map((item) => (
                        <TableRow key={`cart-${item.id}`} className="bg-amber-50/50">
                          <TableCell className="font-medium flex items-center gap-2">
                            <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />
                            {item.service_snapshot.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.event_name || '—'}</TableCell>
                          <TableCell>{new Date(item.event_date).toLocaleDateString('es-MX')}</TableCell>
                          <TableCell>{item.guest_count}</TableCell>
                          <TableCell><Badge className="bg-amber-100 text-amber-800 border-amber-300">En carrito</Badge></TableCell>
                          <TableCell className="text-right font-medium">${item.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {filtered.map((b) => (
                        <TableRow
                          key={b.id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}
                        >
                          <TableCell className="font-medium">{b.service?.title || 'Servicio'}</TableCell>
                          <TableCell className="text-muted-foreground">{b.event_name || '—'}</TableCell>
                          <TableCell>{new Date(b.event_date).toLocaleDateString('es-MX')}</TableCell>
                          <TableCell>{b.guest_count}</TableCell>
                          <TableCell><Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge></TableCell>
                          <TableCell className="text-right font-medium">${b.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedByEvent).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay reservas</p>
              ) : Object.entries(groupedByEvent).map(([eventName, { bookings: eventBookings, cartItems: eventCartItems }]) => {
                const totalItems = eventBookings.length + eventCartItems.length;
                return (
                  <Card key={eventName}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{eventName}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {totalItems} servicio{totalItems !== 1 ? 's' : ''}
                          {eventCartItems.length > 0 && (
                            <span className="ml-1 text-amber-600">({eventCartItems.length} en carrito)</span>
                          )}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {eventCartItems.map(item => (
                          <div
                            key={`cart-${item.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50"
                          >
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <div>
                                <p className="font-medium text-sm">{item.service_snapshot.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.event_date).toLocaleDateString('es-MX')} · {item.guest_count} invitados
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300">En carrito</Badge>
                              <span className="font-medium text-sm">${item.total.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                        {eventBookings.map(b => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}
                          >
                            <div>
                              <p className="font-medium text-sm">{b.service?.title || 'Servicio'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(b.event_date).toLocaleDateString('es-MX')} · {b.guest_count} invitados
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                              <span className="font-medium text-sm">${b.total.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role="client"
        onStatusChange={(id, newStatus) => {
          setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
        }}
      />
    </div>
  );
}

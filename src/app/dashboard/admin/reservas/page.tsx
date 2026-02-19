'use client';

import { useState, useEffect } from 'react';
import { getAllBookings, updateBookingStatus } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ban, CheckCircle } from 'lucide-react';
import type { Booking, BookingStatus } from '@/types/database';

const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas', cancelled: 'Canceladas' };

export default function AdminReservasPage() {
  const [tab, setTab] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    getAllBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);

  const totalFiltered = filtered.reduce((s, b) => s + b.total, 0);
  const totalCommissions = filtered.reduce((s, b) => s + b.commission, 0);

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast({ title: `Reserva ${BOOKING_STATUS_LABELS[status]}` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion de Reservas</h1>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">{filtered.length} reservas · Total: <span className="font-medium text-foreground">${totalFiltered.toLocaleString()}</span></p>
          <p className="text-muted-foreground">Comisiones: <span className="font-medium text-foreground">${totalCommissions.toLocaleString()}</span></p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{tabs.map(s => <TabsTrigger key={s} value={s}>{tabLabels[s]}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Invitados</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Comision</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No hay reservas</TableCell></TableRow>
                ) : filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.service?.title || 'Servicio'}</TableCell>
                    <TableCell>{b.client?.full_name || 'Cliente'}</TableCell>
                    <TableCell>{b.provider?.full_name || 'Proveedor'}</TableCell>
                    <TableCell>{new Date(b.event_date).toLocaleDateString('es-MX')}</TableCell>
                    <TableCell>{b.guest_count}</TableCell>
                    <TableCell className="font-medium">${b.total.toLocaleString()}</TableCell>
                    <TableCell>${b.commission.toLocaleString()}</TableCell>
                    <TableCell><Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {b.status !== 'completed' && b.status !== 'cancelled' && (
                          <>
                            {b.status !== 'confirmed' && (
                              <Button size="sm" variant="outline" className="h-7 text-green-600" onClick={() => handleStatusChange(b.id, 'confirmed')}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => handleStatusChange(b.id, 'cancelled')}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

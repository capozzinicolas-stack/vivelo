'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { getBookingsByProvider, updateBookingStatus } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2 } from 'lucide-react';
import type { Booking } from '@/types/database';

const tabs = ['all', 'pending', 'confirmed', 'completed'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas' };

export default function ProveedorReservasPage() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    getBookingsByProvider(user.id).then(setBookings).finally(() => setLoading(false));
  }, [user]);

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  const handleAction = async (action: 'confirmed' | 'rejected', id: string) => {
    try {
      await updateBookingStatus(id, action);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: action } : b));
      const label = action === 'confirmed' ? 'Confirmada' : 'Rechazada';
      toast({ title: `Reserva ${label}`, description: `La reserva ha sido ${label.toLowerCase()}.` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la reserva.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion de Reservas</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{tabs.map((s) => <TabsTrigger key={s} value={s}>{tabLabels[s]}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Invitados</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay reservas</TableCell></TableRow>
                ) : filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.service?.title || 'Servicio'}</TableCell>
                    <TableCell>{b.client?.full_name || 'Cliente'}</TableCell>
                    <TableCell>{new Date(b.event_date).toLocaleDateString('es-PR')}</TableCell>
                    <TableCell>{b.guest_count}</TableCell>
                    <TableCell className="font-medium">${b.total.toLocaleString()}</TableCell>
                    <TableCell><Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge></TableCell>
                    <TableCell>
                      {b.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-green-600" onClick={() => handleAction('confirmed', b.id)}><Check className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => handleAction('rejected', b.id)}><X className="h-3 w-3" /></Button>
                        </div>
                      )}
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

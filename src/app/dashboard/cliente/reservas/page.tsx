'use client';

import { useState } from 'react';
import { mockBookings } from '@/data/mock-bookings';
import { useAuthContext } from '@/providers/auth-provider';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusTabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas', cancelled: 'Canceladas' };

export default function ClienteReservasPage() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState('all');
  const bookings = mockBookings.filter((b) => b.client_id === user?.id);
  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Reservas</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {statusTabs.map((s) => <TabsTrigger key={s} value={s}>{tabLabels[s]}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Invitados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay reservas</TableCell></TableRow>
                ) : filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.service?.title || 'Servicio'}</TableCell>
                    <TableCell>{new Date(b.event_date).toLocaleDateString('es-PR')}</TableCell>
                    <TableCell>{b.guest_count}</TableCell>
                    <TableCell><Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge></TableCell>
                    <TableCell className="text-right font-medium">${b.total.toLocaleString()}</TableCell>
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

'use client';

import { useState } from 'react';
import { mockBookings } from '@/data/mock-bookings';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

const tabs = ['all', 'pending', 'confirmed', 'completed'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas' };

export default function ProveedorReservasPage() {
  const [tab, setTab] = useState('all');
  const { toast } = useToast();
  const filtered = tab === 'all' ? mockBookings : mockBookings.filter((b) => b.status === tab);

  const handleAction = (action: string, id: string) => {
    toast({ title: `Reserva ${action}`, description: `La reserva ${id.slice(0, 8)} ha sido ${action.toLowerCase()}.` });
  };

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
                          <Button size="sm" variant="outline" className="h-7 text-green-600" onClick={() => handleAction('Confirmada', b.id)}><Check className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => handleAction('Rechazada', b.id)}><X className="h-3 w-3" /></Button>
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

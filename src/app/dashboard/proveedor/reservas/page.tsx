'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { getBookingsByProvider } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookingDetailDialog } from '@/components/booking-detail-dialog';
import { Loader2 } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import type { ExportColumn } from '@/lib/export';
import type { Booking, BookingStatus } from '@/types/database';

const tabs = ['all', 'pending', 'confirmed', 'completed'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas' };

export default function ProveedorReservasPage() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBookingsByProvider(user.id).then(setBookings).finally(() => setLoading(false));
  }, [user]);

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  const exportColumns: ExportColumn[] = [
    { header: 'Servicio', accessor: (r) => r.service?.title || '' },
    { header: 'Cliente', accessor: (r) => r.client?.full_name || '' },
    { header: 'Fecha', accessor: (r) => new Date(r.event_date).toLocaleDateString('es-MX') },
    { header: 'Invitados', accessor: 'guest_count' },
    { header: 'Venta', accessor: (r) => r.status === 'cancelled' && r.refund_amount ? r.total - r.refund_amount : r.total },
    { header: 'Comision', accessor: 'commission' },
    { header: 'Tu Pago', accessor: (r) => { const eff = r.status === 'cancelled' && r.refund_amount ? r.total - r.refund_amount : r.total; return eff - r.commission; } },
    { header: 'Estado', accessor: (r) => BOOKING_STATUS_LABELS[r.status] || r.status },
  ];

  const handleStatusChange = (id: string, status: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion de Reservas</h1>
        <ExportButton data={filtered} columns={exportColumns} filename="mis-reservas" pdfTitle="Mis Reservas" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{tabs.map((s) => <TabsTrigger key={s} value={s}>{tabLabels[s]}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Invitados</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Comision</TableHead>
                  <TableHead>Tu Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay reservas</TableCell></TableRow>
                ) : filtered.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}
                  >
                    <TableCell className="font-medium">{b.service?.title || 'Servicio'}</TableCell>
                    <TableCell>{b.client?.full_name || 'Cliente'}</TableCell>
                    <TableCell>{new Date(b.event_date).toLocaleDateString('es-MX')}</TableCell>
                    <TableCell>{b.guest_count}</TableCell>
                    {(() => {
                      const eff = b.status === 'cancelled' && b.refund_amount ? b.total - b.refund_amount : b.total;
                      return (
                        <>
                          <TableCell className="text-muted-foreground">${eff.toLocaleString()}</TableCell>
                          <TableCell className="text-red-500">-${b.commission.toLocaleString()}</TableCell>
                          <TableCell className="font-medium text-green-600">${(eff - b.commission).toLocaleString()}</TableCell>
                        </>
                      );
                    })()}
                    <TableCell><Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role="provider"
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

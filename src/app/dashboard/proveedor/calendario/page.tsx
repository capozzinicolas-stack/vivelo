'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { getBookingsByProvider, getVendorCalendarBlocks, createVendorCalendarBlock, deleteVendorCalendarBlock } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, CalendarDays, Ban } from 'lucide-react';
import type { Booking, VendorCalendarBlock } from '@/types/database';

export default function ProveedorCalendarioPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<VendorCalendarBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('08:00');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('18:00');
  const [blockReason, setBlockReason] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getBookingsByProvider(user.id),
      getVendorCalendarBlocks(user.id),
    ]).then(([b, bl]) => {
      setBookings(b);
      setBlocks(bl);
    }).finally(() => setLoading(false));
  }, [user]);

  const upcomingBookings = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status) && b.event_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const handleCreateBlock = async () => {
    if (!user) return;
    if (!blockStartDate || !blockEndDate) {
      toast({ title: 'Selecciona fechas de inicio y fin', variant: 'destructive' });
      return;
    }

    const startDt = `${blockStartDate}T${blockStartTime}:00`;
    const endDt = `${blockEndDate}T${blockEndTime}:00`;

    if (new Date(endDt) <= new Date(startDt)) {
      toast({ title: 'La fecha/hora de fin debe ser posterior al inicio', variant: 'destructive' });
      return;
    }

    const hasConflict = upcomingBookings.some(b => {
      const bStart = b.effective_start || `${b.event_date}T${b.start_time}:00`;
      const bEnd = b.effective_end || `${b.event_date}T${b.end_time}:00`;
      return new Date(bStart) < new Date(endDt) && new Date(bEnd) > new Date(startDt);
    });

    if (hasConflict) {
      toast({ title: 'Conflicto detectado', description: 'Ya tienes una reserva en ese horario.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const newBlock = await createVendorCalendarBlock({
        vendor_id: user.id,
        start_datetime: new Date(startDt).toISOString(),
        end_datetime: new Date(endDt).toISOString(),
        reason: blockReason || undefined,
      });
      setBlocks(prev => [...prev, newBlock]);
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockReason('');
      toast({ title: 'Bloqueo creado!' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear el bloqueo.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await deleteVendorCalendarBlock(id);
      setBlocks(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Bloqueo eliminado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el bloqueo.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendario</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Proximas Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tienes reservas proximas.</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{b.service?.title || 'Servicio'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.event_date).toLocaleDateString('es-MX')} · {b.start_time} - {b.end_time}
                      </p>
                    </div>
                    <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Bloqueos de Calendario
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin bloqueos activos.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {blocks.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{b.reason || 'Sin motivo'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.start_datetime).toLocaleDateString('es-MX')} {new Date(b.start_datetime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(b.end_datetime).toLocaleDateString('es-MX')} {new Date(b.end_datetime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(b.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Bloqueo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fecha inicio</Label>
              <Input type="date" value={blockStartDate} onChange={(e) => setBlockStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Hora inicio</Label>
              <Input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Fecha fin</Label>
              <Input type="date" value={blockEndDate} onChange={(e) => setBlockEndDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Hora fin</Label>
              <Input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ej: Vacaciones, mantenimiento..." className="mt-1" />
          </div>
          <Button onClick={handleCreateBlock} disabled={creating}>
            {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : 'Crear Bloqueo'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

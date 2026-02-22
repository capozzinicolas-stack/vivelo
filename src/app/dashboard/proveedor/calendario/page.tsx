'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { getBookingsByProvider, getVendorCalendarBlocks, createVendorCalendarBlock, deleteVendorCalendarBlock } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking, VendorCalendarBlock } from '@/types/database';

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

export default function ProveedorCalendarioPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<VendorCalendarBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  // Group bookings and blocks by day
  const bookingsByDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      const key = b.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const blockedDays = useMemo(() => {
    const set = new Set<string>();
    blocks.forEach(bl => {
      const start = new Date(bl.start_datetime);
      const end = new Date(bl.end_datetime);
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => set.add(format(d, 'yyyy-MM-dd')));
    });
    return set;
  }, [blocks]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const maxConcurrent = user?.max_concurrent_services || 1;

  // Selected day detail
  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const dayBookings = selectedKey ? (bookingsByDay[selectedKey] || []) : [];
  const dayBlocks = selectedDate ? blocks.filter(bl => {
    const start = new Date(bl.start_datetime);
    const end = new Date(bl.end_datetime);
    return selectedDate >= new Date(format(start, 'yyyy-MM-dd')) && selectedDate <= new Date(format(end, 'yyyy-MM-dd'));
  }) : [];

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

    const activeBookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
    const hasConflict = activeBookings.some(b => {
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

      {/* Month Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const dayBk = bookingsByDay[key] || [];
              const isBlocked = blockedDays.has(key);
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              const confirmedCount = dayBk.filter(b => b.status === 'confirmed').length;
              const pendingCount = dayBk.filter(b => b.status === 'pending').length;
              const completedCount = dayBk.filter(b => b.status === 'completed').length;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative min-h-[60px] p-1 rounded-md text-sm border transition-colors
                    ${!inMonth ? 'text-muted-foreground/40 bg-muted/30' : 'hover:bg-accent'}
                    ${selected ? 'ring-2 ring-primary bg-primary/5' : ''}
                    ${today ? 'font-bold' : ''}
                    ${isBlocked && inMonth ? 'bg-red-50 border-red-200' : ''}
                  `}
                >
                  <span className={`text-xs ${today ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center mx-auto' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {inMonth && (confirmedCount > 0 || pendingCount > 0 || completedCount > 0) && (
                    <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                      {Array.from({ length: Math.min(confirmedCount, 3) }).map((_, i) => (
                        <span key={`c${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      ))}
                      {Array.from({ length: Math.min(pendingCount, 3) }).map((_, i) => (
                        <span key={`p${i}`} className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      ))}
                      {Array.from({ length: Math.min(completedCount, 3) }).map((_, i) => (
                        <span key={`d${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      ))}
                    </div>
                  )}
                  {isBlocked && inMonth && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full m-0.5" />
                  )}
                  {inMonth && blocks.some(bl => {
                    const start = new Date(bl.start_datetime);
                    const end = new Date(bl.end_datetime);
                    return bl.source === 'google_sync' && day >= new Date(format(start, 'yyyy-MM-dd')) && day <= new Date(format(end, 'yyyy-MM-dd'));
                  }) && (
                    <div className="absolute top-0 left-0 w-2 h-2 bg-blue-500 rounded-full m-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Confirmada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Pendiente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />Completada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Bloqueado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Google Calendar</span>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Panel */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Capacity indicator */}
            {dayBookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Capacidad: </span>
                <span>{dayBookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length}/{maxConcurrent} servicios ocupados</span>
              </div>
            )}

            {/* Bookings */}
            {dayBookings.length === 0 && dayBlocks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin actividad en este dia.</p>
            )}

            {dayBookings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Reservas</p>
                {dayBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{b.service?.title || 'Servicio'}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.start_time} - {b.end_time}
                        {b.guest_count > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{b.guest_count}</span>
                        )}
                      </p>
                    </div>
                    <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Blocks */}
            {dayBlocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Bloqueos</p>
                {dayBlocks.map(bl => {
                  const isGoogleSync = bl.source === 'google_sync';
                  return (
                    <div key={bl.id} className={`flex items-center justify-between p-3 rounded-lg border ${isGoogleSync ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{bl.reason || 'Sin motivo'}</p>
                          {isGoogleSync && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Google</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(bl.start_datetime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(bl.end_datetime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!isGoogleSync && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(bl.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Block Creation Form */}
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

'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAllBookings, updateBookingStatus } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ban, CheckCircle, Eye, Star, Search, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, DollarSign, TrendingUp, Users, ReceiptText } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { getAvailableTransitions } from '@/lib/booking-state-machine';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { Booking, BookingStatus } from '@/types/database';

const PAGE_SIZE = 20;

const STATUS_ACTION_CONFIG: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  confirmed: { icon: CheckCircle, className: 'text-green-600', label: 'Confirmar' },
  cancelled: { icon: Ban, className: 'text-red-600', label: 'Cancelar' },
  completed: { icon: Star, className: 'text-blue-600', label: 'Completar' },
  in_review: { icon: Eye, className: 'text-orange-600', label: 'En revision' },
  rejected: { icon: Ban, className: 'text-red-600', label: 'Rechazar' },
};

const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
const tabLabels: Record<string, string> = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', completed: 'Completadas', cancelled: 'Canceladas' };

type SortKey = 'event_date' | 'guest_count' | 'total' | 'commission';

export default function AdminReservasPage() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortKey, setSortKey] = useState<SortKey>('event_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [preview, setPreview] = useState<Booking | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getAllBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [tab, search, providerFilter, dateFrom, dateTo]);

  const providers = useMemo(() => {
    const names = bookings.map(b => b.provider?.full_name).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [bookings]);

  const filtered = useMemo(() => {
    let result = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.service?.title?.toLowerCase().includes(q) ||
        b.client?.full_name?.toLowerCase().includes(q) ||
        b.provider?.full_name?.toLowerCase().includes(q)
      );
    }

    if (providerFilter !== 'all') {
      result = result.filter(b => b.provider?.full_name === providerFilter);
    }

    if (dateFrom) {
      const from = dateFrom.toISOString().split('T')[0];
      result = result.filter(b => b.event_date >= from);
    }

    if (dateTo) {
      const to = dateTo.toISOString().split('T')[0];
      result = result.filter(b => b.event_date <= to);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'event_date') cmp = a.event_date.localeCompare(b.event_date);
      else if (sortKey === 'guest_count') cmp = a.guest_count - b.guest_count;
      else if (sortKey === 'total') cmp = a.total - b.total;
      else if (sortKey === 'commission') cmp = a.commission - b.commission;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [bookings, tab, search, providerFilter, dateFrom, dateTo, sortKey, sortDir]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIngresos = filtered.reduce((s, b) => s + b.total, 0);
  const totalComisiones = filtered.reduce((s, b) => s + b.commission, 0);
  const ticketPromedio = filtered.length > 0 ? Math.round(totalIngresos / filtered.length) : 0;

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast({ title: `Reserva ${BOOKING_STATUS_LABELS[status]}` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando reservas" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion de Reservas</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total reservas</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
              <ReceiptText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold">${totalIngresos.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comisiones</p>
                <p className="text-2xl font-bold">${totalComisiones.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket promedio</p>
                <p className="text-2xl font-bold">${ticketPromedio.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {tabs.map(s => (
            <TabsTrigger key={s} value={s}>
              {tabLabels[s]} <span className="ml-1 text-muted-foreground">{s === 'all' ? bookings.length : bookings.filter(b => b.status === s).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servicio, cliente o proveedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={es} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={es} />
              </PopoverContent>
            </Popover>
            {(search || providerFilter !== 'all' || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setProviderFilter('all'); setDateFrom(undefined); setDateTo(undefined); }}>
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('event_date')}>
                    Fecha <SortIcon col="event_date" />
                  </TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('guest_count')}>
                    Invitados <SortIcon col="guest_count" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('total')}>
                    Total <SortIcon col="total" />
                  </TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('commission')}>
                    Comision <SortIcon col="commission" />
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No hay reservas</TableCell></TableRow>
                ) : paged.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.service?.title || 'Servicio'}</TableCell>
                    <TableCell>{b.client?.full_name || 'Cliente'}</TableCell>
                    <TableCell className="hidden md:table-cell">{b.provider?.full_name || 'Proveedor'}</TableCell>
                    <TableCell>{new Date(b.event_date).toLocaleDateString('es-MX')}</TableCell>
                    <TableCell className="hidden md:table-cell">{b.guest_count}</TableCell>
                    <TableCell className="font-medium">${b.total.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell">${b.commission.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                      {b.status === 'cancelled' && b.refund_amount && b.refund_amount > 0 && (
                        <Badge variant="outline" className="text-xs ml-1">Reembolso: ${b.refund_amount.toLocaleString()}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          aria-label="Ver detalle de reserva"
                          onClick={() => setPreview(b)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {getAvailableTransitions(b.status).map(targetStatus => {
                          const config = STATUS_ACTION_CONFIG[targetStatus];
                          if (!config) return null;
                          const Icon = config.icon;
                          return (
                            <Button
                              key={targetStatus}
                              size="sm"
                              variant="outline"
                              className={`h-7 ${config.className}`}
                              aria-label={`${config.label} reserva`}
                              onClick={() => handleStatusChange(b.id, targetStatus)}
                            >
                              <Icon className="h-3 w-3" />
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {preview.service?.title || 'Reserva'}
                  <Badge className={BOOKING_STATUS_COLORS[preview.status]}>{BOOKING_STATUS_LABELS[preview.status]}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {preview.client?.full_name || 'Cliente'} &middot; {preview.provider?.full_name || 'Proveedor'} &middot; {format(new Date(preview.event_date), "d 'de' MMMM yyyy", { locale: es })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fecha del evento</p>
                    <p className="font-medium">{format(new Date(preview.event_date), "d 'de' MMMM yyyy", { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Horario</p>
                    <p className="font-medium">{preview.start_time} - {preview.end_time}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Horas del evento</p>
                    <p className="font-medium">{preview.event_hours}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Invitados</p>
                    <p className="font-medium">{preview.guest_count}</p>
                  </div>
                  {preview.event_name && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Nombre del evento</p>
                      <p className="font-medium">{preview.event_name}</p>
                    </div>
                  )}
                  {preview.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Notas</p>
                      <p className="font-medium">{preview.notes}</p>
                    </div>
                  )}
                </div>

                {/* Financial breakdown */}
                <div className="border-t pt-3">
                  <p className="font-semibold mb-2">Desglose financiero</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base total</span>
                      <span>${preview.base_total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extras total</span>
                      <span>${preview.extras_total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Comision{preview.commission_rate_snapshot != null ? ` (${(preview.commission_rate_snapshot * 100).toFixed(0)}%)` : ''}
                      </span>
                      <span>${preview.commission.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total</span>
                      <span>${preview.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-bookings / Extras */}
                {preview.sub_bookings && preview.sub_bookings.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="font-semibold mb-2">Extras / Sub-bookings</p>
                    <div className="space-y-1 text-sm">
                      {preview.sub_bookings.map(sb => (
                        <div key={sb.id} className="flex justify-between">
                          <span className="text-muted-foreground">{sb.name} x{sb.quantity} (${sb.unit_price.toLocaleString()} c/u)</span>
                          <span>${sb.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancellation / Refund info */}
                {preview.status === 'cancelled' && preview.refund_amount != null && preview.refund_amount > 0 && (
                  <div className="border-t pt-3">
                    <p className="font-semibold mb-2">Reembolso</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Monto reembolsado</p>
                        <p className="font-medium">${preview.refund_amount.toLocaleString()}</p>
                      </div>
                      {preview.refund_percent != null && (
                        <div>
                          <p className="text-muted-foreground">Porcentaje</p>
                          <p className="font-medium">{preview.refund_percent}%</p>
                        </div>
                      )}
                      {preview.cancelled_at && (
                        <div>
                          <p className="text-muted-foreground">Cancelada el</p>
                          <p className="font-medium">{format(new Date(preview.cancelled_at), "d/MM/yyyy HH:mm", { locale: es })}</p>
                        </div>
                      )}
                      {preview.cancelled_by && (
                        <div>
                          <p className="text-muted-foreground">Cancelada por</p>
                          <p className="font-medium">{preview.cancelled_by}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

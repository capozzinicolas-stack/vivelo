'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAllBookings, getProvidersWithCommission } from '@/lib/supabase/queries';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { COMMISSION_RATE } from '@/lib/constants';
import { DollarSign, TrendingUp, CreditCard, Clock, Loader2, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ShieldX, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { Booking, Profile } from '@/types/database';

const PERIODS = [
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'last_3', label: 'Ultimos 3 meses' },
  { value: 'last_6', label: 'Ultimos 6 meses' },
  { value: 'ytd', label: 'Año en curso' },
  { value: 'all', label: 'Todo' },
] as const;

type MonthlySortKey = 'month' | 'bookings' | 'revenue' | 'commissions' | 'margin';

function getDateRange(period: string): { from: string | null; to: string | null } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (period) {
    case 'this_month':
      return { from: `${y}-${pad(m + 1)}-01`, to: toIso(now) };
    case 'last_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { from: toIso(start), to: toIso(end) };
    }
    case 'last_3': {
      const start = new Date(y, m - 2, 1);
      return { from: toIso(start), to: toIso(now) };
    }
    case 'last_6': {
      const start = new Date(y, m - 5, 1);
      return { from: toIso(start), to: toIso(now) };
    }
    case 'ytd':
      return { from: `${y}-01-01`, to: toIso(now) };
    default:
      return { from: null, to: null };
  }
}

function formatMonth(ym: string): string {
  const d = new Date(ym + '-01');
  const s = format(d, 'MMMM yyyy', { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export default function AdminFinanzasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<(Profile & { service_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [sortKey, setSortKey] = useState<MonthlySortKey>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    Promise.all([getAllBookings(), getProvidersWithCommission()]).then(([b, p]) => {
      setBookings(b);
      setProviders(p);
    }).finally(() => setLoading(false));
  }, []);

  // Weighted average commission
  const avgCommission = useMemo(() => {
    const totalSvc = providers.reduce((sum, p) => sum + p.service_count, 0);
    if (totalSvc === 0) return COMMISSION_RATE;
    return providers.reduce((sum, p) => sum + (p.commission_rate ?? COMMISSION_RATE) * p.service_count, 0) / totalSvc;
  }, [providers]);

  // Filter bookings by period (on event_date)
  const periodBookings = useMemo(() => {
    const { from, to } = getDateRange(period);
    if (!from && !to) return bookings;
    return bookings.filter(b => {
      if (from && b.event_date < from) return false;
      if (to && b.event_date > to) return false;
      return true;
    });
  }, [bookings, period]);

  const confirmed = useMemo(() => periodBookings.filter(b => b.status === 'confirmed' || b.status === 'completed'), [periodBookings]);
  const pending = useMemo(() => periodBookings.filter(b => b.status === 'pending'), [periodBookings]);
  const cancelled = useMemo(() => periodBookings.filter(b => b.status === 'cancelled'), [periodBookings]);

  // KPI values
  const totalRevenue = confirmed.reduce((s, b) => s + b.total, 0);
  const totalCommissions = confirmed.reduce((s, b) => s + b.commission, 0);
  const totalProviderPayouts = confirmed.reduce((s, b) => s + b.total - b.commission, 0);
  const pendingRevenue = pending.reduce((s, b) => s + b.total, 0);

  // MoM trends (current month vs previous month, from full dataset)
  const trends = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;

    const thisConf = bookings.filter(b => (b.status === 'confirmed' || b.status === 'completed') && b.event_date.startsWith(thisMonth));
    const prevConf = bookings.filter(b => (b.status === 'confirmed' || b.status === 'completed') && b.event_date.startsWith(prevMonth));

    const thisRev = thisConf.reduce((s, b) => s + b.total, 0);
    const prevRev = prevConf.reduce((s, b) => s + b.total, 0);
    const thisCom = thisConf.reduce((s, b) => s + b.commission, 0);
    const prevCom = prevConf.reduce((s, b) => s + b.commission, 0);
    const thisPay = thisConf.reduce((s, b) => s + b.total - b.commission, 0);
    const prevPay = prevConf.reduce((s, b) => s + b.total - b.commission, 0);

    const calc = (cur: number, pre: number) => {
      if (pre === 0) return cur > 0 ? { value: 100, direction: 'up' as const } : undefined;
      const pct = Math.round(((cur - pre) / pre) * 100);
      if (pct === 0) return undefined;
      return { value: Math.abs(pct), direction: pct > 0 ? ('up' as const) : ('down' as const) };
    };

    return { revenue: calc(thisRev, prevRev), commissions: calc(thisCom, prevCom), payouts: calc(thisPay, prevPay) };
  }, [bookings]);

  // Monthly breakdown (sorted)
  const months = useMemo(() => {
    const data: Record<string, { revenue: number; commissions: number; bookings: number }> = {};
    confirmed.forEach(b => {
      const month = b.event_date.slice(0, 7);
      if (!data[month]) data[month] = { revenue: 0, commissions: 0, bookings: 0 };
      data[month].revenue += b.total;
      data[month].commissions += b.commission;
      data[month].bookings += 1;
    });

    const entries = Object.entries(data);
    entries.sort(([aM, aD], [bM, bD]) => {
      let cmp = 0;
      if (sortKey === 'month') cmp = aM.localeCompare(bM);
      else if (sortKey === 'bookings') cmp = aD.bookings - bD.bookings;
      else if (sortKey === 'revenue') cmp = aD.revenue - bD.revenue;
      else if (sortKey === 'commissions') cmp = aD.commissions - bD.commissions;
      else if (sortKey === 'margin') {
        const am = aD.revenue > 0 ? aD.commissions / aD.revenue : 0;
        const bm = bD.revenue > 0 ? bD.commissions / bD.revenue : 0;
        cmp = am - bm;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return entries;
  }, [confirmed, sortKey, sortDir]);

  // Top 5 providers by GMV
  const topProviders = useMemo(() => {
    const map: Record<string, { name: string; bookings: number; gmv: number; commission: number; rate: number }> = {};
    confirmed.forEach(b => {
      const pid = b.provider_id;
      if (!map[pid]) {
        const prov = providers.find(p => p.id === pid);
        map[pid] = {
          name: b.provider?.full_name || prov?.full_name || 'Proveedor',
          bookings: 0,
          gmv: 0,
          commission: 0,
          rate: prov?.commission_rate ?? COMMISSION_RATE,
        };
      }
      map[pid].bookings += 1;
      map[pid].gmv += b.total;
      map[pid].commission += b.commission;
    });
    return Object.values(map).sort((a, b) => b.gmv - a.gmv).slice(0, 5);
  }, [confirmed, providers]);

  // Category breakdown
  const categories = useMemo(() => {
    const map: Record<string, { bookings: number; gmv: number; commission: number }> = {};
    confirmed.forEach(b => {
      const cat = b.service?.category || 'Sin categoria';
      if (!map[cat]) map[cat] = { bookings: 0, gmv: 0, commission: 0 };
      map[cat].bookings += 1;
      map[cat].gmv += b.total;
      map[cat].commission += b.commission;
    });
    return Object.entries(map).sort(([, a], [, b]) => b.gmv - a.gmv);
  }, [confirmed]);

  // Cancellation stats
  const cancellationRate = periodBookings.length > 0 ? (cancelled.length / periodBookings.length * 100) : 0;
  const totalRefunded = cancelled.reduce((s, b) => s + (b.refund_amount || 0), 0);
  const avgRefund = cancelled.length > 0 ? Math.round(totalRefunded / cancelled.length) : 0;

  // Avg booking value & commission
  const avgBookingValue = confirmed.length > 0 ? Math.round(totalRevenue / confirmed.length) : 0;
  const avgCommPerBooking = confirmed.length > 0 ? Math.round(totalCommissions / confirmed.length) : 0;

  const toggleSort = (key: MonthlySortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: MonthlySortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 inline" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Comision promedio ponderada: {(avgCommission * 100).toFixed(1)}%</p>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards with MoM trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="GMV (Ventas Totales)" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} description="Total facturado a clientes" trend={trends.revenue} />
        <StatsCard title="Revenue Vivelo" value={`$${totalCommissions.toLocaleString()}`} icon={TrendingUp} description="Comisiones cobradas" trend={trends.commissions} />
        <StatsCard title="Pagos a Proveedores" value={`$${totalProviderPayouts.toLocaleString()}`} icon={CreditCard} description="Neto transferido a sellers" trend={trends.payouts} />
        <StatsCard title="GMV Pendiente" value={`$${pendingRevenue.toLocaleString()}`} icon={Clock} description="Reservas sin confirmar" />
      </div>

      {/* Metricas Clave + Cancelaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Metricas Clave</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reservas completadas/confirmadas</span>
                <span className="font-medium">{confirmed.length}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Valor promedio por reserva</span>
                <span className="font-medium">${avgBookingValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Margen de comision (promedio ponderado)</span>
                <span className="font-medium">{(avgCommission * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Comision promedio por reserva</span>
                <span className="font-medium">${avgCommPerBooking.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cancelaciones y Reembolsos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Tasa de cancelacion</span>
                <span className="font-medium">{cancellationRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reservas canceladas</span>
                <span className="font-medium">{cancelled.length}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Total reembolsado</span>
                <span className="font-medium">${totalRefunded.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reembolso promedio</span>
                <span className="font-medium">${avgRefund.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desglose Mensual (sortable, formatted) */}
      <Card>
        <CardHeader><CardTitle>Desglose Mensual</CardTitle></CardHeader>
        <CardContent>
          {months.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Sin datos aun</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('month')}>
                      Mes <SortIcon col="month" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('bookings')}>
                      Reservas <SortIcon col="bookings" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('revenue')}>
                      GMV <SortIcon col="revenue" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('commissions')}>
                      Revenue <SortIcon col="commissions" />
                    </TableHead>
                    <TableHead>A Proveedores</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('margin')}>
                      Margen % <SortIcon col="margin" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months.map(([month, data]) => {
                    const margin = data.revenue > 0 ? (data.commissions / data.revenue * 100) : 0;
                    return (
                      <TableRow key={month}>
                        <TableCell className="font-medium">{formatMonth(month)}</TableCell>
                        <TableCell>{data.bookings}</TableCell>
                        <TableCell>${data.revenue.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">${data.commissions.toLocaleString()}</TableCell>
                        <TableCell>${(data.revenue - data.commissions).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{margin.toFixed(1)}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Providers + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Proveedores por GMV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProviders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin datos aun</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Reservas</TableHead>
                    <TableHead>GMV</TableHead>
                    <TableHead>Comision</TableHead>
                    <TableHead>Tasa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProviders.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.bookings}</TableCell>
                      <TableCell>${p.gmv.toLocaleString()}</TableCell>
                      <TableCell>${p.commission.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{(p.rate * 100).toFixed(0)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5" />
              Desglose por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin datos aun</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Reservas</TableHead>
                    <TableHead>GMV</TableHead>
                    <TableHead>Comision</TableHead>
                    <TableHead>% del GMV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(([cat, data]) => {
                    const pctGmv = totalRevenue > 0 ? (data.gmv / totalRevenue * 100) : 0;
                    return (
                      <TableRow key={cat}>
                        <TableCell className="font-medium">{capitalize(cat)}</TableCell>
                        <TableCell>{data.bookings}</TableCell>
                        <TableCell>${data.gmv.toLocaleString()}</TableCell>
                        <TableCell>${data.commission.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pctGmv, 100)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">{pctGmv.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

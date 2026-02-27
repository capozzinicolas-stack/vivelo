'use client';

import { useState, useEffect } from 'react';
import { getFinancialStats, getProvidersWithCommission } from '@/lib/supabase/queries';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { COMMISSION_RATE } from '@/lib/constants';
import { DollarSign, TrendingUp, CreditCard, Clock, Loader2 } from 'lucide-react';

export default function AdminFinanzasPage() {
  const [stats, setStats] = useState<{
    totalRevenue: number;
    totalCommissions: number;
    totalProviderPayouts: number;
    pendingRevenue: number;
    monthlyData: Record<string, { revenue: number; commissions: number; bookings: number }>;
    totalBookings: number;
  } | null>(null);
  const [avgCommission, setAvgCommission] = useState<number>(COMMISSION_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFinancialStats(), getProvidersWithCommission()]).then(([s, providers]) => {
      setStats(s);
      const totalSvc = providers.reduce((sum, p) => sum + p.service_count, 0);
      if (totalSvc > 0) {
        setAvgCommission(providers.reduce((sum, p) => sum + (p.commission_rate ?? COMMISSION_RATE) * p.service_count, 0) / totalSvc);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const avgBookingValue = stats && stats.totalBookings > 0
    ? Math.round(stats.totalRevenue / stats.totalBookings)
    : 0;

  const months = stats ? Object.entries(stats.monthlyData).sort(([a], [b]) => b.localeCompare(a)) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-sm text-muted-foreground">Comision promedio ponderada: {(avgCommission * 100).toFixed(1)}%</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Ingresos Totales" value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} description="Total facturado en la plataforma" />
        <StatsCard title="Comisiones Vivelo" value={`$${(stats?.totalCommissions || 0).toLocaleString()}`} icon={TrendingUp} description="Ganancia de la plataforma" />
        <StatsCard title="Pagos a Proveedores" value={`$${(stats?.totalProviderPayouts || 0).toLocaleString()}`} icon={CreditCard} description="Total pagado a proveedores" />
        <StatsCard title="Revenue Pendiente" value={`$${(stats?.pendingRevenue || 0).toLocaleString()}`} icon={Clock} description="Reservas sin confirmar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Metricas Clave</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reservas completadas/confirmadas</span>
                <span className="font-medium">{stats?.totalBookings || 0}</span>
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
                <span className="font-medium">${stats && stats.totalBookings > 0 ? Math.round(stats.totalCommissions / stats.totalBookings).toLocaleString() : 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Desglose Mensual</CardTitle></CardHeader>
          <CardContent>
            {months.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin datos aun</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Reservas</TableHead>
                    <TableHead>Ingresos</TableHead>
                    <TableHead>Comisiones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months.map(([month, data]) => (
                    <TableRow key={month}>
                      <TableCell className="font-medium">{month}</TableCell>
                      <TableCell>{data.bookings}</TableCell>
                      <TableCell>${data.revenue.toLocaleString()}</TableCell>
                      <TableCell>${data.commissions.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

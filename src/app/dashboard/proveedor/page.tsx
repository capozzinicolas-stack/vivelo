'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useAuthContext } from '@/providers/auth-provider';
import { getProviderStats } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Package, CalendarCheck, DollarSign, Star, Plus, Loader2 } from 'lucide-react';
import type { Booking } from '@/types/database';

export default function ProveedorDashboard() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<{ activeServices: number; pendingBookings: Booking[]; revenue: number; avgRating: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getProviderStats(user.id).then(setStats).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const pendientes = stats?.pendingBookings || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Proveedor</h1>
        <Button asChild><Link href="/dashboard/proveedor/servicios/nuevo"><Plus className="h-4 w-4 mr-2" />Crear Servicio</Link></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Servicios Activos" value={stats?.activeServices || 0} icon={Package} />
        <StatsCard title="Reservas Pendientes" value={pendientes.length} icon={CalendarCheck} />
        <StatsCard title="Ingresos" value={`$${(stats?.revenue || 0).toLocaleString()}`} icon={DollarSign} trend={{ value: 12, direction: 'up' }} />
        <StatsCard title="Rating Promedio" value={stats?.avgRating || 0} icon={Star} />
      </div>

      <Card>
        <CardHeader><CardTitle>Reservas por Confirmar</CardTitle></CardHeader>
        <CardContent>
          {pendientes.length === 0 ? <p className="text-muted-foreground text-center py-4">No hay reservas pendientes</p> : (
            <div className="space-y-3">
              {pendientes.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{b.service?.title || 'Servicio'}</p>
                    <p className="text-sm text-muted-foreground">{new Date(b.event_date).toLocaleDateString('es-MX')} - {b.guest_count} invitados</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                    <span className="font-medium">${b.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

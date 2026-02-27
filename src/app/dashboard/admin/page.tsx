'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatsCard } from '@/components/dashboard/stats-card';
import { getAdminStats, getAllBookings, getAllProfiles } from '@/lib/supabase/queries';
import { COMMISSION_RATE, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, CalendarCheck, DollarSign, Loader2, ArrowRight } from 'lucide-react';
import type { Booking, Profile } from '@/types/database';

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ totalUsers: number; totalServices: number; totalBookings: number; totalComisiones: number } | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminStats(), getAllBookings(), getAllProfiles()]).then(([s, b, u]) => {
      setStats(s);
      setRecentBookings(b.slice(0, 5));
      setRecentUsers(u.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando panel de administracion" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Panel de Administracion</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Usuarios" value={stats?.totalUsers || 0} icon={Users} />
        <StatsCard title="Total Servicios" value={stats?.totalServices || 0} icon={Package} />
        <StatsCard title="Reservas" value={stats?.totalBookings || 0} icon={CalendarCheck} />
        <StatsCard title="Comisiones" value={`$${(stats?.totalComisiones || 0).toLocaleString()}`} description={`${(COMMISSION_RATE * 100).toFixed(0)}% por transaccion`} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reservas Recientes</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/admin/reservas">Ver todas <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin reservas</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{b.service?.title || 'Servicio'}</p>
                      <p className="text-xs text-muted-foreground">{b.client?.full_name || 'Cliente'} · {new Date(b.event_date).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                      <p className="text-sm font-medium mt-1">${b.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Usuarios Recientes</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/admin/usuarios">Ver todos <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin usuarios</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge className={u.role === 'provider' ? 'bg-green-100 text-green-800' : u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>{u.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useAuthContext } from '@/providers/auth-provider';
import { getClientStats } from '@/lib/supabase/queries';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { CalendarCheck, DollarSign, Clock, Search, Loader2 } from 'lucide-react';
import type { Booking } from '@/types/database';

export default function ClienteDashboard() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<{ totalBookings: number; totalSpent: number; nextEvent: Booking | undefined; recentBookings: Booking[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getClientStats(user.id).then(setStats).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Bienvenido, {user?.full_name?.split(' ')[0]}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Reservas" value={stats?.totalBookings || 0} icon={CalendarCheck} />
        <StatsCard title="Gasto Total" value={`$${(stats?.totalSpent || 0).toLocaleString()}`} icon={DollarSign} />
        <StatsCard title="Proximo Evento" value={stats?.nextEvent ? new Date(stats.nextEvent.event_date).toLocaleDateString('es-MX') : 'N/A'} icon={Clock} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reservas Recientes</CardTitle>
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/cliente/reservas">Ver todas</Link></Button>
        </CardHeader>
        <CardContent>
          {!stats?.recentBookings.length ? (
            <p className="text-muted-foreground text-center py-4">No tienes reservas aun</p>
          ) : (
            <div className="space-y-3">
              {stats.recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{b.service?.title || 'Servicio'}</p>
                    <p className="text-sm text-muted-foreground">{new Date(b.event_date).toLocaleDateString('es-MX')}</p>
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

      <Button asChild><Link href="/servicios"><Search className="h-4 w-4 mr-2" />Explorar Servicios</Link></Button>
    </div>
  );
}

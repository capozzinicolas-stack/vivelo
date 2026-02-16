'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { mockBookings } from '@/data/mock-bookings';
import { useAuthContext } from '@/providers/auth-provider';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { CalendarCheck, DollarSign, Clock, Search } from 'lucide-react';

export default function ClienteDashboard() {
  const { user } = useAuthContext();
  const bookings = mockBookings.filter((b) => b.client_id === user?.id);
  const totalGasto = bookings.reduce((s, b) => s + b.total, 0);
  const proxima = bookings.filter((b) => b.status === 'confirmed').sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  const recientes = bookings.slice(0, 3);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Bienvenido, {user?.full_name?.split(' ')[0]}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Reservas" value={bookings.length} icon={CalendarCheck} />
        <StatsCard title="Gasto Total" value={`$${totalGasto.toLocaleString()}`} icon={DollarSign} />
        <StatsCard title="Proximo Evento" value={proxima ? new Date(proxima.event_date).toLocaleDateString('es-PR') : 'N/A'} icon={Clock} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reservas Recientes</CardTitle>
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/cliente/reservas">Ver todas</Link></Button>
        </CardHeader>
        <CardContent>
          {recientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No tienes reservas aun</p>
          ) : (
            <div className="space-y-3">
              {recientes.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{b.service?.title || 'Servicio'}</p>
                    <p className="text-sm text-muted-foreground">{new Date(b.event_date).toLocaleDateString('es-PR')}</p>
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

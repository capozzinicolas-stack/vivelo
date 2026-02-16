'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { mockServices } from '@/data/mock-services';
import { mockBookings } from '@/data/mock-bookings';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Package, CalendarCheck, DollarSign, Star, Plus } from 'lucide-react';

export default function ProveedorDashboard() {
  const servicios = mockServices.filter((s) => s.status === 'active');
  const reservas = mockBookings;
  const pendientes = reservas.filter((b) => b.status === 'pending');
  const ingresos = reservas.filter((b) => b.status === 'confirmed' || b.status === 'completed').reduce((s, b) => s + b.base_total + b.extras_total, 0);
  const avgRating = servicios.length ? (servicios.reduce((s, sv) => s + sv.avg_rating, 0) / servicios.length).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Proveedor</h1>
        <Button asChild><Link href="/dashboard/proveedor/servicios/nuevo"><Plus className="h-4 w-4 mr-2" />Crear Servicio</Link></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Servicios Activos" value={servicios.length} icon={Package} />
        <StatsCard title="Reservas Pendientes" value={pendientes.length} icon={CalendarCheck} />
        <StatsCard title="Ingresos" value={`$${ingresos.toLocaleString()}`} icon={DollarSign} trend={{ value: 12, direction: 'up' }} />
        <StatsCard title="Rating Promedio" value={avgRating} icon={Star} />
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
                    <p className="text-sm text-muted-foreground">{new Date(b.event_date).toLocaleDateString('es-PR')} - {b.guest_count} invitados</p>
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

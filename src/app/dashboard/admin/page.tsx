'use client';

import { StatsCard } from '@/components/dashboard/stats-card';
import { mockUsers } from '@/data/mock-users';
import { mockServices } from '@/data/mock-services';
import { mockBookings } from '@/data/mock-bookings';
import { COMMISSION_RATE } from '@/lib/constants';
import { Users, Package, CalendarCheck, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const totalComisiones = mockBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').reduce((s, b) => s + b.commission, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Panel de Administracion</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Usuarios" value={mockUsers.length} icon={Users} />
        <StatsCard title="Total Servicios" value={mockServices.length} icon={Package} />
        <StatsCard title="Reservas este Mes" value={mockBookings.length} icon={CalendarCheck} />
        <StatsCard title="Comisiones" value={`$${totalComisiones.toLocaleString()}`} description={`${(COMMISSION_RATE * 100).toFixed(0)}% por transaccion`} icon={DollarSign} trend={{ value: 8, direction: 'up' }} />
      </div>
    </div>
  );
}

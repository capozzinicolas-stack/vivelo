'use client';

import { useState, useEffect } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { getAdminStats } from '@/lib/supabase/queries';
import { COMMISSION_RATE } from '@/lib/constants';
import { Users, Package, CalendarCheck, DollarSign, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ totalUsers: number; totalServices: number; totalBookings: number; totalComisiones: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Panel de Administracion</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Usuarios" value={stats?.totalUsers || 0} icon={Users} />
        <StatsCard title="Total Servicios" value={stats?.totalServices || 0} icon={Package} />
        <StatsCard title="Reservas" value={stats?.totalBookings || 0} icon={CalendarCheck} />
        <StatsCard title="Comisiones" value={`$${(stats?.totalComisiones || 0).toLocaleString()}`} description={`${(COMMISSION_RATE * 100).toFixed(0)}% por transaccion`} icon={DollarSign} trend={{ value: 8, direction: 'up' }} />
      </div>
    </div>
  );
}

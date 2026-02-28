'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PeriodFilter, getDefaultPeriodRanges, type PeriodRange } from '@/components/admin/period-filter';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, CalendarCheck, DollarSign, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 10;

interface DashboardStats {
  totalUsers: number;
  totalServices: number;
  totalBookings: number;
  totalCommissions: number;
}

interface Trend {
  value: number;
  direction: 'up' | 'down';
}

interface BookingRow {
  id: string;
  event_date: string;
  status: string;
  total: number;
  created_at: string;
  service: { title: string } | null;
  client: { full_name: string } | null;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

function calcTrend(current: number, previous: number): Trend | undefined {
  if (previous === 0) return current > 0 ? { value: 100, direction: 'up' } : undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), direction: pct >= 0 ? 'up' : 'down' };
}

const ROLE_COLORS: Record<string, string> = {
  provider: 'bg-green-100 text-green-800',
  admin: 'bg-purple-100 text-purple-800',
  client: 'bg-blue-100 text-blue-800',
};

export default function AdminDashboard() {
  const defaults = getDefaultPeriodRanges();
  const [currentRange, setCurrentRange] = useState<PeriodRange>(defaults.current);
  const [previousRange, setPreviousRange] = useState<PeriodRange>(defaults.previous);
  const [periodLabel, setPeriodLabel] = useState(defaults.label);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<{
    users?: Trend;
    services?: Trend;
    bookings?: Trend;
    commissions?: Trend;
  }>({});
  const [loading, setLoading] = useState(true);

  // Bookings table
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);

  // Users table
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);

  const fetchStats = useCallback(async (current: PeriodRange, previous: PeriodRange) => {
    setLoading(true);
    const supabase = createClient();

    const [
      usersRes,
      servicesRes,
      bookingsRes,
      commissionsRes,
      prevUsersRes,
      prevServicesRes,
      prevBookingsRes,
      prevCommissionsRes,
    ] = await Promise.all([
      // Current period counts
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', current.start).lte('created_at', current.end),
      supabase.from('services').select('id', { count: 'exact', head: true })
        .gte('created_at', current.start).lte('created_at', current.end),
      supabase.from('bookings').select('id', { count: 'exact', head: true })
        .gte('created_at', current.start).lte('created_at', current.end),
      supabase.from('bookings').select('commission')
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', current.start).lte('created_at', current.end),
      // Previous period counts
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', previous.start).lte('created_at', previous.end),
      supabase.from('services').select('id', { count: 'exact', head: true })
        .gte('created_at', previous.start).lte('created_at', previous.end),
      supabase.from('bookings').select('id', { count: 'exact', head: true })
        .gte('created_at', previous.start).lte('created_at', previous.end),
      supabase.from('bookings').select('commission')
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', previous.start).lte('created_at', previous.end),
    ]);

    const currentCommissions = (commissionsRes.data || []).reduce((sum, b) => sum + (b.commission || 0), 0);
    const prevCommissions = (prevCommissionsRes.data || []).reduce((sum, b) => sum + (b.commission || 0), 0);

    const currentStats: DashboardStats = {
      totalUsers: usersRes.count ?? 0,
      totalServices: servicesRes.count ?? 0,
      totalBookings: bookingsRes.count ?? 0,
      totalCommissions: currentCommissions,
    };

    setStats(currentStats);
    setTrends({
      users: calcTrend(currentStats.totalUsers, prevUsersRes.count ?? 0),
      services: calcTrend(currentStats.totalServices, prevServicesRes.count ?? 0),
      bookings: calcTrend(currentStats.totalBookings, prevBookingsRes.count ?? 0),
      commissions: calcTrend(currentStats.totalCommissions, prevCommissions),
    });
    setLoading(false);
  }, []);

  const fetchBookings = useCallback(async (range: PeriodRange, page: number) => {
    const supabase = createClient();
    const offset = (page - 1) * PAGE_SIZE;

    const [dataRes, countRes] = await Promise.all([
      supabase.from('bookings')
        .select('id, event_date, status, total, created_at, service:services(title), client:profiles!client_id(full_name)')
        .gte('created_at', range.start).lte('created_at', range.end)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1),
      supabase.from('bookings').select('id', { count: 'exact', head: true })
        .gte('created_at', range.start).lte('created_at', range.end),
    ]);

    setBookings((dataRes.data || []) as unknown as BookingRow[]);
    setBookingsTotal(countRes.count ?? 0);
  }, []);

  const fetchUsers = useCallback(async (range: PeriodRange, page: number) => {
    const supabase = createClient();
    const offset = (page - 1) * PAGE_SIZE;

    const [dataRes, countRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, email, role, created_at')
        .gte('created_at', range.start).lte('created_at', range.end)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', range.start).lte('created_at', range.end),
    ]);

    setUsers((dataRes.data || []) as UserRow[]);
    setUsersTotal(countRes.count ?? 0);
  }, []);

  // Initial load + period change
  useEffect(() => {
    fetchStats(currentRange, previousRange);
    setBookingsPage(1);
    setUsersPage(1);
    fetchBookings(currentRange, 1);
    fetchUsers(currentRange, 1);
  }, [currentRange, previousRange, fetchStats, fetchBookings, fetchUsers]);

  // Pagination changes
  useEffect(() => {
    fetchBookings(currentRange, bookingsPage);
  }, [bookingsPage, currentRange, fetchBookings]);

  useEffect(() => {
    fetchUsers(currentRange, usersPage);
  }, [usersPage, currentRange, fetchUsers]);

  const handlePeriodChange = useCallback((current: PeriodRange, previous: PeriodRange, label: string) => {
    setCurrentRange(current);
    setPreviousRange(previous);
    setPeriodLabel(label);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Panel de Administracion</h1>
        <PeriodFilter onChange={handlePeriodChange} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando panel de administracion" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/usuarios">
              <StatsCard
                title="Total Usuarios"
                value={stats?.totalUsers ?? 0}
                icon={Users}
                trend={trends.users}
                description={periodLabel}
              />
            </Link>
            <Link href="/dashboard/servicios">
              <StatsCard
                title="Total Servicios"
                value={stats?.totalServices ?? 0}
                icon={Package}
                trend={trends.services}
                description={periodLabel}
              />
            </Link>
            <Link href="/dashboard/reservas">
              <StatsCard
                title="Reservas"
                value={stats?.totalBookings ?? 0}
                icon={CalendarCheck}
                trend={trends.bookings}
                description={periodLabel}
              />
            </Link>
            <Link href="/dashboard/finanzas">
              <StatsCard
                title="Comisiones"
                value={`$${(stats?.totalCommissions ?? 0).toLocaleString()}`}
                icon={DollarSign}
                trend={trends.commissions}
                description={periodLabel}
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reservas Recientes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Reservas Recientes</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/reservas">Ver todas <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sin reservas en este periodo</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{b.service?.title || 'Servicio'}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.client?.full_name || 'Cliente'} · {new Date(b.event_date).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                          <p className="text-sm font-medium mt-1">${b.total.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <PaginationControls
                  currentPage={bookingsPage}
                  totalItems={bookingsTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setBookingsPage}
                />
              </CardContent>
            </Card>

            {/* Usuarios Recientes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Usuarios Recientes</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/usuarios">Ver todos <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sin usuarios en este periodo</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge className={ROLE_COLORS[u.role] || ROLE_COLORS.client}>{u.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <PaginationControls
                  currentPage={usersPage}
                  totalItems={usersTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setUsersPage}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

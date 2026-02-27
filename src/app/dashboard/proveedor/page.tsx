'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatsCard } from '@/components/dashboard/stats-card';
import { BookingDetailDialog } from '@/components/booking-detail-dialog';
import { useAuthContext } from '@/providers/auth-provider';
import { getProviderStats, getReviewsByProvider, getProfileById } from '@/lib/supabase/queries';
import { COMMISSION_RATE, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Package, CalendarCheck, DollarSign, Star, Plus, Loader2 } from 'lucide-react';
import type { Booking, BookingStatus, Review } from '@/types/database';

export default function ProveedorDashboard() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<{ activeServices: number; pendingBookings: Booking[]; revenue: number; gmv: number; totalCommission: number; avgRating: number } | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(COMMISSION_RATE);
  const [loading, setLoading] = useState(true);

  // Booking detail dialog
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reviews dialog
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([getProviderStats(user.id), getProfileById(user.id)]).then(([s, profile]) => {
      setStats(s);
      if (profile?.commission_rate) setCommissionRate(profile.commission_rate);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleOpenReviews = async () => {
    if (!user) return;
    setReviewsOpen(true);
    if (reviews.length === 0) {
      setReviewsLoading(true);
      try {
        const data = await getReviewsByProvider(user.id);
        setReviews(data);
      } finally {
        setReviewsLoading(false);
      }
    }
  };

  const handleStatusChange = (id: string, status: BookingStatus) => {
    if (!stats) return;
    setStats({
      ...stats,
      pendingBookings: stats.pendingBookings.map(b => b.id === id ? { ...b, status } : b),
    });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const pendientes = stats?.pendingBookings || [];

  // Build star display helper
  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Proveedor</h1>
        <Button asChild><Link href="/dashboard/proveedor/servicios/nuevo"><Plus className="h-4 w-4 mr-2" />Crear Servicio</Link></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/proveedor/servicios" className="block hover:opacity-80 transition-opacity">
          <StatsCard title="Servicios Activos" value={stats?.activeServices || 0} icon={Package} />
        </Link>
        <Link href="/dashboard/proveedor/reservas" className="block hover:opacity-80 transition-opacity">
          <StatsCard title="Reservas Pendientes" value={pendientes.length} icon={CalendarCheck} />
        </Link>
        <Link href="/dashboard/proveedor/reservas" className="block hover:opacity-80 transition-opacity">
          <StatsCard title="Ventas Totales" value={`$${(stats?.gmv || 0).toLocaleString()}`} icon={DollarSign} description="Total facturado a clientes" />
        </Link>
        <button onClick={handleOpenReviews} className="text-left hover:opacity-80 transition-opacity">
          <StatsCard title="Rating Promedio" value={stats?.avgRating || 0} icon={Star} />
        </button>
      </div>

      {/* Financial summary card */}
      <Card>
        <CardHeader><CardTitle>Resumen Financiero</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Ventas Totales (GMV)</p>
              <p className="text-2xl font-bold">${(stats?.gmv || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Lo que pagan tus clientes</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p className="text-sm text-muted-foreground">Comision Vivelo ({(commissionRate * 100).toFixed(1)}%)</p>
              <p className="text-2xl font-bold text-red-600">-${(stats?.totalCommission || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Tarifa de la plataforma</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-sm text-muted-foreground">Tu Pago Neto</p>
              <p className="text-2xl font-bold text-green-600">${(stats?.revenue || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Lo que recibes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reservas por Confirmar</CardTitle></CardHeader>
        <CardContent>
          {pendientes.length === 0 ? <p className="text-muted-foreground text-center py-4">No hay reservas pendientes</p> : (
            <div className="space-y-3">
              {pendientes.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}
                >
                  <div>
                    <p className="font-medium">{b.service?.title || 'Servicio'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(b.event_date).toLocaleDateString('es-MX')} - {b.guest_count} invitados
                      {b.event_name && <span className="ml-2 text-primary">· {b.event_name}</span>}
                    </p>
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

      {/* Booking Detail Dialog */}
      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role="provider"
        onStatusChange={handleStatusChange}
      />

      {/* Reviews Dialog */}
      <Dialog open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resenas y Rating</DialogTitle>
          </DialogHeader>
          {reviewsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aun no tienes resenas</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{stats?.avgRating || 0}</span>
                {renderStars(stats?.avgRating || 0)}
                <span className="text-sm text-muted-foreground">({reviews.length} resenas)</span>
              </div>
              <Separator />
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{r.client?.full_name || 'Cliente'}</span>
                      {renderStars(r.rating)}
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MessageCircle, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────

interface WhatsAppEvent {
  id: string;
  event_type: string;
  phone: string;
  template_name: string;
  variables: Record<string, string> | null;
  mirlo_message_id: string | null;
  status: string;
  error_message: string | null;
  booking_id: string | null;
  service_id: string | null;
  created_at: string;
  profile?: { full_name: string; email: string; phone: string | null } | null;
}

interface Stats {
  byEventType: Record<string, number>;
  byStatus: Record<string, number>;
  total: number;
  todayTotal: number;
  weekTotal: number;
  deliveryRate: number;
  readRate: number;
}

// ─── Labels ──────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  provider_welcome: 'Bienvenida proveedor',
  provider_service_approved: 'Servicio aprobado',
  provider_service_rejected: 'Servicio rechazado',
  provider_service_needs_revision: 'Servicio requiere revision',
  provider_new_booking: 'Nueva reserva (proveedor)',
  provider_booking_cancelled: 'Reserva cancelada (proveedor)',
  provider_event_reminder: 'Recordatorio (proveedor)',
  provider_start_code: 'Codigo inicio (proveedor)',
  provider_booking_completed: 'Completada (proveedor)',
  provider_new_review: 'Nueva resena',
  provider_fiscal_approved: 'Fiscal aprobado',
  provider_fiscal_rejected: 'Fiscal rechazado',
  provider_banking_approved: 'Banco aprobado',
  provider_banking_rejected: 'Banco rechazado',
  provider_admin_comment: 'Comentario admin',
  provider_booking_rejected: 'Reserva rechazada (proveedor)',
  client_welcome: 'Bienvenida cliente',
  client_booking_confirmed: 'Reserva confirmada',
  client_booking_cancelled: 'Reserva cancelada',
  client_event_reminder: 'Recordatorio (cliente)',
  client_verification_codes: 'Codigos verificacion',
  client_booking_completed: 'Completada (cliente)',
  client_event_started: 'Evento iniciado',
  client_booking_rejected: 'Reserva rechazada (cliente)',
  admin_manual: 'Mensaje admin',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  sent: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

// ─── Component ───────────────────────────────────────────────

export default function WhatsAppDashboard() {
  const [events, setEvents] = useState<WhatsAppEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);
      const res = await fetch(`/api/admin/whatsapp/stats?${params}`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('[WA Dashboard] Stats fetch failed:', err);
    }
  }, [filterStart, filterEnd]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterEventType !== 'all') params.set('event_type', filterEventType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);

      const res = await fetch(`/api/admin/whatsapp/messages?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('[WA Dashboard] Events fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filterEventType, filterStatus, filterStart, filterEnd]);

  useEffect(() => {
    fetchStats();
    fetchEvents();
  }, [fetchStats, fetchEvents]);

  const maxEventCount = stats ? Math.max(...Object.values(stats.byEventType), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm">Metricas de mensajes enviados via Mirlo</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchEvents(); }}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Hoy</p>
              <p className="text-2xl font-bold">{stats.todayTotal}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Esta semana</p>
              <p className="text-2xl font-bold">{stats.weekTotal}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">% Entregados</p>
              <p className="text-2xl font-bold">{stats.deliveryRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">% Leidos</p>
              <p className="text-2xl font-bold">{stats.readRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Type Distribution (bar chart via CSS) */}
      {stats && Object.keys(stats.byEventType).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Distribucion por tipo (ultimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byEventType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-48 truncate">
                    {EVENT_TYPE_LABELS[type] || type}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-primary/80 h-full rounded-full transition-all"
                      style={{ width: `${(count / maxEventCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[160px]"
          value={filterStart}
          onChange={e => setFilterStart(e.target.value)}
          placeholder="Desde"
        />
        <Input
          type="date"
          className="w-[160px]"
          value={filterEnd}
          onChange={e => setFilterEnd(e.target.value)}
          placeholder="Hasta"
        />
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Eventos recientes ({total} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No hay eventos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Destinatario</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Template</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{ev.profile?.full_name || 'Desconocido'}</div>
                        <div className="text-xs text-muted-foreground">{ev.phone}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{ev.template_name}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[ev.status] || 'bg-gray-100'}`}>
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

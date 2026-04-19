'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Inbox } from 'lucide-react';

interface TimelineEvent {
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  provider_welcome: 'Bienvenida proveedor',
  provider_service_approved: 'Servicio aprobado',
  provider_service_rejected: 'Servicio rechazado',
  provider_service_needs_revision: 'Servicio requiere revision',
  provider_new_booking: 'Nueva reserva (proveedor)',
  provider_booking_accepted: 'Reserva aceptada (proveedor)',
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
  client_payment_authorized: 'Pago autorizado',
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function PorReservaTab() {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setEvents([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({ limit: '100' });
      const isUUID = UUID_REGEX.test(searchQuery.trim());

      if (isUUID) {
        params.set('booking_id', searchQuery.trim());
      } else {
        params.set('phone', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/whatsapp/messages?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('[PorReservaTab] Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      search(query);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por booking ID (UUID) o telefono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-2 bg-muted animate-pulse rounded" />
              <div className="flex-1 h-16 bg-muted animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">Busca una reserva para ver su historial</p>
          <p className="text-xs mt-1">Ingresa un booking ID o numero de telefono</p>
        </div>
      )}

      {/* No results */}
      {!loading && hasSearched && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No se encontraron mensajes</p>
          <p className="text-xs mt-1">Intenta con otro booking ID o telefono</p>
        </div>
      )}

      {/* Timeline */}
      {!loading && events.length > 0 && (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="absolute left-[-17px] top-2 w-3 h-3 rounded-full bg-primary border-2 border-background shrink-0 z-10" />

                {/* Content card */}
                <div className="flex-1 p-3 bg-muted/30 border rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString('es-MX', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[ev.status] || 'bg-gray-100'}`}
                    >
                      {ev.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      → {ev.profile?.full_name || ev.phone}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Template: {ev.template_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

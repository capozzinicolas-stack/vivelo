'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  BarChart3,
  Star,
  Package,
  CalendarCheck,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ProviderSummaryData {
  profile: {
    id: string;
    full_name: string;
    company_name: string | null;
    email: string;
    phone: string | null;
    bio: string | null;
    verified: boolean;
    commission_rate: number;
    created_at: string;
    early_adopter_ends_at: string | null;
  };
  services: {
    total: number;
    by_status: Record<string, number>;
  };
  bookings: {
    total: number;
    by_status: Record<string, number>;
    total_revenue: number;
    total_commission: number;
    net_to_provider: number;
    total_refunded: number;
    last_booking_date: string | null;
  };
  reviews: {
    count: number;
    avg_rating: number;
  };
}

interface ProviderSummaryDialogProps {
  providerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reusable dialog that fetches and displays a provider's KPI summary
 * from GET /api/admin/providers/[providerId]/summary.
 *
 * Used in:
 * - /admin-portal/dashboard/proveedores (Eye button)
 * - /admin-portal/dashboard/referidos (BarChart3 button)
 */
export function ProviderSummaryDialog({
  providerId,
  open,
  onOpenChange,
}: ProviderSummaryDialogProps) {
  const { toast } = useToast();
  const [data, setData] = useState<ProviderSummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !providerId) {
      setData(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setData(null);
      try {
        const res = await fetch(`/api/admin/providers/${providerId}/summary`);
        if (!res.ok) {
          if (!cancelled) {
            toast({
              title: 'Error',
              description: 'No se pudo cargar el resumen',
              variant: 'destructive',
            });
          }
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json as ProviderSummaryData);
      } catch {
        if (!cancelled) {
          toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, providerId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumen del proveedor
          </DialogTitle>
          <DialogDescription>
            Informacion general, servicios, reservas y desempeno.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-5">
            {/* Profile info */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-lg font-semibold">
                    {data.profile.company_name || data.profile.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{data.profile.email}</p>
                  {data.profile.phone && (
                    <p className="text-sm text-muted-foreground">{data.profile.phone}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {data.profile.verified ? (
                    <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                  ) : (
                    <Badge variant="outline">No verificado</Badge>
                  )}
                  {data.profile.early_adopter_ends_at &&
                    new Date(data.profile.early_adopter_ends_at).getTime() > Date.now() && (
                      <Badge className="bg-amber-100 text-amber-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Early Adopter
                      </Badge>
                    )}
                  <p className="text-xs text-muted-foreground">
                    Comision: {(data.profile.commission_rate * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Miembro desde{' '}
                    {new Date(data.profile.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
              {data.profile.bio && (
                <p className="text-sm text-muted-foreground border-t pt-2">
                  {data.profile.bio}
                </p>
              )}
            </div>

            {/* KPI grid */}
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCell
                icon={<Package className="h-4 w-4" />}
                label="Servicios totales"
                value={String(data.services.total)}
              />
              <SummaryCell
                icon={<CalendarCheck className="h-4 w-4" />}
                label="Reservas totales"
                value={String(data.bookings.total)}
              />
              <SummaryCell
                icon={<Star className="h-4 w-4" />}
                label="Resenas"
                value={
                  data.reviews.count > 0
                    ? `${data.reviews.avg_rating.toFixed(1)} (${data.reviews.count})`
                    : '—'
                }
              />
              <SummaryCell
                icon={<DollarSign className="h-4 w-4" />}
                label="Ingresos brutos"
                value={`$${data.bookings.total_revenue.toLocaleString('es-MX')}`}
              />
            </div>

            {/* Services breakdown */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Servicios por estado
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.services.by_status).map(([status, count]) => (
                  <Badge key={status} variant="outline" className="text-xs">
                    {status}: {count}
                  </Badge>
                ))}
                {data.services.total === 0 && (
                  <p className="text-sm text-muted-foreground">Sin servicios.</p>
                )}
              </div>
            </div>

            {/* Bookings breakdown */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Reservas por estado
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.bookings.by_status).map(([status, count]) => (
                  <Badge key={status} variant="outline" className="text-xs">
                    {status}: {count}
                  </Badge>
                ))}
                {data.bookings.total === 0 && (
                  <p className="text-sm text-muted-foreground">Sin reservas.</p>
                )}
              </div>
            </div>

            {/* Financial summary */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Resumen financiero
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="flex justify-between border rounded-md px-3 py-2">
                  <span className="text-muted-foreground">Ingresos brutos</span>
                  <span className="font-semibold">
                    ${data.bookings.total_revenue.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="flex justify-between border rounded-md px-3 py-2">
                  <span className="text-muted-foreground">Comision Vivelo</span>
                  <span className="font-semibold">
                    ${data.bookings.total_commission.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="flex justify-between border rounded-md px-3 py-2">
                  <span className="text-muted-foreground">Neto al proveedor</span>
                  <span className="font-semibold text-green-700">
                    ${data.bookings.net_to_provider.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="flex justify-between border rounded-md px-3 py-2">
                  <span className="text-muted-foreground">Reembolsos</span>
                  <span className="font-semibold text-amber-700">
                    ${data.bookings.total_refunded.toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
              {data.bookings.last_booking_date && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ultima reserva:{' '}
                  {new Date(data.bookings.last_booking_date).toLocaleDateString('es-MX')}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

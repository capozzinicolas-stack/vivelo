'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { getServicesByProvider } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Share2, Pencil, Play, Pause, Trash2, CalendarDays, Percent, Tag, Copy, Check, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PromotionFormDialog } from '@/components/dashboard/promotion-form-dialog';
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, PROVIDER_PROMO_LIMITS } from '@/lib/constants';
import type { Campaign, Service } from '@/types/database';

type PromotionWithSubs = Omit<Campaign, 'subscriptions'> & {
  subscriptions?: Array<{
    id: string;
    service_id: string;
    service?: { id: string; title: string; slug: string; images: string[] | null; base_price: number };
  }>;
};

export default function ProviderPromocionesPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<PromotionWithSubs[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionWithSubs | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionWithSubs | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [promosRes, svcs] = await Promise.all([
        fetch('/api/provider/promotions').then(r => r.json()),
        getServicesByProvider(user.id),
      ]);
      setPromotions(promosRes.promotions || []);
      setServices(svcs);
    } catch (err) {
      console.error('[Promociones] load error:', err);
      toast({ title: 'Error cargando promociones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, loadData]);

  const activeCount = useMemo(() => promotions.filter(p => p.status === 'active').length, [promotions]);
  const canCreate = activeCount < PROVIDER_PROMO_LIMITS.MAX_ACTIVE_PROMOS_PER_PROVIDER;

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (promo: PromotionWithSubs) => {
    setEditing(promo);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (promo: PromotionWithSubs) => {
    const nextStatus = promo.status === 'active' ? 'cancelled' : 'active';
    try {
      const res = await fetch(`/api/provider/promotions/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando estado');
      toast({ title: nextStatus === 'active' ? 'Promocion activada' : 'Promocion pausada' });
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/provider/promotions/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error eliminando');
      toast({
        title: data.soft_cancelled ? 'Promocion cancelada' : 'Promocion eliminada',
        description: data.soft_cancelled
          ? 'Ya habia sido usada, se marco como cancelada.'
          : undefined,
      });
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    }
  };

  const buildShareUrl = (promo: PromotionWithSubs): string => {
    const firstSub = promo.subscriptions?.[0];
    const slug = firstSub?.service?.slug || firstSub?.service_id || '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://solovivelo.com';
    return `${base}/servicios/${slug}?coupon=${promo.coupon_code}`;
  };

  const handleCopyShareUrl = async (promo: PromotionWithSubs) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(promo));
      setCopiedId(promo.id);
      toast({ title: 'Link copiado' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mis Promociones</h1>
          <p className="text-sm text-muted-foreground">
            Crea cupones para promocionar tus servicios. Tu absorbes el 100% del descuento.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={!canCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Crear promocion
        </Button>
      </div>

      <Card className="bg-deep-purple/5 border-deep-purple/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-deep-purple shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">
              {activeCount} / {PROVIDER_PROMO_LIMITS.MAX_ACTIVE_PROMOS_PER_PROVIDER} promociones activas
            </p>
            <p className="text-muted-foreground">
              El descuento lo absorbe tu 100% — la comision de Vivelo no cambia.
              Comparte el link del cupon en tus redes para atraer mas clientes.
            </p>
          </div>
        </CardContent>
      </Card>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aun no tienes promociones. Crea la primera para empezar a compartir cupones.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promotions.map(promo => {
            const shareUrl = buildShareUrl(promo);
            const usedCount = promo.used_count ?? 0;
            const usageLimit = promo.usage_limit;
            const isActive = promo.status === 'active';
            return (
              <Card key={promo.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{promo.external_name}</span>
                        <Badge className={CAMPAIGN_STATUS_COLORS[promo.status]}>
                          {CAMPAIGN_STATUS_LABELS[promo.status]}
                        </Badge>
                      </CardTitle>
                      {promo.description && (
                        <CardDescription className="mt-1">{promo.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <code className="hidden sm:block text-xs font-mono bg-muted px-2 py-1 rounded">
                        {promo.coupon_code}
                      </code>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-semibold">
                        {promo.discount_pct}% OFF
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(promo.start_date).toLocaleDateString('es-MX')} - {new Date(promo.end_date).toLocaleDateString('es-MX')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      Usos: {usedCount}{usageLimit ? ` / ${usageLimit}` : ''}
                    </div>
                    <div className="sm:hidden flex items-center gap-1 font-mono">
                      <Tag className="h-3.5 w-3.5" />
                      {promo.coupon_code}
                    </div>
                  </div>

                  {promo.subscriptions && promo.subscriptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {promo.subscriptions.map(sub => (
                        <Badge key={sub.id} variant="secondary" className="text-xs">
                          {sub.service?.title || 'Servicio'}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopyShareUrl(promo)}>
                      {copiedId === promo.id ? (
                        <><Check className="h-3.5 w-3.5 mr-1 text-green-600" /> Copiado</>
                      ) : (
                        <><Share2 className="h-3.5 w-3.5 mr-1" /> Compartir link</>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(promo)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {promo.status !== 'ended' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(promo)}
                        disabled={!isActive && !canCreate}
                      >
                        {isActive ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pausar</> : <><Play className="h-3.5 w-3.5 mr-1" /> Activar</>}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(promo)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>

                  <div className="rounded bg-muted/50 p-2 flex items-center gap-2">
                    <code className="text-xs break-all flex-1 text-muted-foreground">{shareUrl}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyShareUrl(promo)} aria-label="Copiar link">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PromotionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        services={services}
        editing={editing}
        onSaved={loadData}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar promocion</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (deleteTarget.used_count ?? 0) > 0
                ? 'Esta promocion ya fue usada por clientes, asi que se marcara como cancelada (no se eliminara del historial).'
                : 'Esta accion eliminara permanentemente la promocion. ¿Continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteTarget && (deleteTarget.used_count ?? 0) > 0 ? 'Cancelar promocion' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

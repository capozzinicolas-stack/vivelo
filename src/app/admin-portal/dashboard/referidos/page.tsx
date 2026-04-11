'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  Eye,
  Gift,
  UserPlus,
  Clock,
  RotateCcw,
  Trophy,
  X,
  BarChart3,
  Star,
  Package,
  CalendarCheck,
  DollarSign,
} from 'lucide-react';
import {
  REFERRAL_BENEFIT_LABELS,
  REFERRAL_BENEFIT_STATUS_LABELS,
  REFERRAL_BENEFIT_STATUS_COLORS,
  REFERRAL_REWARD_STATUS_LABELS,
  REFERRAL_REWARD_STATUS_COLORS,
} from '@/lib/constants';
import type {
  ReferralReward,
  ProviderReferralBenefit,
  ReferralTierSummary,
} from '@/types/database';

interface ProviderRow {
  provider_id: string;
  provider_name: string;
  provider_email: string;
  early_adopter_ends_at: string | null;
  is_early_adopter: boolean;
  active_referral_count: number;
  pending_referral_count: number;
  current_tier: 0 | 1 | 2 | 3;
  total_benefits: number;
  total_sales_granted: number;
  total_sales_consumed: number;
  total_sales_remaining: number;
  created_at: string;
}

interface ProviderDetailData {
  profile: {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string | null;
    early_adopter_ends_at: string | null;
  };
  referral_code: { code: string } | null;
  rewards: Array<ReferralReward & { referred_provider: { id: string; full_name: string | null; email: string | null; company_name: string | null } | null }>;
  benefits: ProviderReferralBenefit[];
  summary: ReferralTierSummary;
}

interface ProviderSummaryData {
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

const tierColors: Record<0 | 1 | 2 | 3, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-amber-100 text-amber-800',
  2: 'bg-purple-100 text-purple-800',
  3: 'bg-gradient-to-r from-gold/30 to-amber-200 text-amber-900',
};

const tierLabels: Record<0 | 1 | 2 | 3, string> = {
  0: 'Sin nivel',
  1: 'Nivel 1',
  2: 'Nivel 2',
  3: 'Nivel 3',
};

export default function AdminReferidosPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | '0' | '1' | '2' | '3'>('all');

  // Detail dialog
  const [selected, setSelected] = useState<ProviderRow | null>(null);
  const [detail, setDetail] = useState<ProviderDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignReferrerId, setAssignReferrerId] = useState('');
  const [assignReferredId, setAssignReferredId] = useState('');
  const [assignActivate, setAssignActivate] = useState(false);
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Early adopter dialog
  const [eaTarget, setEaTarget] = useState<ProviderRow | null>(null);
  const [eaDate, setEaDate] = useState('');
  const [eaLoading, setEaLoading] = useState(false);

  // Provider summary dialog
  const [summaryTarget, setSummaryTarget] = useState<ProviderRow | null>(null);
  const [summaryData, setSummaryData] = useState<ProviderSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referrals');
      if (res.ok) {
        const { data } = await res.json();
        setProviders(data || []);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la lista', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const loadDetail = async (providerId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals/${providerId}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data as ProviderDetailData);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el detalle', variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (row: ProviderRow) => {
    setSelected(row);
    setDetail(null);
    loadDetail(row.provider_id);
  };

  const filtered = providers.filter(p => {
    const matchesSearch = !search ||
      p.provider_name.toLowerCase().includes(search.toLowerCase()) ||
      p.provider_email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 'all' || p.current_tier === parseInt(tierFilter);
    return matchesSearch && matchesTier;
  });

  const handleAssign = async () => {
    if (!assignReferrerId || !assignReferredId) {
      toast({ title: 'Campos requeridos', description: 'Completa ambos IDs', variant: 'destructive' });
      return;
    }
    setAssignLoading(true);
    try {
      const res = await fetch('/api/admin/referrals/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: assignReferrerId.trim(),
          referredId: assignReferredId.trim(),
          activate: assignActivate,
          adminNotes: assignNotes || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Referido creado', description: 'Se asigno correctamente' });
        setAssignOpen(false);
        setAssignReferrerId('');
        setAssignReferredId('');
        setAssignActivate(false);
        setAssignNotes('');
        loadProviders();
      } else {
        const { error } = await res.json();
        toast({ title: 'Error', description: error || 'No se pudo asignar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleOpenSummary = async (row: ProviderRow) => {
    setSummaryTarget(row);
    setSummaryData(null);
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${row.provider_id}/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data as ProviderSummaryData);
      } else {
        toast({ title: 'Error', description: 'No se pudo cargar el resumen', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSaveEarlyAdopter = async () => {
    if (!eaTarget) return;
    setEaLoading(true);
    try {
      const payload: Record<string, unknown> = { providerId: eaTarget.provider_id };
      payload.earlyAdopterEndsAt = eaDate ? new Date(eaDate).toISOString() : null;

      const res = await fetch('/api/admin/referrals/early-adopter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: 'Actualizado', description: 'Early Adopter guardado' });
        setEaTarget(null);
        setEaDate('');
        loadProviders();
      } else {
        const { error } = await res.json();
        toast({ title: 'Error', description: error || 'No se pudo guardar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
    } finally {
      setEaLoading(false);
    }
  };

  const handleUpdateReward = async (rewardId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/referrals/rewards/${rewardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: 'Actualizado', description: 'Estado cambiado' });
        if (selected) loadDetail(selected.provider_id);
        loadProviders();
      } else {
        const { error } = await res.json();
        toast({ title: 'Error', description: error || 'No se pudo actualizar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
    }
  };

  const handleUpdateBenefit = async (
    benefitId: string,
    updates: { salesConsumed?: number; status?: string }
  ) => {
    try {
      const res = await fetch(`/api/admin/referrals/benefits/${benefitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast({ title: 'Actualizado', description: 'Beneficio modificado' });
        if (selected) loadDetail(selected.provider_id);
        loadProviders();
      } else {
        const { error } = await res.json();
        toast({ title: 'Error', description: error || 'No se pudo actualizar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
    }
  };

  const activeCount = providers.filter(p => p.active_referral_count > 0).length;
  const totalActive = providers.reduce((s, p) => s + p.active_referral_count, 0);
  const totalPending = providers.reduce((s, p) => s + p.pending_referral_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-gold" />
            Referidos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion de referidos proveedor a proveedor y beneficios por niveles.
          </p>
        </div>
        <Button onClick={() => setAssignOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Asignar manualmente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Proveedores con referidos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Referidos activados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{totalPending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total proveedores</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{providers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tierFilter} onValueChange={v => setTierFilter(v as 'all' | '0' | '1' | '2' | '3')}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="0">Sin nivel</SelectItem>
            <SelectItem value="1">Nivel 1</SelectItem>
            <SelectItem value="2">Nivel 2</SelectItem>
            <SelectItem value="3">Nivel 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay proveedores que coincidan con los filtros.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Activados</TableHead>
                  <TableHead>Pendientes</TableHead>
                  <TableHead>Beneficios</TableHead>
                  <TableHead>Early Adopter</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.provider_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.provider_name}</p>
                        <p className="text-xs text-muted-foreground">{p.provider_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={tierColors[p.current_tier]}>
                        {tierLabels[p.current_tier]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{p.active_referral_count}</TableCell>
                    <TableCell className="text-amber-700">{p.pending_referral_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.total_sales_remaining}/{p.total_sales_granted} ventas
                    </TableCell>
                    <TableCell>
                      {p.is_early_adopter ? (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Hasta {new Date(p.early_adopter_ends_at!).toLocaleDateString('es-MX')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSummary(p)}
                          aria-label="Ver resumen del proveedor"
                          title="Ver resumen del proveedor"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(p)}
                          aria-label="Ver referidos"
                          title="Ver referidos"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEaTarget(p);
                            setEaDate(
                              p.early_adopter_ends_at
                                ? new Date(p.early_adopter_ends_at).toISOString().slice(0, 10)
                                : ''
                            );
                          }}
                          aria-label="Early Adopter"
                          title="Early Adopter"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {selected?.provider_name}
            </DialogTitle>
            <DialogDescription>
              Detalle de referidos y beneficios
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid gap-3 sm:grid-cols-4">
                <SummaryCell label="Nivel" value={tierLabels[detail.summary.current_tier]} />
                <SummaryCell
                  label="Activados"
                  value={String(detail.summary.active_referral_count)}
                />
                <SummaryCell
                  label="Pendientes"
                  value={String(detail.summary.pending_referral_count)}
                />
                <SummaryCell
                  label="Codigo"
                  value={detail.referral_code?.code || '—'}
                  small
                />
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Beneficios</h3>
                {detail.benefits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin beneficios generados.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.benefits.map(b => (
                      <div key={b.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">
                              {REFERRAL_BENEFIT_LABELS[b.benefit_type] || b.benefit_type}
                            </p>
                            <Badge variant="outline" className="text-[10px]">N{b.tier_level}</Badge>
                            <Badge className={REFERRAL_BENEFIT_STATUS_COLORS[b.status]}>
                              {REFERRAL_BENEFIT_STATUS_LABELS[b.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Disparado al llegar a {b.triggered_by_referral_count} referidos · Usado {b.sales_consumed}/{b.total_sales_granted}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Input
                            type="number"
                            className="w-20 h-8 text-sm"
                            min={0}
                            max={b.total_sales_granted}
                            defaultValue={b.sales_consumed}
                            onBlur={e => {
                              const val = parseInt(e.target.value);
                              if (!Number.isNaN(val) && val !== b.sales_consumed) {
                                handleUpdateBenefit(b.id, { salesConsumed: val });
                              }
                            }}
                          />
                          {b.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBenefit(b.id, { status: 'active' })}
                            >
                              Activar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rewards */}
              <div>
                <h3 className="font-semibold text-sm mb-2">
                  Referidos ({detail.rewards.length})
                </h3>
                {detail.rewards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin referidos.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.rewards.map(r => {
                      const info = r.referred_provider;
                      return (
                        <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {info?.company_name || info?.full_name || 'Proveedor'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {info?.email || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Registrado {new Date(r.created_at).toLocaleDateString('es-MX')}
                              {r.activated_at && (
                                <> · Activado {new Date(r.activated_at).toLocaleDateString('es-MX')}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={REFERRAL_REWARD_STATUS_COLORS[r.status]}>
                              {REFERRAL_REWARD_STATUS_LABELS[r.status]}
                            </Badge>
                            {r.status === 'pending_signup' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateReward(r.id, 'active_sale')}
                              >
                                Activar
                              </Button>
                            )}
                            {r.status === 'active_sale' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateReward(r.id, 'revoked')}
                              >
                                Revocar
                              </Button>
                            )}
                            {r.status === 'revoked' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateReward(r.id, 'pending_signup')}
                                aria-label="Reabrir"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar referido manual</DialogTitle>
            <DialogDescription>
              Crea una relacion referidor → referido entre dos proveedores. Util para retroactivos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ProviderPicker
              label="Referidor (proveedor A)"
              providers={providers}
              value={assignReferrerId}
              onChange={setAssignReferrerId}
              excludeId={assignReferredId}
            />
            <ProviderPicker
              label="Referido (proveedor B)"
              providers={providers}
              value={assignReferredId}
              onChange={setAssignReferredId}
              excludeId={assignReferrerId}
            />
            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={assignNotes}
                onChange={e => setAssignNotes(e.target.value)}
                placeholder="Razon de la asignacion manual..."
                rows={2}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={assignActivate}
                onChange={e => setAssignActivate(e.target.checked)}
              />
              Activar inmediatamente (status=active_sale + recomputar beneficios)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assignLoading}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={assignLoading}>
              {assignLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Adopter dialog */}
      <Dialog open={!!eaTarget} onOpenChange={open => !open && setEaTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Early Adopter</DialogTitle>
            <DialogDescription>
              Mientras esta activo, los beneficios generados se crean como &quot;pending&quot; hasta la fecha de fin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Proveedor: <span className="font-semibold">{eaTarget?.provider_name}</span>
            </p>
            <div>
              <label className="text-sm font-medium">Fin del periodo (deja vacio para quitar)</label>
              <Input
                type="date"
                value={eaDate}
                onChange={e => setEaDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEaTarget(null)} disabled={eaLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEarlyAdopter} disabled={eaLoading}>
              {eaLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider summary dialog */}
      <Dialog open={!!summaryTarget} onOpenChange={open => !open && setSummaryTarget(null)}>
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

          {summaryLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : summaryData ? (
            <div className="space-y-5">
              {/* Profile info */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-lg font-semibold">
                      {summaryData.profile.company_name || summaryData.profile.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{summaryData.profile.email}</p>
                    {summaryData.profile.phone && (
                      <p className="text-sm text-muted-foreground">{summaryData.profile.phone}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {summaryData.profile.verified ? (
                      <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                    ) : (
                      <Badge variant="outline">No verificado</Badge>
                    )}
                    {summaryData.profile.early_adopter_ends_at &&
                      new Date(summaryData.profile.early_adopter_ends_at).getTime() > Date.now() && (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Early Adopter
                        </Badge>
                      )}
                    <p className="text-xs text-muted-foreground">
                      Comision: {(summaryData.profile.commission_rate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Miembro desde {new Date(summaryData.profile.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
                {summaryData.profile.bio && (
                  <p className="text-sm text-muted-foreground border-t pt-2">{summaryData.profile.bio}</p>
                )}
              </div>

              {/* KPI grid */}
              <div className="grid gap-3 sm:grid-cols-4">
                <SummaryCell
                  icon={<Package className="h-4 w-4" />}
                  label="Servicios totales"
                  value={String(summaryData.services.total)}
                />
                <SummaryCell
                  icon={<CalendarCheck className="h-4 w-4" />}
                  label="Reservas totales"
                  value={String(summaryData.bookings.total)}
                />
                <SummaryCell
                  icon={<Star className="h-4 w-4" />}
                  label="Resenas"
                  value={
                    summaryData.reviews.count > 0
                      ? `${summaryData.reviews.avg_rating.toFixed(1)} (${summaryData.reviews.count})`
                      : '—'
                  }
                />
                <SummaryCell
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Ingresos brutos"
                  value={`$${summaryData.bookings.total_revenue.toLocaleString('es-MX')}`}
                />
              </div>

              {/* Services breakdown */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Servicios por estado
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summaryData.services.by_status).map(([status, count]) => (
                    <Badge key={status} variant="outline" className="text-xs">
                      {status}: {count}
                    </Badge>
                  ))}
                  {summaryData.services.total === 0 && (
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
                  {Object.entries(summaryData.bookings.by_status).map(([status, count]) => (
                    <Badge key={status} variant="outline" className="text-xs">
                      {status}: {count}
                    </Badge>
                  ))}
                  {summaryData.bookings.total === 0 && (
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
                    <span className="font-semibold">${summaryData.bookings.total_revenue.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between border rounded-md px-3 py-2">
                    <span className="text-muted-foreground">Comision Vivelo</span>
                    <span className="font-semibold">${summaryData.bookings.total_commission.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between border rounded-md px-3 py-2">
                    <span className="text-muted-foreground">Neto al proveedor</span>
                    <span className="font-semibold text-green-700">${summaryData.bookings.net_to_provider.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between border rounded-md px-3 py-2">
                    <span className="text-muted-foreground">Reembolsos</span>
                    <span className="font-semibold text-amber-700">${summaryData.bookings.total_refunded.toLocaleString('es-MX')}</span>
                  </div>
                </div>
                {summaryData.bookings.last_booking_date && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Ultima reserva: {new Date(summaryData.bookings.last_booking_date).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCell({ label, value, small, icon }: { label: string; value: string; small?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className={small ? 'text-sm font-mono font-semibold mt-1' : 'text-lg font-bold mt-0.5'}>{value}</p>
    </div>
  );
}

function ProviderPicker({
  label,
  providers,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  providers: ProviderRow[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  const [query, setQuery] = useState('');
  const selected = providers.find(p => p.provider_id === value);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = !selected && normalizedQuery
    ? providers
        .filter(p => p.provider_id !== excludeId)
        .filter(p =>
          p.provider_name.toLowerCase().includes(normalizedQuery) ||
          p.provider_email.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, 8)
    : [];

  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {selected ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-2 mt-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{selected.provider_name}</p>
            <p className="text-xs text-muted-foreground truncate">{selected.provider_email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              setQuery('');
            }}
            aria-label="Quitar seleccion"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative mt-1">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o email..."
          />
          {filtered.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {filtered.map(p => (
                <button
                  key={p.provider_id}
                  type="button"
                  onClick={() => {
                    onChange(p.provider_id);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0"
                >
                  <p className="text-sm font-medium truncate">{p.provider_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.provider_email}</p>
                </button>
              ))}
            </div>
          )}
          {normalizedQuery && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Sin resultados.</p>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Gift, Users, Share2, Trophy, TrendingUp, Clock, Info } from 'lucide-react';
import { buildTierSummary, getCurrentTier } from '@/lib/referrals';
import {
  REFERRAL_BENEFIT_LABELS,
  REFERRAL_BENEFIT_STATUS_LABELS,
  REFERRAL_BENEFIT_STATUS_COLORS,
  REFERRAL_REWARD_STATUS_LABELS,
  REFERRAL_REWARD_STATUS_COLORS,
  REFERRAL_TIERS,
} from '@/lib/constants';
import type {
  ReferralCode,
  ReferralReward,
  ProviderReferralBenefit,
} from '@/types/database';

interface ReferredProviderInfo {
  id: string;
  full_name: string | null;
  email: string | null;
}

type RewardWithProvider = ReferralReward & {
  referred_provider?: ReferredProviderInfo | null;
};

export default function ProveedorReferidosPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [rewards, setRewards] = useState<RewardWithProvider[]>([]);
  const [benefits, setBenefits] = useState<ProviderReferralBenefit[]>([]);
  const [earlyAdopterEndsAt, setEarlyAdopterEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // 1. Get or create referral code (case-insensitive lookup first)
    const { data: codes } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (codes && codes.length > 0) {
      setReferralCode(codes[0] as ReferralCode);
    } else {
      const code = `VIVELO-${user.id.slice(0, 6).toUpperCase()}`;
      const { data: newCode } = await supabase
        .from('referral_codes')
        .insert({ user_id: user.id, code })
        .select()
        .single();
      if (newCode) setReferralCode(newCode as ReferralCode);
    }

    // 2. Get rewards (two-query join to avoid FK name coupling)
    const { data: rewardData } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    const baseRewards = (rewardData || []) as ReferralReward[];
    const referredIds = baseRewards.map(r => r.referred_id).filter(Boolean);
    let referredProfiles: ReferredProviderInfo[] = [];
    if (referredIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', referredIds);
      referredProfiles = (profs || []) as ReferredProviderInfo[];
    }
    const profileMap = new Map(referredProfiles.map(p => [p.id, p]));
    setRewards(
      baseRewards.map(r => ({ ...r, referred_provider: profileMap.get(r.referred_id) || null }))
    );

    // 3. Get benefits
    const { data: benefitData } = await supabase
      .from('provider_referral_benefits')
      .select('*')
      .eq('provider_id', user.id)
      .order('generated_at', { ascending: false });
    setBenefits((benefitData || []) as ProviderReferralBenefit[]);

    // 4. Get early_adopter_ends_at from profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('early_adopter_ends_at')
      .eq('id', user.id)
      .single();
    setEarlyAdopterEndsAt(
      (profileData as { early_adopter_ends_at?: string | null } | null)?.early_adopter_ends_at || null
    );

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode.code);
    toast({ title: 'Codigo copiado', description: 'Tu codigo de referido ha sido copiado al portapapeles.' });
  };

  const handleShare = () => {
    if (!referralCode) return;
    const shareUrl = `https://solovivelo.com/register?ref=${referralCode.code}&role=provider`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Vivelo - Unete como proveedor',
        text: `Unete a Vivelo como proveedor con mi codigo ${referralCode.code}!`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copiado', description: 'El enlace de referido ha sido copiado.' });
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copiado', description: 'El enlace de referido ha sido copiado.' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  }

  // Tier summary computed from live data
  const summary = buildTierSummary(rewards, benefits);
  const currentTier = getCurrentTier(summary.active_referral_count);

  // Calculate progress to next tier
  let nextTierLabel = '';
  let nextTierProgress = 100;
  let referralsNeeded = 0;

  if (currentTier === 0) {
    nextTierLabel = `Nivel 1 (1 referido activado)`;
    nextTierProgress = 0;
    referralsNeeded = REFERRAL_TIERS.LEVEL_1_MIN_REFERRALS - summary.active_referral_count;
  } else if (currentTier === 1) {
    nextTierLabel = `Nivel 2 (${REFERRAL_TIERS.LEVEL_2_MIN_REFERRALS} referidos activados)`;
    nextTierProgress = Math.round(
      (summary.active_referral_count / REFERRAL_TIERS.LEVEL_2_MIN_REFERRALS) * 100
    );
    referralsNeeded = REFERRAL_TIERS.LEVEL_2_MIN_REFERRALS - summary.active_referral_count;
  } else if (currentTier === 2) {
    const nextMultiple = REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS;
    nextTierLabel = `Nivel 3 (${nextMultiple} referidos activados)`;
    nextTierProgress = Math.round((summary.active_referral_count / nextMultiple) * 100);
    referralsNeeded = nextMultiple - summary.active_referral_count;
  } else {
    // Tier 3 — next milestone is next multiple of 8
    const currentBucket = Math.floor(summary.active_referral_count / REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS);
    const nextMilestone = (currentBucket + 1) * REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS;
    nextTierLabel = `Siguiente recompensa en ${nextMilestone} referidos`;
    const prevMilestone = currentBucket * REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS;
    const denom = REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS;
    nextTierProgress = Math.round(
      ((summary.active_referral_count - prevMilestone) / denom) * 100
    );
    referralsNeeded = nextMilestone - summary.active_referral_count;
  }

  const isEarlyAdopter = earlyAdopterEndsAt && new Date(earlyAdopterEndsAt).getTime() > Date.now();

  const tierLabels: Record<0 | 1 | 2 | 3, string> = {
    0: 'Sin nivel',
    1: 'Nivel 1',
    2: 'Nivel 2',
    3: 'Nivel 3',
  };

  const tierColors: Record<0 | 1 | 2 | 3, string> = {
    0: 'bg-gray-100 text-gray-700',
    1: 'bg-amber-100 text-amber-800',
    2: 'bg-purple-100 text-purple-800',
    3: 'bg-gradient-to-r from-gold/30 to-amber-200 text-amber-900',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programa de Referidos para Proveedores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invita a otros proveedores y gana beneficios en tu comision cuando completen su primera venta.
        </p>
      </div>

      {/* Referral code card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-gold" />
            Tu Codigo de Referido
          </CardTitle>
          <CardDescription>
            Comparte tu codigo con otros proveedores. Cuando se registren y completen su primera venta, tu avanzas de nivel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode && (
            <>
              <div className="flex gap-2">
                <Input
                  value={referralCode.code}
                  readOnly
                  className="font-mono text-lg font-bold text-center"
                />
                <Button variant="outline" size="icon" onClick={handleCopyCode} aria-label="Copiar codigo">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare} aria-label="Compartir codigo">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link: <span className="font-mono">solovivelo.com/register?ref={referralCode.code}&role=provider</span>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tier summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Trophy className="h-4 w-4" /> Nivel actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={tierColors[currentTier]}>{tierLabels[currentTier]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentTier === 0 && 'Consigue tu primer referido activado para desbloquear beneficios.'}
              {currentTier === 1 && '1-3 referidos activados. 3 ventas con 50% off en comision.'}
              {currentTier === 2 && '4+ referidos activados. 3 ventas adicionales con 75% off.'}
              {currentTier === 3 && 'Maximo nivel: 75% off + 3 meses de prioridad cada 8 referidos.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Referidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.active_referral_count}</p>
            <p className="text-xs text-muted-foreground">
              activados
              {summary.pending_referral_count > 0 && (
                <> · <span className="text-amber-700">{summary.pending_referral_count} pendientes</span></>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Progreso al siguiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar value={Math.max(0, Math.min(100, nextTierProgress))} />
            <p className="text-xs text-muted-foreground mt-2">
              {referralsNeeded > 0
                ? `Faltan ${referralsNeeded} para ${nextTierLabel}`
                : nextTierLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Early adopter notice */}
      {isEarlyAdopter && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Eres Early Adopter</p>
            <p className="text-amber-800 mt-1">
              Tus beneficios de referidos se activaran automaticamente cuando termine el periodo Early Adopter
              {' '}({new Date(earlyAdopterEndsAt!).toLocaleDateString('es-MX')}). Mientras tanto aparecen como &quot;Pendientes&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Benefits breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Mis beneficios</CardTitle>
          <CardDescription>
            Ventas con descuento en comision generadas por tus referidos. La aplicacion de los beneficios en cada reserva la realiza el equipo Vivelo de forma manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {benefits.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Aun no tienes beneficios generados. Consigue tu primer referido activado para desbloquearlos.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryMini
                  label="Ventas 50% off"
                  total={summary.total_sales_50_off}
                  remaining={summary.sales_50_off_remaining}
                />
                <SummaryMini
                  label="Ventas 75% off"
                  total={summary.total_sales_75_off}
                  remaining={summary.sales_75_off_remaining}
                />
                <SummaryMini
                  label="Meses prioridad"
                  total={summary.total_priority_months}
                  remaining={summary.priority_months_remaining}
                />
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">DETALLE POR BENEFICIO</p>
                <div className="space-y-2">
                  {benefits.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {REFERRAL_BENEFIT_LABELS[b.benefit_type] || b.benefit_type}
                          </p>
                          <Badge variant="outline" className="text-[10px]">Nivel {b.tier_level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Activado al llegar a {b.triggered_by_referral_count}{' '}
                          {b.triggered_by_referral_count === 1 ? 'referido' : 'referidos'} ·{' '}
                          {b.sales_consumed}/{b.total_sales_granted} usado
                        </p>
                      </div>
                      <Badge className={REFERRAL_BENEFIT_STATUS_COLORS[b.status] || 'bg-gray-100'}>
                        {REFERRAL_BENEFIT_STATUS_LABELS[b.status] || b.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referrals list */}
      <Card>
        <CardHeader>
          <CardTitle>Mis referidos</CardTitle>
          <CardDescription>
            Proveedores que se registraron con tu codigo. Un referido cuenta al completar su primera venta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Aun no tienes referidos. Comparte tu codigo para empezar.
            </p>
          ) : (
            <div className="space-y-2">
              {rewards.map(r => {
                const info = r.referred_provider;
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {info?.full_name || 'Proveedor'}
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
                    <Badge className={REFERRAL_REWARD_STATUS_COLORS[r.status] || 'bg-gray-100'}>
                      {REFERRAL_REWARD_STATUS_LABELS[r.status] || r.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual application disclaimer */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Como se aplican los beneficios</p>
          <p className="mt-1">
            En esta version, el equipo Vivelo aplica tus beneficios manualmente al liquidar tus ventas.
            Cuando consumas una venta con 50% o 75% off, veras aqui la actualizacion en el contador
            &quot;Usado&quot;. Para dudas sobre una liquidacion especifica contacta a soporte.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryMini({ label, total, remaining }: { label: string; total: number; remaining: number }) {
  const consumed = total - remaining;
  const pct = total > 0 ? Math.round((consumed / total) * 100) : 0;
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">
        {remaining}
        <span className="text-sm font-normal text-muted-foreground"> / {total}</span>
      </p>
      <ProgressBar value={pct} size="sm" />
    </div>
  );
}

function ProgressBar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const heightClass = size === 'sm' ? 'h-1' : 'h-2';
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${heightClass}`}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

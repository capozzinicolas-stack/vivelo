/**
 * Provider Referrals V2 — pure logic
 *
 * Rules derived from T&C section 2.4 (Programa de Referidos para Proveedores):
 *
 * Nivel 1 (1-3 referidos activados): 3 ventas con 50% off comision
 * Nivel 2 (4+ referidos): +3 ventas adicionales con 75% off comision
 * Nivel 3 (cada multiplo de 8 referidos): +3 ventas con 75% off + 3 meses de prioridad
 *
 * Regla: se cuentan solo referidos ACTIVADOS (status='active_sale' = completaron primera venta)
 * Regla: beneficios se acumulan, no se reemplazan (chronological order)
 * Regla: Early Adopter retrasa activacion (benefits pending hasta vencer)
 */

import { REFERRAL_TIERS } from './constants';
import type {
  ProviderBenefitType,
  ProviderReferralBenefit,
  ReferralReward,
  ReferralTierSummary,
} from '@/types/database';

// ─── Types ───────────────────────────────────────────────

export interface ExpectedBenefit {
  benefit_type: ProviderBenefitType;
  tier_level: 1 | 2 | 3;
  triggered_by_referral_count: number;
  total_sales_granted: number;
}

// ─── Pure functions ──────────────────────────────────────

/**
 * Determines the current tier based on activated referral count.
 */
export function getCurrentTier(activeReferralCount: number): 0 | 1 | 2 | 3 {
  if (activeReferralCount >= REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS) return 3;
  if (activeReferralCount >= REFERRAL_TIERS.LEVEL_2_MIN_REFERRALS) return 2;
  if (activeReferralCount >= REFERRAL_TIERS.LEVEL_1_MIN_REFERRALS) return 1;
  return 0;
}

/**
 * Computes the full list of benefits the provider SHOULD have based on their
 * active referral count. Each benefit is tagged with the specific
 * `triggered_by_referral_count` so it can be idempotently deduplicated against
 * the DB via the unique index on (provider_id, benefit_type, triggered_by_referral_count).
 *
 * Returns benefits in chronological order (smallest trigger count first).
 *
 * Logic:
 * - Level 1: triggered exactly at 1 referral → 3 sales 50% off
 * - Level 2: triggered exactly at 4 referrals → 3 sales 75% off
 * - Level 3: triggered at 8, 16, 24, ... → each gives 3 sales 75% off + 3 priority months
 */
export function computeExpectedBenefits(activeReferralCount: number): ExpectedBenefit[] {
  const benefits: ExpectedBenefit[] = [];

  if (activeReferralCount >= REFERRAL_TIERS.LEVEL_1_MIN_REFERRALS) {
    benefits.push({
      benefit_type: 'commission_50_off',
      tier_level: 1,
      triggered_by_referral_count: REFERRAL_TIERS.LEVEL_1_MIN_REFERRALS,
      total_sales_granted: REFERRAL_TIERS.LEVEL_1_SALES,
    });
  }

  if (activeReferralCount >= REFERRAL_TIERS.LEVEL_2_MIN_REFERRALS) {
    benefits.push({
      benefit_type: 'commission_75_off',
      tier_level: 2,
      triggered_by_referral_count: REFERRAL_TIERS.LEVEL_2_MIN_REFERRALS,
      total_sales_granted: REFERRAL_TIERS.LEVEL_2_SALES,
    });
  }

  // Level 3: every multiple of 8 referrals unlocks a new batch
  const multiplesOf8 = Math.floor(activeReferralCount / REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS);
  for (let i = 1; i <= multiplesOf8; i++) {
    const triggerCount = i * REFERRAL_TIERS.LEVEL_3_EVERY_N_REFERRALS;
    benefits.push({
      benefit_type: 'commission_75_off',
      tier_level: 3,
      triggered_by_referral_count: triggerCount,
      total_sales_granted: REFERRAL_TIERS.LEVEL_3_SALES,
    });
    benefits.push({
      benefit_type: 'priority_placement_3m',
      tier_level: 3,
      triggered_by_referral_count: triggerCount,
      total_sales_granted: REFERRAL_TIERS.LEVEL_3_PRIORITY_MONTHS,
    });
  }

  return benefits;
}

/**
 * Diff between expected benefits (from tier rules) and existing ones in DB.
 * Returns only the benefits that must be inserted (idempotent operation).
 */
export function diffBenefitsToInsert(
  expected: ExpectedBenefit[],
  existing: Pick<ProviderReferralBenefit, 'benefit_type' | 'triggered_by_referral_count'>[]
): ExpectedBenefit[] {
  const existingKeys = new Set(
    existing.map(b => `${b.benefit_type}::${b.triggered_by_referral_count}`)
  );
  return expected.filter(
    b => !existingKeys.has(`${b.benefit_type}::${b.triggered_by_referral_count}`)
  );
}

/**
 * Aggregates the tier summary for display in dashboards.
 */
export function buildTierSummary(
  rewards: Pick<ReferralReward, 'status'>[],
  benefits: Pick<ProviderReferralBenefit, 'benefit_type' | 'total_sales_granted' | 'sales_consumed'>[]
): ReferralTierSummary {
  const activeCount = rewards.filter(r => r.status === 'active_sale').length;
  const pendingCount = rewards.filter(r => r.status === 'pending_signup').length;
  const currentTier = getCurrentTier(activeCount);

  let total50 = 0;
  let consumed50 = 0;
  let total75 = 0;
  let consumed75 = 0;
  let totalPriority = 0;
  let consumedPriority = 0;

  for (const b of benefits) {
    if (b.benefit_type === 'commission_50_off') {
      total50 += b.total_sales_granted;
      consumed50 += b.sales_consumed;
    } else if (b.benefit_type === 'commission_75_off') {
      total75 += b.total_sales_granted;
      consumed75 += b.sales_consumed;
    } else if (b.benefit_type === 'priority_placement_3m') {
      totalPriority += b.total_sales_granted;
      consumedPriority += b.sales_consumed;
    }
  }

  return {
    active_referral_count: activeCount,
    pending_referral_count: pendingCount,
    current_tier: currentTier,
    total_sales_50_off: total50,
    total_sales_75_off: total75,
    total_priority_months: totalPriority,
    sales_50_off_remaining: Math.max(0, total50 - consumed50),
    sales_75_off_remaining: Math.max(0, total75 - consumed75),
    priority_months_remaining: Math.max(0, totalPriority - consumedPriority),
  };
}

/**
 * Generates the initial benefit status based on the provider's Early Adopter flag.
 * If provider is currently in Early Adopter program, benefits start as 'pending'
 * (activated when Early Adopter ends). Otherwise, start as 'active' immediately.
 */
export function initialBenefitStatus(earlyAdopterEndsAt: string | null): 'pending' | 'active' {
  if (!earlyAdopterEndsAt) return 'active';
  const endsAt = new Date(earlyAdopterEndsAt).getTime();
  const now = Date.now();
  return endsAt > now ? 'pending' : 'active';
}

import { COMMISSION_RATE } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

/**
 * @deprecated Commission is now per-category, not per-provider.
 * Use getCategoryCommissionRate() instead.
 * Kept for backwards compatibility — returns COMMISSION_RATE constant without querying.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getProviderCommissionRate(_providerId: string): Promise<number> {
  return COMMISSION_RATE;
}

/**
 * Get the commission rate for a service category.
 * Falls back to the global COMMISSION_RATE constant if not found or on error.
 */
export async function getCategoryCommissionRate(categorySlug: string): Promise<number> {
  const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true;
  if (isMockMode) return COMMISSION_RATE;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('service_categories')
      .select('commission_rate')
      .eq('slug', categorySlug)
      .single();

    if (error || data?.commission_rate == null) return COMMISSION_RATE;
    return Number(data.commission_rate);
  } catch {
    return COMMISSION_RATE;
  }
}

/**
 * Calculate the weighted average commission rate for a provider's services.
 * Weight = number of active services per category.
 * @param services - array of services with { category: string }
 * @param categoryRates - map of category slug to commission rate
 */
export function calculateWeightedAvgCommission(
  services: { category: string }[],
  categoryRates: Record<string, number>
): number {
  if (services.length === 0) return COMMISSION_RATE;

  const totalWeight = services.length;
  const weightedSum = services.reduce((sum, svc) => {
    const rate = categoryRates[svc.category] ?? COMMISSION_RATE;
    return sum + rate;
  }, 0);

  return weightedSum / totalWeight;
}

/**
 * Calculate the commission amount for a given total and rate.
 * Rounds to 2 decimal places (MXN centavos).
 */
export function calculateCommission(total: number, rate: number): number {
  return Math.round(total * rate * 100) / 100;
}

import { COMMISSION_RATE } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

/**
 * Get the effective commission rate for a provider.
 * Falls back to the global COMMISSION_RATE constant if not set or on error.
 */
export async function getProviderCommissionRate(providerId: string): Promise<number> {
  const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true;
  if (isMockMode) return COMMISSION_RATE;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('commission_rate')
      .eq('id', providerId)
      .single();

    if (error || !data?.commission_rate) return COMMISSION_RATE;
    return Number(data.commission_rate);
  } catch {
    return COMMISSION_RATE;
  }
}

/**
 * Calculate the commission amount for a given total and rate.
 * Rounds to 2 decimal places (MXN centavos).
 */
export function calculateCommission(total: number, rate: number): number {
  return Math.round(total * rate * 100) / 100;
}

import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getCurrentTier } from '@/lib/referrals';

/**
 * GET /api/admin/referrals
 *
 * Returns a list of providers with referral activity (their own code OR received referrals).
 * Aggregates per-provider:
 *  - active_referral_count (status='active_sale')
 *  - pending_referral_count (status='pending_signup')
 *  - current_tier (derived)
 *  - total_benefits, total_sales_granted, total_sales_consumed
 *  - early_adopter_ends_at
 *
 * Only providers are included (V1 scope: provider-to-provider).
 */
export async function GET() {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const supabase = createAdminSupabaseClient();

  // Fetch all provider profiles with relevant fields
  const { data: providers, error: providersError } = await supabase
    .from('profiles')
    .select('id, full_name, company_name, email, role, early_adopter_ends_at, created_at')
    .eq('role', 'provider')
    .order('created_at', { ascending: false });

  if (providersError) {
    console.error('[Admin Referrals] Error listing providers:', providersError);
    return NextResponse.json({ error: 'Error al listar proveedores' }, { status: 500 });
  }

  const providerIds = (providers || []).map(p => p.id);
  if (providerIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Fetch rewards where referrer is any of the providers
  const { data: allRewards } = await supabase
    .from('referral_rewards')
    .select('id, referrer_id, referred_id, status')
    .in('referrer_id', providerIds);

  // Fetch benefits for all providers
  const { data: allBenefits } = await supabase
    .from('provider_referral_benefits')
    .select('id, provider_id, benefit_type, total_sales_granted, sales_consumed, status')
    .in('provider_id', providerIds);

  // Aggregate per provider
  const records = (providers || []).map(p => {
    const rewards = (allRewards || []).filter(r => r.referrer_id === p.id);
    const benefits = (allBenefits || []).filter(b => b.provider_id === p.id);

    const activeCount = rewards.filter(r => r.status === 'active_sale').length;
    const pendingCount = rewards.filter(r => r.status === 'pending_signup').length;

    const totalSalesGranted = benefits.reduce((sum, b) => sum + (b.total_sales_granted || 0), 0);
    const totalSalesConsumed = benefits.reduce((sum, b) => sum + (b.sales_consumed || 0), 0);

    const profile = p as unknown as {
      id: string;
      full_name: string | null;
      company_name: string | null;
      email: string | null;
      early_adopter_ends_at: string | null;
      created_at: string;
    };

    return {
      provider_id: profile.id,
      provider_name: profile.company_name || profile.full_name || 'Sin nombre',
      provider_email: profile.email || '',
      early_adopter_ends_at: profile.early_adopter_ends_at,
      is_early_adopter:
        !!profile.early_adopter_ends_at &&
        new Date(profile.early_adopter_ends_at).getTime() > Date.now(),
      active_referral_count: activeCount,
      pending_referral_count: pendingCount,
      current_tier: getCurrentTier(activeCount),
      total_benefits: benefits.length,
      total_sales_granted: totalSalesGranted,
      total_sales_consumed: totalSalesConsumed,
      total_sales_remaining: Math.max(0, totalSalesGranted - totalSalesConsumed),
      created_at: profile.created_at,
    };
  });

  // Sort by active referrals descending, then by tier
  records.sort((a, b) => b.active_referral_count - a.active_referral_count);

  return NextResponse.json({ data: records });
}

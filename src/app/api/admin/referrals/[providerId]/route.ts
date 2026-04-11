import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { buildTierSummary } from '@/lib/referrals';
import type { ReferralReward, ProviderReferralBenefit } from '@/types/database';

/**
 * GET /api/admin/referrals/[providerId]
 *
 * Returns detail for a single provider:
 * - profile info (name, email, early_adopter_ends_at)
 * - referral code
 * - rewards as referrer (with referred provider info)
 * - benefits
 * - tier summary
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { providerId } = await params;
  const supabase = createAdminSupabaseClient();

  // Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, company_name, email, role, early_adopter_ends_at, created_at')
    .eq('id', providerId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  }

  // Referral code
  const { data: codeData } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', providerId)
    .eq('is_active', true)
    .maybeSingle();

  // Rewards as referrer
  const { data: rewardsData } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('referrer_id', providerId)
    .order('created_at', { ascending: false });

  const rewards = rewardsData || [];
  const referredIds = rewards.map(r => (r as { referred_id: string }).referred_id);

  // Fetch referred providers info
  let referredProfiles: Array<{ id: string; full_name: string | null; email: string | null; company_name: string | null }> = [];
  if (referredIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_name')
      .in('id', referredIds);
    referredProfiles = (profs || []) as typeof referredProfiles;
  }
  const profileMap = new Map(referredProfiles.map(p => [p.id, p]));

  const rewardsWithInfo = rewards.map(r => {
    const rw = r as { referred_id: string };
    const info = profileMap.get(rw.referred_id) || null;
    return {
      ...r,
      referred_provider: info,
    };
  });

  // Benefits
  const { data: benefitsData } = await supabase
    .from('provider_referral_benefits')
    .select('*')
    .eq('provider_id', providerId)
    .order('generated_at', { ascending: false });

  const benefits = benefitsData || [];

  // Summary
  const summary = buildTierSummary(
    rewards as ReferralReward[],
    benefits as ProviderReferralBenefit[]
  );

  return NextResponse.json({
    profile,
    referral_code: codeData || null,
    rewards: rewardsWithInfo,
    benefits,
    summary,
  });
}

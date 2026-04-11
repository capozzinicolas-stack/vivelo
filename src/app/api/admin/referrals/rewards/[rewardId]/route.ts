import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { computeExpectedBenefits, diffBenefitsToInsert, initialBenefitStatus } from '@/lib/referrals';

const PatchSchema = z.object({
  status: z.enum(['pending_signup', 'active_sale', 'expired', 'revoked']).optional(),
  adminNotes: z.string().max(500).nullable().optional(),
});

/**
 * PATCH /api/admin/referrals/rewards/[rewardId]
 *
 * Admin updates a referral reward:
 * - Change status (e.g. manually activate or revoke for fraud review)
 * - Set admin_notes
 *
 * When transitioning to 'active_sale', recomputes benefits for the referrer
 * (same idempotent flow as the Stripe webhook).
 *
 * When transitioning AWAY from 'active_sale' (e.g. revoked), benefits are NOT
 * automatically rolled back; admin must manually adjust via the benefit endpoint.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> }
) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { rewardId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { status, adminNotes } = parsed.data;
  const supabase = createAdminSupabaseClient();

  // Fetch current reward to know prior state
  const { data: current, error: fetchError } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('id', rewardId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Reward no encontrado' }, { status: 404 });
  }

  const currentTyped = current as { referrer_id: string; status: string; activated_at: string | null };

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === 'active_sale' && !currentTyped.activated_at) {
      updates.activated_at = new Date().toISOString();
    }
  }
  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('referral_rewards')
    .update(updates)
    .eq('id', rewardId);

  if (updateError) {
    console.error('[Admin Referrals] Update reward error:', updateError);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }

  // If transitioning to active_sale, recompute benefits for the referrer
  const transitioningToActive =
    status === 'active_sale' && currentTyped.status !== 'active_sale';

  if (transitioningToActive) {
    try {
      const referrerId = currentTyped.referrer_id;

      const { count: activeCount } = await supabase
        .from('referral_rewards')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', referrerId)
        .eq('status', 'active_sale');

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('early_adopter_ends_at')
        .eq('id', referrerId)
        .single();

      const { data: existingBenefits } = await supabase
        .from('provider_referral_benefits')
        .select('benefit_type, triggered_by_referral_count')
        .eq('provider_id', referrerId);

      const expected = computeExpectedBenefits(activeCount || 0);
      const toInsert = diffBenefitsToInsert(expected, existingBenefits || []);

      if (toInsert.length > 0) {
        const benefitStatus = initialBenefitStatus(
          (profileRow as { early_adopter_ends_at?: string | null } | null)?.early_adopter_ends_at || null
        );
        const rows = toInsert.map(b => ({
          provider_id: referrerId,
          benefit_type: b.benefit_type,
          tier_level: b.tier_level,
          triggered_by_referral_count: b.triggered_by_referral_count,
          total_sales_granted: b.total_sales_granted,
          sales_consumed: 0,
          status: benefitStatus,
          activated_at: benefitStatus === 'active' ? new Date().toISOString() : null,
        }));
        await supabase.from('provider_referral_benefits').insert(rows);
      }
    } catch (err) {
      console.error('[Admin Referrals] Benefit recompute error:', err);
    }
  }

  return NextResponse.json({ success: true });
}

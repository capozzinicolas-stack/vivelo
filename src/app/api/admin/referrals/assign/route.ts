import { NextRequest, NextResponse } from 'next/server';
import { requireAdminLevel, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, AssignReferralManualSchema } from '@/lib/validations/api-schemas';
import { computeExpectedBenefits, diffBenefitsToInsert, initialBenefitStatus } from '@/lib/referrals';

/**
 * POST /api/admin/referrals/assign
 *
 * Admin manually creates a referrer → referred relationship between two providers.
 * Useful for retroactively attributing referrals.
 *
 * Body: { referrerId, referredId, activate?, adminNotes? }
 *
 * - Both users must have role='provider'
 * - referredId cannot already be referred by anyone (unique referred_id)
 * - If activate=true, the reward is created with status='active_sale'
 *   and benefits are recomputed for the referrer
 * - Otherwise created with status='pending_signup'
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminLevel(['super_admin', 'operations']);
  if (isAuthError(auth)) return auth;

  const { data: body, error: validationError } = await validateBody(request, AssignReferralManualSchema);
  if (validationError || !body) {
    return NextResponse.json({ error: validationError || 'Body invalido' }, { status: 400 });
  }

  const { referrerId, referredId, activate, adminNotes } = body;
  const supabase = createAdminSupabaseClient();

  // Validate both are providers
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, role')
    .in('id', [referrerId, referredId]);

  if (!profiles || profiles.length !== 2) {
    return NextResponse.json({ error: 'Ambos usuarios deben existir' }, { status: 404 });
  }

  const referrer = profiles.find(p => p.id === referrerId);
  const referred = profiles.find(p => p.id === referredId);

  if (!referrer || referrer.role !== 'provider') {
    return NextResponse.json({ error: 'El referidor debe ser un proveedor' }, { status: 400 });
  }
  if (!referred || referred.role !== 'provider') {
    return NextResponse.json({ error: 'El referido debe ser un proveedor' }, { status: 400 });
  }

  // Check if referred already has a referral
  const { data: existing } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('referred_id', referredId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Este proveedor ya fue referido' }, { status: 400 });
  }

  // Get or create referrer code (needed as FK)
  const { data: existingCode } = await supabase
    .from('referral_codes')
    .select('id')
    .eq('user_id', referrerId)
    .eq('is_active', true)
    .maybeSingle();

  let codeId = existingCode?.id;
  if (!codeId) {
    const code = `VIVELO-${referrerId.slice(0, 6).toUpperCase()}`;
    const { data: newCode, error: codeError } = await supabase
      .from('referral_codes')
      .insert({ user_id: referrerId, code })
      .select('id')
      .single();
    if (codeError || !newCode) {
      return NextResponse.json({ error: 'Error creando codigo de referido' }, { status: 500 });
    }
    codeId = newCode.id;
  }

  // Insert reward
  const status = activate ? 'active_sale' : 'pending_signup';
  const { data: inserted, error: insertError } = await supabase
    .from('referral_rewards')
    .insert({
      referral_code_id: codeId,
      referrer_id: referrerId,
      referred_id: referredId,
      reward_type: 'provider_tier',
      reward_amount: 0,
      status,
      activated_at: activate ? new Date().toISOString() : null,
      admin_notes: adminNotes || null,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error('[Admin Referrals Assign] Insert error:', insertError);
    return NextResponse.json({ error: 'Error al crear el referido' }, { status: 500 });
  }

  // If activating, recompute benefits for the referrer
  if (activate) {
    try {
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
      console.error('[Admin Referrals Assign] Benefit recompute error:', err);
      // Don't fail the request — reward is already created
    }
  }

  return NextResponse.json({ success: true, reward: inserted });
}

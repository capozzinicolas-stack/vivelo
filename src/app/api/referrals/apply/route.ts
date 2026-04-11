import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, ApplyReferralCodeSchema } from '@/lib/validations/api-schemas';

/**
 * POST /api/referrals/apply
 *
 * V2 scope: provider-to-provider referrals only.
 *
 * Validates that:
 * 1. Referrer and referred are BOTH providers (role='provider')
 * 2. No self-referral
 * 3. Not already referred (idempotent)
 * 4. Referral code is active
 *
 * Creates a referral_rewards row with status='pending_signup'.
 * The row is activated later when the referred provider completes their first sale
 * (handled in the Stripe webhook on payment_intent.succeeded).
 *
 * Uses admin client to bypass RLS so the newly-registered provider can apply
 * the referral without needing an auth session (they just signed up).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const { data: body, error: validationError } = await validateBody(request, ApplyReferralCodeSchema);
  if (validationError || !body) {
    return NextResponse.json({ error: validationError || 'Body invalido' }, { status: 400 });
  }

  const { code, referredUserId } = body;

  // The authenticated user must be the one being referred (prevent hijacking)
  if (auth.user.id !== referredUserId) {
    return NextResponse.json({ error: 'referredUserId debe coincidir con el usuario autenticado' }, { status: 403 });
  }

  const supabaseAdmin = createAdminSupabaseClient();

  // Look up the referral code (case-insensitive)
  const { data: referralCode, error: codeError } = await supabaseAdmin
    .from('referral_codes')
    .select('id, user_id, is_active, uses_count')
    .ilike('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (codeError || !referralCode) {
    return NextResponse.json({ error: 'Codigo de referido no encontrado o inactivo' }, { status: 404 });
  }

  // Prevent self-referral
  if (referralCode.user_id === referredUserId) {
    return NextResponse.json({ error: 'No puedes usar tu propio codigo de referido' }, { status: 400 });
  }

  // Verify both sides are providers (V1 scope)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .in('id', [referralCode.user_id, referredUserId]);

  if (profilesError || !profiles || profiles.length !== 2) {
    return NextResponse.json({ error: 'Error verificando perfiles' }, { status: 500 });
  }

  const referrerProfile = profiles.find(p => p.id === referralCode.user_id);
  const referredProfile = profiles.find(p => p.id === referredUserId);

  if (!referrerProfile || referrerProfile.role !== 'provider') {
    return NextResponse.json({
      error: 'Solo codigos de referido de proveedores son validos en esta version',
    }, { status: 400 });
  }

  if (!referredProfile || referredProfile.role !== 'provider') {
    return NextResponse.json({
      error: 'El programa de referidos V1 esta limitado a proveedores que refieren proveedores',
    }, { status: 400 });
  }

  // Idempotency check: has this user already been referred?
  const { data: existingReward } = await supabaseAdmin
    .from('referral_rewards')
    .select('id')
    .eq('referred_id', referredUserId)
    .maybeSingle();

  if (existingReward) {
    return NextResponse.json({ error: 'Este usuario ya fue referido anteriormente' }, { status: 400 });
  }

  // Create the referral reward row (pending_signup until first sale confirmed)
  const { error: rewardError } = await supabaseAdmin
    .from('referral_rewards')
    .insert({
      referral_code_id: referralCode.id,
      referrer_id: referralCode.user_id,
      referred_id: referredUserId,
      reward_type: 'provider_tier',
      reward_amount: 0,
      status: 'pending_signup',
    });

  if (rewardError) {
    console.error('[Referrals Apply] Error creating reward:', rewardError);
    return NextResponse.json({ error: 'Error al crear la recompensa' }, { status: 500 });
  }

  // Increment uses_count optimistically (will be effectively "active" when the referral activates)
  await supabaseAdmin
    .from('referral_codes')
    .update({ uses_count: (referralCode.uses_count || 0) + 1 })
    .eq('id', referralCode.id);

  return NextResponse.json({ success: true });
}

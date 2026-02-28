import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase } = auth;

  let body: { code?: string; referredUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const { code, referredUserId } = body;

  if (!code || !referredUserId) {
    return NextResponse.json({ error: 'code y referredUserId son requeridos' }, { status: 400 });
  }

  // Find the referral code
  const { data: referralCode, error: codeError } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (codeError || !referralCode) {
    return NextResponse.json({ error: 'Codigo de referido no encontrado o inactivo' }, { status: 404 });
  }

  // Prevent self-referral
  if (referralCode.user_id === referredUserId) {
    return NextResponse.json({ error: 'No puedes usar tu propio codigo de referido' }, { status: 400 });
  }

  // Check if this user was already referred
  const { data: existingReward } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('referred_id', referredUserId)
    .limit(1);

  if (existingReward && existingReward.length > 0) {
    return NextResponse.json({ error: 'Este usuario ya fue referido anteriormente' }, { status: 400 });
  }

  // Increment uses_count
  await supabase
    .from('referral_codes')
    .update({ uses_count: (referralCode.uses_count || 0) + 1 })
    .eq('id', referralCode.id);

  // Create referral reward
  const { error: rewardError } = await supabase
    .from('referral_rewards')
    .insert({
      referral_code_id: referralCode.id,
      referrer_id: referralCode.user_id,
      referred_id: referredUserId,
      reward_type: 'discount',
      reward_amount: 0,
      status: 'pending',
    });

  if (rewardError) {
    return NextResponse.json({ error: 'Error al crear la recompensa' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, SetEarlyAdopterSchema } from '@/lib/validations/api-schemas';

/**
 * POST /api/admin/referrals/early-adopter
 *
 * Admin marks a provider as Early Adopter by setting `profiles.early_adopter_ends_at`.
 * While active, benefits generated for this provider start as 'pending'
 * (activated when the Early Adopter period expires).
 *
 * Set earlyAdopterEndsAt to null to clear the flag.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { data: body, error: validationError } = await validateBody(request, SetEarlyAdopterSchema);
  if (validationError || !body) {
    return NextResponse.json({ error: validationError || 'Body invalido' }, { status: 400 });
  }

  const { providerId, earlyAdopterEndsAt } = body;
  const supabase = createAdminSupabaseClient();

  // Verify target is a provider
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', providerId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  }

  const profileTyped = profile as { id: string; role: string };
  if (profileTyped.role !== 'provider') {
    return NextResponse.json({ error: 'El usuario debe ser un proveedor' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ early_adopter_ends_at: earlyAdopterEndsAt })
    .eq('id', providerId);

  if (updateError) {
    console.error('[Admin Referrals] Update early adopter error:', updateError);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

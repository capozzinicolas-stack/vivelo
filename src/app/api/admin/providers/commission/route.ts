import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, UpdateProviderCommissionSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const validation = await validateBody(request, UpdateProviderCommissionSchema);
    if (validation.error !== null) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { providerId, commissionRate } = validation.data!;

    const supabaseAdmin = createAdminSupabaseClient();

    // Verify the target is a provider
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, commission_rate')
      .eq('id', providerId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }
    if (profile.role !== 'provider') {
      return NextResponse.json({ error: 'El usuario no es proveedor' }, { status: 400 });
    }

    // Update commission rate using service_role (bypasses trigger protection)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ commission_rate: commissionRate })
      .eq('id', providerId);

    if (updateError) {
      console.error('[Admin Commission] Update failed:', updateError);
      return NextResponse.json({ error: 'Error actualizando comision' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      providerId,
      previousRate: Number(profile.commission_rate),
      newRate: commissionRate,
    });
  } catch (error) {
    console.error('[Admin Commission] Error:', error);
    return NextResponse.json({ error: 'Error procesando solicitud' }, { status: 500 });
  }
}

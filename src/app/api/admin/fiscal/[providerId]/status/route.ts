import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, UpdateFiscalStatusSchema } from '@/lib/validations/api-schemas';

interface RouteParams {
  params: { providerId: string };
}

/**
 * PATCH /api/admin/fiscal/[providerId]/status
 * Admin aprueba o rechaza datos fiscales de un proveedor.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { providerId } = params;

  const validated = await validateBody(request, UpdateFiscalStatusSchema);
  if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 });
  const body = validated.data!;

  const supabase = createAdminSupabaseClient();

  // Verificar que existen datos fiscales
  const { data: existing } = await supabase
    .from('provider_fiscal_data')
    .select('id, fiscal_status')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Este proveedor no tiene datos fiscales' }, { status: 404 });
  }

  // Actualizar estado
  const { data, error } = await supabase
    .from('provider_fiscal_data')
    .update({
      fiscal_status: body.fiscal_status,
      admin_notes: body.admin_notes ?? null,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('provider_id', providerId)
    .select()
    .single();

  if (error) {
    console.error('[Fiscal Admin] Error updating fiscal status:', error);
    return NextResponse.json({ error: 'Error al actualizar estado fiscal' }, { status: 500 });
  }

  console.log(`[Fiscal Admin] Provider ${providerId} fiscal status changed to ${body.fiscal_status} by admin ${auth.user.id}`);

  return NextResponse.json({ data });
}

import { NextResponse } from 'next/server';
import { requireAdminLevel, isAuthError } from '@/lib/auth/api-auth';
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
  const auth = await requireAdminLevel(['super_admin', 'operations']);
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

  // WhatsApp notification (non-blocking)
  try {
    const { data: provider } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', providerId)
      .single();

    if (provider?.phone) {
      if (body.fiscal_status === 'approved') {
        const { waProviderFiscalApproved } = await import('@/lib/whatsapp');
        waProviderFiscalApproved({
          providerId,
          providerPhone: provider.phone,
          providerName: provider.full_name || 'Proveedor',
        });
      } else if (body.fiscal_status === 'rejected') {
        const { waProviderFiscalRejected } = await import('@/lib/whatsapp');
        waProviderFiscalRejected({
          providerId,
          providerPhone: provider.phone,
          providerName: provider.full_name || 'Proveedor',
          reason: body.admin_notes || 'Sin motivo especificado',
        });
      }
    }
  } catch (waErr) {
    console.error('[Fiscal Admin] WhatsApp notification failed:', waErr);
  }

  return NextResponse.json({ data });
}

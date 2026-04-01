import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/fiscal/list
 * Lista todos los proveedores con datos fiscales.
 * Incluye nombre y email del proveedor via join.
 */
export async function GET() {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from('provider_fiscal_data')
    .select('*, profiles!provider_fiscal_data_provider_id_fkey(full_name, company_name, email)')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Fiscal Admin] Error listing fiscal data:', error);
    return NextResponse.json({ error: 'Error al listar datos fiscales' }, { status: 500 });
  }

  // Flatten profile data
  const records = (data || []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { full_name: string; company_name: string | null; email: string } | null;
    return {
      ...row,
      profiles: undefined,
      provider_name: profile?.company_name || profile?.full_name || 'Desconocido',
      provider_email: profile?.email || '',
    };
  });

  return NextResponse.json({ data: records });
}

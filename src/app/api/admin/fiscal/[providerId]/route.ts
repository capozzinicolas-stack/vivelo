import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: { providerId: string };
}

/**
 * GET /api/admin/fiscal/[providerId]
 * Admin obtiene datos fiscales de un proveedor especifico.
 * Incluye URLs firmadas para documentos sensibles.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { providerId } = params;

  const supabase = createAdminSupabaseClient();

  // Obtener datos fiscales
  const { data: fiscal, error } = await supabase
    .from('provider_fiscal_data')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) {
    console.error('[Fiscal Admin] Error fetching fiscal data:', error);
    return NextResponse.json({ error: 'Error al obtener datos fiscales' }, { status: 500 });
  }

  if (!fiscal) {
    return NextResponse.json({ data: null, message: 'Este proveedor no tiene datos fiscales' });
  }

  // Generar URLs firmadas para documentos (si existen)
  let constanciaSignedUrl: string | null = null;
  let estadoCuentaSignedUrl: string | null = null;

  if (fiscal.constancia_url) {
    const { data } = await supabase.storage
      .from('fiscal-documents')
      .createSignedUrl(fiscal.constancia_url, 3600); // 1 hora
    constanciaSignedUrl = data?.signedUrl || null;
  }

  if (fiscal.estado_cuenta_url) {
    const { data } = await supabase.storage
      .from('fiscal-documents')
      .createSignedUrl(fiscal.estado_cuenta_url, 3600);
    estadoCuentaSignedUrl = data?.signedUrl || null;
  }

  // Obtener nombre del proveedor para contexto
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name, email')
    .eq('id', providerId)
    .single();

  return NextResponse.json({
    data: {
      ...fiscal,
      constancia_signed_url: constanciaSignedUrl,
      estado_cuenta_signed_url: estadoCuentaSignedUrl,
      provider_name: profile?.company_name || profile?.full_name || 'Desconocido',
      provider_email: profile?.email || '',
    },
  });
}

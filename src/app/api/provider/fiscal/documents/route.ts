import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/provider/fiscal/documents
 * Subir documentos fiscales (constancia de situacion fiscal, estado de cuenta).
 * Usa bucket 'fiscal-documents' (privado) con URLs firmadas.
 *
 * FormData esperado:
 * - file: archivo PDF/JPG/PNG
 * - type: 'constancia' | 'estado_cuenta'
 */
export async function POST(request: Request) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const supabase = createAdminSupabaseClient();

  // Verificar que existen datos fiscales
  const { data: fiscal } = await supabase
    .from('provider_fiscal_data')
    .select('id, fiscal_status')
    .eq('provider_id', auth.user.id)
    .maybeSingle();

  if (!fiscal) {
    return NextResponse.json(
      { error: 'Primero debes llenar tus datos fiscales antes de subir documentos' },
      { status: 400 },
    );
  }

  if (fiscal.fiscal_status === 'approved') {
    return NextResponse.json(
      { error: 'No se pueden modificar documentos de datos fiscales aprobados' },
      { status: 403 },
    );
  }

  // Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'FormData invalido' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const docType = formData.get('type') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'Archivo es requerido' }, { status: 400 });
  }

  if (!docType || !['constancia', 'estado_cuenta'].includes(docType)) {
    return NextResponse.json({ error: 'Tipo de documento debe ser "constancia" o "estado_cuenta"' }, { status: 400 });
  }

  // Validar tipo de archivo
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no soportado. Usa PDF, JPG o PNG.' }, { status: 400 });
  }

  // Validar tamano
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo no puede exceder 10MB' }, { status: 400 });
  }

  // Subir al bucket fiscal-documents (privado)
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `${auth.user.id}/${docType}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('fiscal-documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[Fiscal] Error uploading document:', uploadError);
    return NextResponse.json({ error: 'Error al subir documento' }, { status: 500 });
  }

  // Generar URL firmada (1 hora de validez)
  const { data: signedUrl } = await supabase.storage
    .from('fiscal-documents')
    .createSignedUrl(path, 3600);

  // Actualizar referencia en datos fiscales
  const updateField = docType === 'constancia' ? 'constancia_url' : 'estado_cuenta_url';
  const { error: updateError } = await supabase
    .from('provider_fiscal_data')
    .update({
      [updateField]: path, // Guardamos el path, no la URL (la URL se genera bajo demanda)
      fiscal_status: 'pending_review',
    })
    .eq('provider_id', auth.user.id);

  if (updateError) {
    console.error('[Fiscal] Error updating fiscal data with document:', updateError);
    return NextResponse.json({ error: 'Error al registrar documento' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    path,
    signedUrl: signedUrl?.signedUrl || null,
  });
}

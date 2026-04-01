import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, CreateFiscalDataSchema, UpdateFiscalDataSchema } from '@/lib/validations/api-schemas';
import { validateRFC } from '@/lib/fiscal';
import type { PersonaType } from '@/types/database';

/**
 * GET /api/provider/fiscal
 * Obtener datos fiscales del proveedor autenticado.
 */
export async function GET() {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('provider_fiscal_data')
    .select('*')
    .eq('provider_id', auth.user.id)
    .maybeSingle();

  if (error) {
    console.error('[Fiscal] Error fetching fiscal data:', error);
    return NextResponse.json({ error: 'Error al obtener datos fiscales' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/provider/fiscal
 * Crear o actualizar datos fiscales del proveedor.
 * Si ya existen datos, los actualiza (upsert por provider_id).
 */
export async function POST(request: Request) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const supabase = createAdminSupabaseClient();

  // Verificar si ya existen datos fiscales
  const { data: existing } = await supabase
    .from('provider_fiscal_data')
    .select('id, fiscal_status')
    .eq('provider_id', auth.user.id)
    .maybeSingle();

  // Si datos aprobados, no se pueden modificar
  if (existing?.fiscal_status === 'approved') {
    return NextResponse.json(
      { error: 'Los datos fiscales aprobados no se pueden modificar. Contacta a soporte.' },
      { status: 403 },
    );
  }

  // Validar segun si es creacion o actualizacion
  if (existing) {
    // Actualizar
    const validated = await validateBody(request, UpdateFiscalDataSchema);
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 });
    const body = validated.data!;

    // Validar RFC si se incluye
    if (body.rfc && body.tipo_persona) {
      const rfcResult = validateRFC(body.rfc, body.tipo_persona as PersonaType);
      if (!rfcResult.valid) return NextResponse.json({ error: rfcResult.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('provider_fiscal_data')
      .update({
        ...body,
        rfc: body.rfc?.toUpperCase().trim(),
        fiscal_status: 'pending_review',
      })
      .eq('provider_id', auth.user.id)
      .select()
      .single();

    if (error) {
      console.error('[Fiscal] Error updating fiscal data:', error);
      return NextResponse.json({ error: 'Error al actualizar datos fiscales' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } else {
    // Crear
    const validatedCreate = await validateBody(request, CreateFiscalDataSchema);
    if (validatedCreate.error) return NextResponse.json({ error: validatedCreate.error }, { status: 400 });
    const body = validatedCreate.data!;

    // Validar RFC
    const rfcResult = validateRFC(body.rfc, body.tipo_persona as PersonaType);
    if (!rfcResult.valid) return NextResponse.json({ error: rfcResult.error }, { status: 400 });

    const { data, error } = await supabase
      .from('provider_fiscal_data')
      .insert({
        provider_id: auth.user.id,
        ...body,
        rfc: body.rfc.toUpperCase().trim(),
        fiscal_status: 'pending_review',
      })
      .select()
      .single();

    if (error) {
      console.error('[Fiscal] Error creating fiscal data:', error);
      return NextResponse.json({ error: 'Error al crear datos fiscales' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  }
}

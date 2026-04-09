import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { UpdateFieldDefinitionSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

// PUT — admin: update field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const result = UpdateFieldDefinitionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { data, error } = await supabaseAdmin
      .from('category_field_definitions')
      .update(result.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ field: data });
  } catch (error) {
    console.error('[CatalogFields PUT] Error:', error);
    return NextResponse.json({ error: 'Error actualizando campo' }, { status: 500 });
  }
}

// DELETE — admin: delete field definition (hard delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const supabaseAdmin = createAdminSupabaseClient();

    const { error } = await supabaseAdmin
      .from('category_field_definitions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CatalogFields DELETE] Error:', error);
    return NextResponse.json({ error: 'Error eliminando campo' }, { status: 500 });
  }
}

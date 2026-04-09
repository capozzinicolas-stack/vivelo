import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { CreateFieldDefinitionSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

// GET — public: returns all active field definitions
export async function GET() {
  try {
    const supabaseAdmin = createAdminSupabaseClient();

    const { data, error } = await supabaseAdmin
      .from('category_field_definitions')
      .select('*')
      .eq('is_active', true)
      .order('category_slug')
      .order('sort_order');

    if (error) throw error;

    return NextResponse.json({ fields: data || [] });
  } catch (error) {
    console.error('[CatalogFields GET] Error:', error);
    return NextResponse.json({ error: 'Error cargando campos' }, { status: 500 });
  }
}

// POST — admin: create new field definition
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const result = CreateFieldDefinitionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { data, error } = await supabaseAdmin
      .from('category_field_definitions')
      .insert(result.data)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un campo con esa key en esta categoria' }, { status: 409 });
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'La categoria no existe' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ field: data });
  } catch (error) {
    console.error('[CatalogFields POST] Error:', error);
    return NextResponse.json({ error: 'Error creando campo' }, { status: 500 });
  }
}

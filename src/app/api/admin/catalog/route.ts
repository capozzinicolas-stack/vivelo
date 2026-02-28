import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { CreateCategorySchema, CreateSubcategorySchema, CreateZoneSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabaseAdmin = createAdminSupabaseClient();

    const [categoriesRes, subcategoriesRes, zonesRes] = await Promise.all([
      supabaseAdmin.from('service_categories').select('*').order('sort_order'),
      supabaseAdmin.from('service_subcategories').select('*').order('sort_order'),
      supabaseAdmin.from('service_zones').select('*').order('sort_order'),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (subcategoriesRes.error) throw subcategoriesRes.error;
    if (zonesRes.error) throw zonesRes.error;

    return NextResponse.json({
      categories: categoriesRes.data,
      subcategories: subcategoriesRes.data,
      zones: zonesRes.data,
    });
  } catch (error) {
    console.error('[Catalog GET] Error:', error);
    return NextResponse.json({ error: 'Error cargando catalogo' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    let body: { type: string; data: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const { type, data } = body;
    const supabaseAdmin = createAdminSupabaseClient();

    if (type === 'category') {
      const result = CreateCategorySchema.safeParse(data);
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from('service_categories').insert(result.data);
      if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Ya existe una categoria con ese slug' }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ success: true, slug: result.data.slug });
    }

    if (type === 'subcategory') {
      const result = CreateSubcategorySchema.safeParse(data);
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from('service_subcategories').insert(result.data);
      if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Ya existe una subcategoria con ese slug' }, { status: 409 });
        if (error.code === '23503') return NextResponse.json({ error: 'La categoria padre no existe' }, { status: 400 });
        throw error;
      }
      return NextResponse.json({ success: true, slug: result.data.slug });
    }

    if (type === 'zone') {
      const result = CreateZoneSchema.safeParse(data);
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from('service_zones').insert(result.data);
      if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Ya existe una zona con ese slug' }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ success: true, slug: result.data.slug });
    }

    return NextResponse.json({ error: 'type debe ser category, subcategory o zone' }, { status: 400 });
  } catch (error) {
    console.error('[Catalog POST] Error:', error);
    return NextResponse.json({ error: 'Error creando item del catalogo' }, { status: 500 });
  }
}

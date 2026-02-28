import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { UpdateCategorySchema, UpdateSubcategorySchema, UpdateZoneSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const { slug } = await params;
    let body: { type: string; data: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const { type, data } = body;
    const supabaseAdmin = createAdminSupabaseClient();

    if (type === 'category') {
      const result = UpdateCategorySchema.safeParse(data);
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('service_categories')
        .update(result.data)
        .eq('slug', slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'subcategory') {
      const result = UpdateSubcategorySchema.safeParse(data);
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('service_subcategories')
        .update(result.data)
        .eq('slug', slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'zone') {
      const result = UpdateZoneSchema.safeParse(data);
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('service_zones')
        .update(result.data)
        .eq('slug', slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'type debe ser category, subcategory o zone' }, { status: 400 });
  } catch (error) {
    console.error('[Catalog PUT] Error:', error);
    return NextResponse.json({ error: 'Error actualizando item del catalogo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const { slug } = await params;
    const type = request.nextUrl.searchParams.get('type');
    const supabaseAdmin = createAdminSupabaseClient();

    if (type === 'category') {
      // Check for active services
      const { count } = await supabaseAdmin
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('category', slug)
        .neq('status', 'archived');
      if (count && count > 0) {
        return NextResponse.json(
          { error: `No se puede eliminar: ${count} servicio(s) activo(s) usan esta categoria`, count },
          { status: 409 }
        );
      }
      // Also check subcategories
      const { count: subCount } = await supabaseAdmin
        .from('service_subcategories')
        .select('*', { count: 'exact', head: true })
        .eq('category_slug', slug);
      if (subCount && subCount > 0) {
        return NextResponse.json(
          { error: `No se puede eliminar: ${subCount} subcategoria(s) pertenecen a esta categoria. Eliminalas primero.`, count: subCount },
          { status: 409 }
        );
      }
      const { error } = await supabaseAdmin.from('service_categories').delete().eq('slug', slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'subcategory') {
      const { count } = await supabaseAdmin
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('subcategory', slug)
        .neq('status', 'archived');
      if (count && count > 0) {
        return NextResponse.json(
          { error: `No se puede eliminar: ${count} servicio(s) activo(s) usan esta subcategoria`, count },
          { status: 409 }
        );
      }
      const { error } = await supabaseAdmin.from('service_subcategories').delete().eq('slug', slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'zone') {
      const { count } = await supabaseAdmin
        .from('services')
        .select('*', { count: 'exact', head: true })
        .contains('zones', [slug])
        .neq('status', 'archived');
      if (count && count > 0) {
        return NextResponse.json(
          { error: `No se puede eliminar: ${count} servicio(s) activo(s) incluyen esta zona`, count },
          { status: 409 }
        );
      }
      const { error } = await supabaseAdmin.from('service_zones').delete().eq('slug', slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'type query param debe ser category, subcategory o zone' }, { status: 400 });
  } catch (error) {
    console.error('[Catalog DELETE] Error:', error);
    return NextResponse.json({ error: 'Error eliminando item del catalogo' }, { status: 500 });
  }
}

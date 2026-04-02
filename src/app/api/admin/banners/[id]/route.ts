import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { UpdateLandingBannerSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const result = UpdateLandingBannerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { data, error } = await supabaseAdmin
      .from('landing_page_banners')
      .update({ ...result.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 });

    return NextResponse.json({ success: true, banner: data });
  } catch (error) {
    console.error('[Banners PATCH] Error:', error);
    return NextResponse.json({ error: 'Error actualizando banner' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const supabaseAdmin = createAdminSupabaseClient();
    const { error } = await supabaseAdmin
      .from('landing_page_banners')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Banners DELETE] Error:', error);
    return NextResponse.json({ error: 'Error eliminando banner' }, { status: 500 });
  }
}

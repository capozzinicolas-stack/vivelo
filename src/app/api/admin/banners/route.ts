import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAdminLevel, isAuthError } from '@/lib/auth/api-auth';
import { CreateLandingBannerSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await requireRole(['admin']);
    if (isAuthError(auth)) return auth;

    const supabaseAdmin = createAdminSupabaseClient();
    const { data, error } = await supabaseAdmin
      .from('landing_page_banners')
      .select('*, provider:profiles!landing_page_banners_provider_id_fkey(full_name, company_name, slug)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ banners: data || [] });
  } catch (error) {
    console.error('[Banners GET] Error:', error);
    return NextResponse.json({ error: 'Error cargando banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminLevel(['super_admin', 'marketing']);
    if (isAuthError(auth)) return auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const result = CreateLandingBannerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { data, error } = await supabaseAdmin
      .from('landing_page_banners')
      .insert({
        ...result.data,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, banner: data });
  } catch (error) {
    console.error('[Banners POST] Error:', error);
    return NextResponse.json({ error: 'Error creando banner' }, { status: 500 });
  }
}

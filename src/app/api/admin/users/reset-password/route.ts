import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function verifyAdmin(): Promise<{ authorized: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authorized: false, error: `Auth failed: ${error?.message || 'no user'}` };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { authorized: false, error: 'Not admin' };
    }

    return { authorized: true };
  } catch (err) {
    return { authorized: false, error: `Exception: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      console.error('[Admin ResetPassword] Auth check failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);

    if (error) {
      console.error('[Admin ResetPassword] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin ResetPassword] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

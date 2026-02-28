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

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      console.error('[Admin Users] Auth check failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, phone, company_name, bio, verified, max_concurrent_services, apply_buffers_to_all, global_buffer_before_minutes, global_buffer_after_minutes, banking_status, default_cancellation_policy_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Users] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[Admin Users] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { id, verified, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof verified === 'boolean') updates.verified = verified;
    if (role && ['client', 'provider', 'admin'].includes(role)) updates.role = role;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios' }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[Admin Users] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}

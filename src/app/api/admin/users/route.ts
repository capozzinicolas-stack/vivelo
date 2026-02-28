import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const supabaseAdmin = createAdminSupabaseClient();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, phone, company_name, bio, verified, max_concurrent_services, apply_buffers_to_all, global_buffer_before_minutes, global_buffer_after_minutes, banking_status, default_cancellation_policy_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Users] Error fetching profiles:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

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
    console.error('[Admin Users] Error updating profile:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

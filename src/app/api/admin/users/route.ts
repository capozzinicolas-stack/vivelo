import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

import type { AdminLevel } from '@/types/database';

async function verifyAdmin(): Promise<{ authorized: boolean; userId?: string; adminLevel?: AdminLevel | null; error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authorized: false, error: `Auth failed: ${error?.message || 'no user'}` };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, admin_level')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { authorized: false, error: 'Not admin' };
    }

    return { authorized: true, userId: user.id, adminLevel: profile.admin_level as AdminLevel | null };
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
      .select('id, email, full_name, role, verified, admin_level, created_at')
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
    const { id, verified, role, admin_level } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof verified === 'boolean') updates.verified = verified;
    if (role && ['client', 'provider', 'admin'].includes(role)) {
      // Only super_admin can change roles
      if (auth.adminLevel !== 'super_admin') {
        return NextResponse.json({ error: 'Solo Super Admin puede cambiar roles' }, { status: 403 });
      }
      updates.role = role;
      // Clear admin_level if not admin; set default if becoming admin
      if (role !== 'admin') {
        updates.admin_level = null;
      } else if (!admin_level) {
        updates.admin_level = 'operations';
      }
    }
    if (admin_level && ['super_admin', 'operations', 'marketing', 'support'].includes(admin_level)) {
      // Only super_admin can change admin levels
      if (auth.adminLevel !== 'super_admin') {
        return NextResponse.json({ error: 'Solo Super Admin puede cambiar niveles de admin' }, { status: 403 });
      }
      updates.admin_level = admin_level;
    }

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

    logAdminAction({
      adminId: auth.userId!,
      action: 'user_update',
      targetType: 'user',
      targetId: id,
      details: updates,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    // Only super_admin can invite new admins
    if (auth.adminLevel !== 'super_admin') {
      return NextResponse.json({ error: 'Solo Super Admin puede invitar administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { email, full_name, admin_level } = body;

    if (!email || !full_name) {
      return NextResponse.json({ error: 'Email y nombre completo son requeridos' }, { status: 400 });
    }

    const level = admin_level && ['super_admin', 'operations', 'marketing', 'support'].includes(admin_level)
      ? admin_level
      : 'operations';

    const supabaseAdmin = createAdminSupabaseClient();

    // Create user with random password and confirmed email
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });

    if (createError) {
      console.error('[Admin Users] Create user error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Update profile to admin role (trigger handle_new_user creates it as 'client')
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', full_name, admin_level: level })
      .eq('id', newUser.user.id);

    if (updateError) {
      console.error('[Admin Users] Update profile error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send password reset so the invited admin can set their real password
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://solovivelo.com';
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (resetError) {
      console.error('[Admin Users] Reset password email error:', resetError);
      // User was created successfully, just warn about the email
    }

    logAdminAction({
      adminId: auth.userId!,
      action: 'user_invite',
      targetType: 'user',
      targetId: newUser.user.id,
      details: { email, full_name, admin_level: level },
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users] POST unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    // Only super_admin can delete users
    if (auth.adminLevel !== 'super_admin') {
      return NextResponse.json({ error: 'Solo Super Admin puede eliminar usuarios' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Prevent self-deletion
    if (id === auth.userId) {
      return NextResponse.json({ error: 'No puedes borrar tu propia cuenta' }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();

    // Delete profile first (may fail on FK constraints)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('[Admin Users] Delete profile error:', profileError);
      return NextResponse.json(
        { error: 'No se puede borrar este usuario. Puede tener reservas u ordenes asociadas.' },
        { status: 409 }
      );
    }

    // Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('[Admin Users] Delete auth user error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    logAdminAction({
      adminId: auth.userId!,
      action: 'user_delete',
      targetType: 'user',
      targetId: id,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users] DELETE unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import crypto from 'crypto';

async function verifyAdmin(): Promise<{ authorized: boolean; userId?: string; error?: string }> {
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

    return { authorized: true, userId: user.id };
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
      .select('id, email, full_name, role, verified, created_at')
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

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { email, full_name } = body;

    if (!email || !full_name) {
      return NextResponse.json({ error: 'Email y nombre completo son requeridos' }, { status: 400 });
    }

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
      .update({ role: 'admin', full_name })
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users] DELETE unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

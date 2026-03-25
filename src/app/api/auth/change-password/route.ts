import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is a client or provider
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Contrasena actual y nueva son requeridas' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La nueva contrasena debe tener al menos 6 caracteres' }, { status: 400 });
    }

    // Verify current password by attempting sign-in
    const supabaseAdmin = createAdminSupabaseClient();
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: 'La contrasena actual es incorrecta' }, { status: 400 });
    }

    // Update to new password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('[ChangePassword] Update error:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la contrasena' }, { status: 500 });
    }

    // Clear must_change_password flag
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('[ChangePassword] Profile update error:', profileUpdateError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ChangePassword] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

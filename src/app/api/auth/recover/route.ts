import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendTemporaryPassword } from '@/lib/email';
import crypto from 'crypto';

function generateTempPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return `Vivelo-${result}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();

    // Verify the email belongs to a client or provider
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      // Don't reveal whether the email exists — always return success
      console.log('[Recover] Email not found:', email);
      return NextResponse.json({ success: true });
    }

    if (profile.role === 'admin') {
      // Don't reveal role info — admins use their own recovery flow
      console.log('[Recover] Admin email, ignoring:', email);
      return NextResponse.json({ success: true });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Update password in Supabase auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: tempPassword,
    });

    if (updateAuthError) {
      console.error('[Recover] Update auth error:', updateAuthError);
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
    }

    // Mark must_change_password in profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', profile.id);

    if (updateProfileError) {
      console.error('[Recover] Update profile error:', updateProfileError);
    }

    // Send email with temporary password
    await sendTemporaryPassword({
      userName: profile.full_name || 'Usuario',
      userEmail: email,
      temporaryPassword: tempPassword,
      loginUrl: 'solovivelo.com/login',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Recover] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

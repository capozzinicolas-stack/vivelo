import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

const schema = z.object({
  userId: z.string().uuid(),
});

function generateTempPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return `Vivelo-${result}`;
}

export async function POST(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { userId } = schema.parse(body);

    const supabaseAdmin = createAdminSupabaseClient();

    // Verify user exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Update password in Supabase auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateAuthError) {
      console.error('[Admin TempPassword] Update auth error:', updateAuthError);
      return NextResponse.json({ error: 'Error al generar contrasena' }, { status: 500 });
    }

    // Mark must_change_password in profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('[Admin TempPassword] Update profile error:', updateProfileError);
    }

    return NextResponse.json({
      success: true,
      tempPassword,
      userName: profile.full_name,
      userEmail: profile.email,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 });
    }
    console.error('[Admin TempPassword] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

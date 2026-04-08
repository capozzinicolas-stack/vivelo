import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  providerId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { providerId } = schema.parse(body);

    const supabaseAdmin = createAdminSupabaseClient();

    // Fetch provider profile
    const { data: provider, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', providerId)
      .single();

    if (profileError || !provider) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    if (provider.role !== 'provider') {
      return NextResponse.json({ error: 'El usuario no es un proveedor' }, { status: 400 });
    }

    // Generate magic link via admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: provider.email,
      options: {
        redirectTo: 'https://solovivelo.com/dashboard/proveedor',
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Admin Impersonate] Generate link error:', linkError);
      return NextResponse.json({ error: 'Error al generar link de acceso' }, { status: 500 });
    }

    console.log(`[Admin Impersonate] Magic link generated for provider ${provider.email} by admin ${auth.user.email}`);

    return NextResponse.json({
      url: linkData.properties.action_link,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 });
    }
    console.error('[Admin Impersonate] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendServiceStatusEmail } from '@/lib/email';

const schema = z.object({
  providerId: z.string().uuid(),
  serviceTitle: z.string().min(1),
  status: z.enum(['approved', 'rejected', 'needs_revision']),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { providerId, serviceTitle, status, notes } = schema.parse(body);

    const supabaseAdmin = createAdminSupabaseClient();
    const { data: provider } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', providerId)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    // Non-blocking — fire and don't wait
    sendServiceStatusEmail({
      providerName: provider.full_name,
      providerEmail: provider.email,
      serviceTitle,
      status,
      notes,
    }).catch(err => console.error('[Email] Service status email failed:', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 });
    }
    console.error('[Admin ServiceStatusEmail] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

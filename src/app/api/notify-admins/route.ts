import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  serviceTitle: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { serviceTitle } = schema.parse(body);

    const supabaseAdmin = createAdminSupabaseClient();

    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: true });
    }

    const notifications = admins.map(admin => ({
      recipient_id: admin.id,
      type: 'system' as const,
      title: 'Nuevo servicio pendiente de revision',
      message: `El servicio "${serviceTitle}" esta esperando aprobacion.`,
      link: '/admin-portal/dashboard/servicios',
    }));

    const { error } = await supabaseAdmin.from('notifications').insert(notifications);
    if (error) {
      console.error('[NotifyAdmins] Insert error:', error);
      return NextResponse.json({ error: 'Error creando notificaciones' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 });
    }
    console.error('[NotifyAdmins] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

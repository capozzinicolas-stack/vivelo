import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, CreateServiceCommentSchema } from '@/lib/validations/api-schemas';
import { sendServiceCommentNotification } from '@/lib/email';
import type { ServiceAdminComment } from '@/types/database';

/**
 * GET /api/admin/services/[id]/comments
 * Lista comentarios admin de un servicio.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { id: serviceId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from('service_admin_comments')
    .select('*, admin:admin_id(id, full_name, email)')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Comments] GET error:', error);
    return NextResponse.json({ error: 'Error listando comentarios' }, { status: 500 });
  }

  return NextResponse.json({ comments: (data || []) as ServiceAdminComment[] });
}

/**
 * POST /api/admin/services/[id]/comments
 * Crea un comentario admin sobre un servicio.
 * Envia notificacion in-app + email al proveedor.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { id: serviceId } = await params;

  const validation = await validateBody(request, CreateServiceCommentSchema);
  if (validation.error !== null) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.data!;

  const supabase = createAdminSupabaseClient();

  // 1. Verify service exists and get provider_id
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('id, title, provider_id')
    .eq('id', serviceId)
    .maybeSingle();

  if (svcErr || !service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  // 2. Insert comment
  const { data: comment, error: insertErr } = await supabase
    .from('service_admin_comments')
    .insert({
      service_id: serviceId,
      provider_id: service.provider_id,
      admin_id: auth.user.id,
      category: body.category,
      comment: body.comment,
    })
    .select('*, admin:admin_id(id, full_name, email)')
    .single();

  if (insertErr || !comment) {
    console.error('[Admin Comments] POST insert error:', insertErr);
    return NextResponse.json({ error: 'Error creando comentario' }, { status: 500 });
  }

  // 3. In-app notification (via service-role, best-effort)
  try {
    await supabase.from('notifications').insert({
      recipient_id: service.provider_id,
      type: 'system',
      title: 'Nuevo comentario del administrador',
      message: `Comentario sobre "${service.title}": ${body.comment.slice(0, 160)}${body.comment.length > 160 ? '...' : ''}`,
      link: '/dashboard/proveedor/servicios',
      read: false,
    });
  } catch (e) {
    console.warn('[Admin Comments] notification insert failed:', e);
  }

  // 4. Email (best-effort, non-blocking failure)
  try {
    const { data: provider } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', service.provider_id)
      .maybeSingle();

    if (provider?.email) {
      await sendServiceCommentNotification({
        providerName: provider.full_name || 'Proveedor',
        providerEmail: provider.email,
        serviceTitle: service.title,
        category: body.category,
        comment: body.comment,
      });
    }
  } catch (e) {
    console.warn('[Admin Comments] email send failed:', e);
  }

  return NextResponse.json({ comment: comment as ServiceAdminComment }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { UpdateCommentReadStateSchema } from '@/lib/validations/api-schemas';

/**
 * GET /api/provider/services/[id]/comments
 * Lista comentarios admin del servicio (solo si pertenece al proveedor).
 * Query params:
 *   ?includeResolved=true  — incluye comentarios ya resueltos en la respuesta
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const { id: serviceId } = await params;
  const { searchParams } = new URL(request.url);
  const includeResolved = searchParams.get('includeResolved') === 'true';

  const supabase = createAdminSupabaseClient();

  // Verify ownership
  const { data: service } = await supabase
    .from('services')
    .select('id, provider_id')
    .eq('id', serviceId)
    .maybeSingle();

  if (!service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }
  if (service.provider_id !== auth.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let query = supabase
    .from('service_admin_comments')
    .select('*, admin:admin_id(id, full_name, email)')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false });

  if (!includeResolved) query = query.is('resolved_at', null);

  const { data, error } = await query;
  if (error) {
    console.error('[Provider Comments] GET error:', error);
    return NextResponse.json({ error: 'Error listando comentarios' }, { status: 500 });
  }

  return NextResponse.json({ comments: data || [] });
}

/**
 * PATCH /api/provider/services/[id]/comments
 * Marca todos los comentarios del servicio como leidos.
 * Body opcional: { commentId, is_read?, resolved? } para actualizar un comentario especifico.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const { id: serviceId } = await params;
  const supabase = createAdminSupabaseClient();

  // Verify ownership
  const { data: service } = await supabase
    .from('services')
    .select('id, provider_id')
    .eq('id', serviceId)
    .maybeSingle();

  if (!service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }
  if (service.provider_id !== auth.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Parse body: if contains commentId, update single comment; else mark all as read
  const body = await request.json().catch(() => ({}));
  const commentId: string | undefined = body.commentId;

  if (commentId) {
    const parsed = UpdateCommentReadStateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { is_read, resolved } = parsed.data;
    const update: Record<string, unknown> = {};
    if (is_read !== undefined) update.is_read = is_read;
    if (resolved !== undefined) update.resolved_at = resolved ? new Date().toISOString() : null;
    // When resolving, also mark as read
    if (resolved === true) update.is_read = true;

    const { error } = await supabase
      .from('service_admin_comments')
      .update(update)
      .eq('id', commentId)
      .eq('provider_id', auth.user.id);
    if (error) {
      console.error('[Provider Comments] PATCH single error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Mark all as read
  const { error } = await supabase
    .from('service_admin_comments')
    .update({ is_read: true })
    .eq('service_id', serviceId)
    .eq('provider_id', auth.user.id)
    .eq('is_read', false);
  if (error) {
    console.error('[Provider Comments] PATCH markAll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

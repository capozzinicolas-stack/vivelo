import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, UpdateServiceCommentSchema } from '@/lib/validations/api-schemas';

/**
 * PATCH /api/admin/services/[id]/comments/[commentId]
 * Edita un comentario admin (solo el autor del comentario puede editar).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { commentId } = await params;
  const validation = await validateBody(request, UpdateServiceCommentSchema);
  if (validation.error !== null) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.data!;

  const supabase = createAdminSupabaseClient();

  // 1. Verify the comment exists and was authored by this admin
  const { data: existing, error: lookupErr } = await supabase
    .from('service_admin_comments')
    .select('id, admin_id')
    .eq('id', commentId)
    .maybeSingle();

  if (lookupErr || !existing) {
    return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
  }
  if (existing.admin_id && existing.admin_id !== auth.user.id) {
    return NextResponse.json({ error: 'Solo puedes editar tus propios comentarios' }, { status: 403 });
  }

  // 2. Apply update (is_read se resetea a false para notificar al proveedor del cambio)
  const updateFields: Record<string, unknown> = {};
  if (body.category !== undefined) updateFields.category = body.category;
  if (body.comment !== undefined) {
    updateFields.comment = body.comment;
    updateFields.is_read = false;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { data: updated, error: updErr } = await supabase
    .from('service_admin_comments')
    .update(updateFields)
    .eq('id', commentId)
    .select('*, admin:admin_id(id, full_name, email)')
    .single();

  if (updErr) {
    console.error('[Admin Comments] PATCH error:', updErr);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ comment: updated });
}

/**
 * DELETE /api/admin/services/[id]/comments/[commentId]
 * Elimina un comentario admin (solo el autor puede eliminar).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { commentId } = await params;
  const supabase = createAdminSupabaseClient();

  // 1. Verify ownership
  const { data: existing } = await supabase
    .from('service_admin_comments')
    .select('id, admin_id')
    .eq('id', commentId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
  }
  if (existing.admin_id && existing.admin_id !== auth.user.id) {
    return NextResponse.json({ error: 'Solo puedes eliminar tus propios comentarios' }, { status: 403 });
  }

  const { error: delErr } = await supabase
    .from('service_admin_comments')
    .delete()
    .eq('id', commentId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

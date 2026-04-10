import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, UpdateProviderPromotionSchema } from '@/lib/validations/api-schemas';
import { PROVIDER_PROMO_LIMITS } from '@/lib/constants';

/**
 * PATCH /api/provider/promotions/[id]
 * Edita una promocion del proveedor.
 *  - coupon_code y start_date son INMUTABLES post-creacion
 *  - Solo se pueden editar campos no-status si used_count = 0
 *  - status si se puede cambiar siempre (active <-> cancelled <-> draft)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const validation = await validateBody(request, UpdateProviderPromotionSchema);
  if (validation.error !== null) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.data!;

  const supabase = createAdminSupabaseClient();

  // 1. Verify ownership
  const { data: existing, error: lookupErr } = await supabase
    .from('campaigns')
    .select('id, source, owner_provider_id, used_count, status, start_date')
    .eq('id', id)
    .maybeSingle();
  if (lookupErr || !existing) {
    return NextResponse.json({ error: 'Promocion no encontrada' }, { status: 404 });
  }
  if (existing.source !== 'provider' || existing.owner_provider_id !== auth.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // 2. Determine which fields are content-edits (require used_count=0) vs status-only
  const contentFields = ['external_name', 'description', 'discount_pct', 'end_date', 'usage_limit', 'max_uses_per_user', 'service_ids'] as const;
  const isContentEdit = contentFields.some(k => body[k as keyof typeof body] !== undefined);

  if (isContentEdit && (existing.used_count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'No puedes editar esta promocion porque ya fue usada por al menos un cliente. Solo puedes pausarla.' },
      { status: 400 }
    );
  }

  // 3. If activating from cancelled/draft to active, enforce 5-active limit
  if (body.status === 'active' && existing.status !== 'active') {
    const { count } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'provider')
      .eq('owner_provider_id', auth.user.id)
      .eq('status', 'active');
    if ((count ?? 0) >= PROVIDER_PROMO_LIMITS.MAX_ACTIVE_PROMOS_PER_PROVIDER) {
      return NextResponse.json(
        { error: `Solo puedes tener ${PROVIDER_PROMO_LIMITS.MAX_ACTIVE_PROMOS_PER_PROVIDER} promociones activas a la vez.` },
        { status: 400 }
      );
    }
  }

  // 4. If end_date provided, validate it
  if (body.end_date && new Date(body.end_date) <= new Date(existing.start_date)) {
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' }, { status: 400 });
  }

  // 5. If service_ids provided, verify ownership and replace subscriptions
  if (body.service_ids) {
    const { data: services } = await supabase
      .from('services')
      .select('id, provider_id')
      .in('id', body.service_ids);
    if (!services || services.length !== body.service_ids.length) {
      return NextResponse.json({ error: 'Uno o mas servicios no existen' }, { status: 400 });
    }
    const notOwned = services.find(s => s.provider_id !== auth.user.id);
    if (notOwned) {
      return NextResponse.json({ error: 'No puedes incluir servicios de otro proveedor' }, { status: 403 });
    }

    // Replace subscriptions
    await supabase.from('campaign_subscriptions').delete().eq('campaign_id', id);
    const subRows = body.service_ids.map(sid => ({
      campaign_id: id,
      service_id: sid,
      provider_id: auth.user.id,
      status: 'active',
    }));
    const { error: subErr } = await supabase.from('campaign_subscriptions').insert(subRows);
    if (subErr) {
      console.error('[Promotions] PATCH subscriptions error:', subErr);
      return NextResponse.json({ error: 'Error actualizando servicios' }, { status: 500 });
    }
  }

  // 6. Update campaign fields (excluding service_ids which is already handled)
  const updateFields: Record<string, unknown> = {};
  if (body.external_name !== undefined) updateFields.external_name = body.external_name;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.discount_pct !== undefined) updateFields.discount_pct = body.discount_pct;
  if (body.end_date !== undefined) updateFields.end_date = body.end_date;
  if (body.usage_limit !== undefined) updateFields.usage_limit = body.usage_limit;
  if (body.max_uses_per_user !== undefined) updateFields.max_uses_per_user = body.max_uses_per_user;
  if (body.status !== undefined) updateFields.status = body.status;

  if (Object.keys(updateFields).length > 0) {
    updateFields.updated_at = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('campaigns')
      .update(updateFields)
      .eq('id', id);
    if (updateErr) {
      console.error('[Promotions] PATCH update error:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Error actualizando promocion' }, { status: 500 });
    }
  }

  // 7. Return updated record
  const { data: updated } = await supabase
    .from('campaigns')
    .select('*, subscriptions:campaign_subscriptions(*, service:services(id, title, slug, images, base_price))')
    .eq('id', id)
    .single();

  return NextResponse.json({ promotion: updated });
}

/**
 * DELETE /api/provider/promotions/[id]
 * Solo elimina si used_count=0. Si ya se uso, hace soft-cancel (status='cancelled').
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const supabase = createAdminSupabaseClient();
  const { data: existing } = await supabase
    .from('campaigns')
    .select('id, source, owner_provider_id, used_count')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Promocion no encontrada' }, { status: 404 });
  }
  if (existing.source !== 'provider' || existing.owner_provider_id !== auth.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if ((existing.used_count ?? 0) > 0) {
    // Soft cancel
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, soft_cancelled: true });
  }

  // Hard delete (subscriptions cascade automatically via FK ON DELETE CASCADE)
  const { error: delErr } = await supabase.from('campaigns').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

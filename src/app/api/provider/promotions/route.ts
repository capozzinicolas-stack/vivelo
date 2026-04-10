import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, CreateProviderPromotionSchema } from '@/lib/validations/api-schemas';
import { PROVIDER_PROMO_LIMITS } from '@/lib/constants';
import type { Campaign, CampaignStatus } from '@/types/database';

/**
 * GET /api/provider/promotions
 * Lista promociones del proveedor autenticado.
 * Query: ?status=active|draft|ended|cancelled
 */
export async function GET(request: Request) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') as CampaignStatus | null;

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from('campaigns')
    .select('*, subscriptions:campaign_subscriptions(*, service:services(id, title, slug, images, base_price, status))')
    .eq('source', 'provider')
    .eq('owner_provider_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) {
    console.error('[Promotions] GET error:', error);
    return NextResponse.json({ error: 'Error al listar promociones' }, { status: 500 });
  }

  return NextResponse.json({ promotions: data || [] });
}

/**
 * POST /api/provider/promotions
 * Crea una nueva promocion del proveedor.
 * Requisitos:
 *  - Maximo 5 promos activas por proveedor
 *  - Codigo de cupon unico (case-insensitive)
 *  - Todos los servicios deben pertenecer al proveedor
 */
export async function POST(request: Request) {
  const auth = await requireRole(['provider']);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, CreateProviderPromotionSchema);
  if (validation.error !== null) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.data!;
  const supabase = createAdminSupabaseClient();

  // 1. Check active promo limit
  const { count: activeCount, error: countErr } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'provider')
    .eq('owner_provider_id', auth.user.id)
    .eq('status', 'active');
  if (countErr) {
    console.error('[Promotions] count active error:', countErr);
    return NextResponse.json({ error: 'Error verificando limite de promociones' }, { status: 500 });
  }
  if (body.status === 'active' && (activeCount ?? 0) >= PROVIDER_PROMO_LIMITS.MAX_ACTIVE_PROMOS_PER_PROVIDER) {
    return NextResponse.json(
      { error: `Solo puedes tener ${PROVIDER_PROMO_LIMITS.MAX_ACTIVE_PROMOS_PER_PROVIDER} promociones activas a la vez. Pausa o elimina alguna primero.` },
      { status: 400 }
    );
  }

  // 2. Verify ownership of all selected services
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('id, provider_id')
    .in('id', body.service_ids);
  if (svcErr) {
    console.error('[Promotions] services lookup error:', svcErr);
    return NextResponse.json({ error: 'Error verificando servicios' }, { status: 500 });
  }
  if (!services || services.length !== body.service_ids.length) {
    return NextResponse.json({ error: 'Uno o mas servicios no existen' }, { status: 400 });
  }
  const notOwned = services.find(s => s.provider_id !== auth.user.id);
  if (notOwned) {
    return NextResponse.json({ error: 'No puedes incluir servicios de otro proveedor' }, { status: 403 });
  }

  // 3. Verify coupon code uniqueness (case-insensitive)
  const couponCode = body.coupon_code.toUpperCase().trim();
  const { data: existingCoupon } = await supabase
    .from('campaigns')
    .select('id')
    .ilike('coupon_code', couponCode)
    .maybeSingle();
  if (existingCoupon) {
    return NextResponse.json({ error: 'Este codigo de cupon ya esta en uso. Elige otro.' }, { status: 409 });
  }

  // 4. Insert campaign with provider invariants
  const { data: campaign, error: createErr } = await supabase
    .from('campaigns')
    .insert({
      internal_name: body.internal_name,
      external_name: body.external_name,
      description: body.description ?? null,
      discount_pct: body.discount_pct,
      commission_reduction_pct: 0,
      provider_absorbs_pct: 100,
      vivelo_absorbs_pct: 0,
      start_date: body.start_date,
      end_date: body.end_date,
      exposure_channels: [],
      status: body.status,
      source: 'provider',
      owner_provider_id: auth.user.id,
      coupon_code: couponCode,
      usage_limit: body.usage_limit ?? null,
      max_uses_per_user: body.max_uses_per_user ?? null,
    })
    .select()
    .single();

  if (createErr || !campaign) {
    console.error('[Promotions] create error:', createErr);
    return NextResponse.json({ error: createErr?.message || 'Error creando promocion' }, { status: 500 });
  }

  // 5. Create campaign_subscriptions for each service (one per service)
  const subRows = body.service_ids.map(sid => ({
    campaign_id: campaign.id,
    service_id: sid,
    provider_id: auth.user.id,
    status: 'active',
  }));
  const { error: subErr } = await supabase.from('campaign_subscriptions').insert(subRows);
  if (subErr) {
    // Rollback: delete the campaign so we don't leave orphans
    await supabase.from('campaigns').delete().eq('id', campaign.id);
    console.error('[Promotions] subscriptions insert error:', subErr);
    return NextResponse.json({ error: 'Error inscribiendo servicios a la promocion' }, { status: 500 });
  }

  // 6. Build share URL (uses the slug of the first service if available)
  const firstService = services[0];
  const { data: firstSvcDetail } = await supabase
    .from('services')
    .select('slug')
    .eq('id', firstService.id)
    .maybeSingle();
  const slug = firstSvcDetail?.slug || firstService.id;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const shareUrl = `${baseUrl}/servicios/${slug}?coupon=${couponCode}`;

  return NextResponse.json({ promotion: campaign as Campaign, share_url: shareUrl }, { status: 201 });
}

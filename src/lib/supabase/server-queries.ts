import { createServerSupabaseClient } from './server';
import { createAdminSupabaseClient } from './admin';
import type { Service, Profile, BlogPost, BlogPostLink, FeaturedPlacement, FeaturedSection, Campaign, CampaignSubscription, FeaturedProvider, ShowcaseItem, SiteBanner, CatalogCategory, CatalogZone, LandingPageBanner, LandingBannerPosition } from '@/types/database';

/**
 * Server-side query functions for SSR pages.
 * These use createServerSupabaseClient() (cookie-based server client) instead of
 * the browser client, so they can be called from Server Components and generateMetadata().
 */

// ─── SERVICES ───────────────────────────────────────────────

export async function getServiceByIdServer(id: string): Promise<Service | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*), provider:profiles!provider_id(*), cancellation_policy:cancellation_policies(*)')
    .eq('id', id)
    .single();
  if (!error) return data;

  console.warn('[getServiceByIdServer] Join query failed, trying simple:', error.message);
  const { data: fallback, error: err2 } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
  if (err2 || !fallback) return null;

  let provider = null;
  try {
    const adminSb = createAdminSupabaseClient();
    const { data: p } = await adminSb.from('profiles').select('*').eq('id', fallback.provider_id).single();
    if (p) provider = p;
  } catch { /* ignore */ }
  return { ...fallback, extras: [], provider } as unknown as Service;
}

export async function getServiceBySlugServer(slug: string): Promise<Service | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*), provider:profiles!provider_id(*), cancellation_policy:cancellation_policies(*)')
    .eq('slug', slug)
    .single();
  if (!error) return data;

  console.warn('[getServiceBySlugServer] Join query failed, trying simple:', error.message);
  const { data: fallback, error: err2 } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .single();
  if (err2 || !fallback) return null;

  let provider = null;
  try {
    const adminSb = createAdminSupabaseClient();
    const { data: p } = await adminSb.from('profiles').select('*').eq('id', fallback.provider_id).single();
    if (p) provider = p;
  } catch { /* ignore */ }
  return { ...fallback, extras: [], provider } as unknown as Service;
}

export async function getServicesByProviderServer(providerId: string): Promise<Service[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (!error) return data || [];

  console.warn('[getServicesByProviderServer] Join query failed, trying simple:', error.message);
  const { data: fallback, error: err2 } = await supabase
    .from('services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (err2) return [];
  return (fallback || []).map(s => ({ ...s, extras: [] }));
}

export async function getActiveServicesServer(): Promise<Service[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*), provider:profiles!provider_id(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (!error) return data || [];

  console.warn('[getActiveServicesServer] Join query failed, trying simple:', error.message);
  const { data: fallback } = await supabase
    .from('services')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return (fallback || []).map(s => ({ ...s, extras: [] }));
}

export async function enrichServicesWithTagsServer(services: Service[]): Promise<Service[]> {
  if (services.length === 0) return services;
  const supabase = createServerSupabaseClient();
  const serviceIds = services.map(s => s.id);
  const { data, error } = await supabase
    .from('service_tag_assignments')
    .select('service_id, tag_slug')
    .in('service_id', serviceIds);
  if (error) {
    console.warn('[enrichServicesWithTagsServer] Query failed:', error.message);
    return services;
  }
  const tagMap: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!tagMap[row.service_id]) tagMap[row.service_id] = [];
    tagMap[row.service_id].push(row.tag_slug);
  }
  return services.map(s => ({ ...s, tags: tagMap[s.id] || [] }));
}

export async function getRelatedServicesServer(categoryId: string, excludeId: string, limit = 4): Promise<Service[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, provider:profiles!provider_id(*)')
    .eq('status', 'active')
    .eq('category', categoryId)
    .neq('id', excludeId)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[getRelatedServicesServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

// ─── PROFILES ───────────────────────────────────────────────

export async function getProfileByIdServer(id: string): Promise<Profile | null> {
  // Use admin client to bypass RLS — profiles SELECT is now restricted to owner/admin only
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) {
    console.warn('[getProfileByIdServer] Failed:', error.message);
    return null;
  }
  return data;
}

export async function getProfileBySlugServer(slug: string): Promise<Profile | null> {
  // Use admin client to bypass RLS — profiles SELECT is now restricted to owner/admin only
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('slug', slug).single();
  if (error) {
    console.warn('[getProfileBySlugServer] Failed:', error.message);
    return null;
  }
  return data;
}

// ─── BLOG ───────────────────────────────────────────────────

export async function getBlogPostBySlugServer(slug: string): Promise<BlogPost | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error) {
    console.warn('[getBlogPostBySlugServer] Failed:', error.message);
    return null;
  }
  return data;
}

export async function getPublishedBlogPostsServer(): Promise<BlogPost[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('publish_date', new Date().toISOString())
    .order('publish_date', { ascending: false });
  if (error) {
    console.warn('[getPublishedBlogPostsServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getBlogPostLinksServer(blogPostId: string): Promise<BlogPostLink[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('blog_post_links')
    .select('*, service:services(id, slug, title, images, base_price, avg_rating, review_count, zones, category, status, provider_id, subcategory, description, price_unit, min_guests, max_guests, min_hours, max_hours, base_event_hours, buffer_before_minutes, buffer_after_minutes, buffer_before_days, buffer_after_days, deletion_requested, deletion_requested_at, view_count, videos, sku, created_at, updated_at), provider:profiles(id, slug, full_name, company_name, avatar_url, verified, role, email, phone, bio, max_concurrent_services, apply_buffers_to_all, global_buffer_before_minutes, global_buffer_after_minutes, rfc, clabe, bank_document_url, banking_status, banking_rejection_reason, commission_rate, must_change_password, created_at, updated_at)')
    .eq('blog_post_id', blogPostId);
  if (error) {
    console.warn('[getBlogPostLinksServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getRelatedBlogPostsServer(postId: string, tags: string[], limit = 3): Promise<BlogPost[]> {
  if (tags.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, media_type, publish_date, tags')
    .eq('status', 'published')
    .neq('id', postId)
    .lte('publish_date', new Date().toISOString())
    .overlaps('tags', tags)
    .order('publish_date', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[getRelatedBlogPostsServer] Query failed:', error.message);
    return [];
  }
  return (data || []) as BlogPost[];
}

// ─── BOOKINGS (counts) ─────────────────────────────────────

export async function getServiceBookingCountServer(serviceId: string): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)
    .in('status', ['confirmed', 'completed']);
  if (error) {
    console.warn('[getServiceBookingCountServer] Query failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function getProviderBookingCountServer(providerId: string): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .in('status', ['confirmed', 'completed']);
  if (error) {
    console.warn('[getProviderBookingCountServer] Query failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function getProviderReviewsServer(providerId: string, limit = 5): Promise<Array<{ id: string; rating: number; comment: string | null; created_at: string; client?: { full_name: string }; service?: { title: string; slug: string } }>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, client:profiles!client_id(full_name), service:services!service_id(title, slug, provider_id)')
    .eq('status', 'approved')
    .not('comment', 'is', null)
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[getProviderReviewsServer] Query failed:', error.message);
    return [];
  }
  // Filter by provider_id (supabase doesn't allow filtering on joined fields directly)
  const filtered = (data || [])
    .filter((r: Record<string, unknown>) => {
      const svc = Array.isArray(r.service) ? r.service[0] : r.service;
      return svc && (svc as Record<string, unknown>).provider_id === providerId;
    })
    .slice(0, limit)
    .map((row: Record<string, unknown>) => {
      const svc = Array.isArray(row.service) ? row.service[0] : row.service;
      return {
        ...row,
        client: Array.isArray(row.client) ? row.client[0] : row.client,
        service: svc ? { title: (svc as Record<string, string>).title, slug: (svc as Record<string, string>).slug } : undefined,
      };
    });
  return filtered as Array<{ id: string; rating: number; comment: string | null; created_at: string; client?: { full_name: string }; service?: { title: string; slug: string } }>;
}

// ─── REVIEWS ────────────────────────────────────────────────

export async function getReviewsByServiceServer(serviceId: string): Promise<Array<{ id: string; rating: number; comment: string | null; created_at: string; client?: Profile }>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*, client:profiles!client_id(*)')
    .eq('service_id', serviceId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getReviewsByServiceServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getTopRatedReviewsServer(limit = 6): Promise<Array<{ id: string; rating: number; comment: string | null; created_at: string; client?: { full_name: string }; service?: { title: string; slug: string } }>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, client:profiles!client_id(full_name), service:services!service_id(title, slug)')
    .eq('status', 'approved')
    .gte('rating', 4)
    .not('comment', 'is', null)
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[getTopRatedReviewsServer] Query failed:', error.message);
    return [];
  }
  // Supabase returns single-row joins as arrays; normalize to single objects
  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    client: Array.isArray(row.client) ? row.client[0] : row.client,
    service: Array.isArray(row.service) ? row.service[0] : row.service,
  })) as Array<{ id: string; rating: number; comment: string | null; created_at: string; client?: { full_name: string }; service?: { title: string; slug: string } }>;
}

// ─── HOMEPAGE DATA ──────────────────────────────────────────

export async function getFeaturedPlacementsServer(section?: FeaturedSection): Promise<FeaturedPlacement[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('featured_placements')
    .select('*, service:services(*, provider:profiles!provider_id(*))')
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .order('position', { ascending: true });
  if (section) query = query.eq('section', section);
  const { data, error } = await query;
  if (error) {
    console.warn('[getFeaturedPlacementsServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getActiveCampaignsWithServicesServer(): Promise<(Campaign & { subscriptions: CampaignSubscription[] })[]> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, subscriptions:campaign_subscriptions(*, service:services(*, provider:profiles!provider_id(*)))')
    .eq('status', 'active')
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getActiveCampaignsWithServicesServer] Query failed:', error.message);
    return [];
  }
  return (data || []) as (Campaign & { subscriptions: CampaignSubscription[] })[];
}

/**
 * Active ADMIN campaign auto-applied to a service. Provider promotions
 * (source='provider') are NEVER auto-applied — they require a coupon.
 */
export async function getActiveCampaignForServiceServer(serviceId: string): Promise<Campaign | null> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('campaign_subscriptions')
    .select('campaign:campaigns(*)')
    .eq('service_id', serviceId)
    .eq('status', 'active');
  if (error || !data) return null;

  for (const row of data) {
    const campaign = row.campaign as unknown as Campaign | null;
    if (!campaign) continue;
    if ((campaign.source ?? 'admin') !== 'admin') continue;
    if (campaign.status !== 'active') continue;
    if (campaign.start_date > now || campaign.end_date < now) continue;
    return campaign;
  }
  return null;
}

/**
 * Server-side coupon validation. Used by SSR pages (e.g. service detail
 * with ?coupon=XYZ in the URL) and by API routes that need to verify
 * a coupon under the user's RLS context.
 *
 * Logic:
 *   1. Lookup campaign by upper(coupon_code), source='provider'
 *   2. Verify status='active' and current date in [start_date, end_date]
 *   3. Verify service is subscribed to this campaign
 *   4. Verify used_count < usage_limit (when defined)
 *   5. Verify NO active admin campaign exists for this service (no stacking)
 */
export async function validateCouponServer(
  serviceId: string,
  couponCode: string
): Promise<{ valid: true; campaign: Campaign } | { valid: false; error: string }> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const code = couponCode.trim();
  if (!code) return { valid: false, error: 'Codigo vacio' };

  // 1. Lookup campaign by coupon_code (case-insensitive via ilike on stored value)
  const { data: campaigns, error: cErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('source', 'provider')
    .ilike('coupon_code', code)
    .limit(1);
  if (cErr) {
    console.warn('[validateCouponServer] lookup failed:', cErr.message);
    return { valid: false, error: 'Cupon no encontrado' };
  }
  const campaign = (campaigns?.[0] || null) as Campaign | null;
  if (!campaign) return { valid: false, error: 'Cupon no encontrado' };

  // 2. Status + dates
  if (campaign.status !== 'active') return { valid: false, error: 'Este cupon no esta activo' };
  if (campaign.start_date > now) return { valid: false, error: 'Este cupon aun no esta vigente' };
  if (campaign.end_date < now) return { valid: false, error: 'Este cupon ya expiro' };

  // 3. Subscription check
  const { data: sub, error: sErr } = await supabase
    .from('campaign_subscriptions')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('service_id', serviceId)
    .eq('status', 'active')
    .maybeSingle();
  if (sErr || !sub) return { valid: false, error: 'Este cupon no aplica para este servicio' };

  // 4. Usage limit
  if (campaign.usage_limit != null && campaign.used_count >= campaign.usage_limit) {
    return { valid: false, error: 'Este cupon ya alcanzo su limite de usos' };
  }

  // 5. Conflict with active admin campaign on the same service
  const adminCampaign = await getActiveCampaignForServiceServer(serviceId);
  if (adminCampaign) {
    return { valid: false, error: 'Este servicio ya tiene un descuento activo y no es compatible con cupones' };
  }

  return { valid: true, campaign };
}

/**
 * SSR helper used by the service detail page. If a coupon was passed in
 * the URL (?coupon=XYZ), validates it; otherwise falls back to the
 * legacy admin auto-discovery. Returns the campaign + the coupon code
 * used (so the client component can render the badge / persist the
 * code in the cart item).
 */
export async function getActiveCampaignForServiceWithCouponServer(
  serviceId: string,
  couponCode?: string | null
): Promise<{ campaign: Campaign | null; couponCode: string | null }> {
  if (couponCode && couponCode.trim()) {
    const result = await validateCouponServer(serviceId, couponCode.trim());
    if (result.valid) {
      return { campaign: result.campaign, couponCode: result.campaign.coupon_code };
    }
    // Invalid coupon: fall through to admin auto-discovery (so the page still renders)
  }
  const adminCampaign = await getActiveCampaignForServiceServer(serviceId);
  return { campaign: adminCampaign, couponCode: null };
}

export async function getActiveFeaturedProvidersServer(): Promise<FeaturedProvider[]> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('featured_providers')
    .select('*, provider:profiles!provider_id(*)')
    .lte('start_date', now)
    .gte('end_date', now)
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getActiveFeaturedProvidersServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getActiveShowcaseItemsServer(): Promise<ShowcaseItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('showcase_items')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getActiveShowcaseItemsServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getActiveSiteBannersServer(): Promise<SiteBanner[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('site_banners')
    .select('*')
    .eq('is_active', true);
  if (error) {
    console.warn('[getActiveSiteBannersServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getNewServicesServer(days = 15): Promise<Service[]> {
  const supabase = createServerSupabaseClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { data, error } = await supabase
    .from('services')
    .select('*, provider:profiles!provider_id(*)')
    .eq('status', 'active')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    console.warn('[getNewServicesServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getTopRatedServicesServer(limit = 20): Promise<Service[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, provider:profiles!provider_id(*)')
    .eq('status', 'active')
    .gt('review_count', 0)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[getTopRatedServicesServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getMostBookedServicesServer(limit = 10): Promise<(Service & { booking_count: number })[]> {
  const supabase = createAdminSupabaseClient();
  // Step 1: Fetch confirmed/completed booking service IDs
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('service_id')
    .in('status', ['confirmed', 'completed']);
  if (bookingsError || !bookings || bookings.length === 0) {
    console.warn('[getMostBookedServicesServer] Bookings query failed or empty:', bookingsError?.message);
    return [];
  }
  // Count bookings per service
  const counts = new Map<string, number>();
  for (const b of bookings) {
    counts.set(b.service_id, (counts.get(b.service_id) || 0) + 1);
  }
  // Sort by count descending, take top N
  const topServiceIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (topServiceIds.length === 0) return [];
  // Step 2: Fetch service details
  const serverSupabase = createServerSupabaseClient();
  const { data: services, error: servicesError } = await serverSupabase
    .from('services')
    .select('*, provider:profiles!provider_id(*)')
    .in('id', topServiceIds)
    .eq('status', 'active');
  if (servicesError || !services) {
    console.warn('[getMostBookedServicesServer] Services query failed:', servicesError?.message);
    return [];
  }
  // Sort by booking count and attach count
  return services
    .map(s => ({ ...s, booking_count: counts.get(s.id) || 0 }))
    .sort((a, b) => b.booking_count - a.booking_count);
}

// ─── CATALOG (categories/zones for landing pages) ────────

export async function getActiveCategoriesServer(): Promise<CatalogCategory[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('[getActiveCategoriesServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getActiveZonesServer(): Promise<CatalogZone[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('service_zones')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('[getActiveZonesServer] Query failed:', error.message);
    return [];
  }
  return data || [];
}

// ─── LANDING PAGE BANNERS ────────────────────────────────

export async function getLandingBannersServer(context: {
  category?: string;
  zone?: string;
  eventType?: string;
}): Promise<{ hero: LandingPageBanner | null; mid_feed: LandingPageBanner | null; bottom: LandingPageBanner | null }> {
  const supabase = createServerSupabaseClient();
  const { data: banners, error } = await supabase
    .from('landing_page_banners')
    .select('*, provider:profiles!provider_id(company_name, full_name, avatar_url, slug)')
    .eq('is_active', true)
    .order('priority', { ascending: false });
  if (error || !banners) {
    console.warn('[getLandingBannersServer] Query failed:', error?.message);
    return { hero: null, mid_feed: null, bottom: null };
  }
  const now = new Date().toISOString();
  // Filter by date range and context matching
  const matching = (banners as LandingPageBanner[]).filter(b => {
    if (b.start_date && b.start_date > now) return false;
    if (b.end_date && b.end_date < now) return false;
    const catMatch = !b.target_category || b.target_category === context.category;
    const zoneMatch = !b.target_zone || b.target_zone === context.zone;
    const eventMatch = !b.target_event_type || b.target_event_type === context.eventType;
    return catMatch && zoneMatch && eventMatch;
  });
  const pickBest = (position: LandingBannerPosition): LandingPageBanner | null => {
    const candidates = matching.filter(b => b.position === position);
    if (candidates.length === 0) return null;
    // More specific targets win over generic (NULL) ones
    candidates.sort((a, b) => {
      const specA = [a.target_category, a.target_zone, a.target_event_type].filter(Boolean).length;
      const specB = [b.target_category, b.target_zone, b.target_event_type].filter(Boolean).length;
      if (specB !== specA) return specB - specA;
      return b.priority - a.priority;
    });
    return candidates[0];
  };
  return {
    hero: pickBest('hero'),
    mid_feed: pickBest('mid_feed'),
    bottom: pickBest('bottom'),
  };
}

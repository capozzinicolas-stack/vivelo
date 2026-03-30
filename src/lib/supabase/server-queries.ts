import { createServerSupabaseClient } from './server';
import type { Service, Profile, BlogPost, BlogPostLink, FeaturedPlacement, FeaturedSection, Campaign, CampaignSubscription, FeaturedProvider, ShowcaseItem, SiteBanner, CatalogCategory, CatalogZone } from '@/types/database';

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
    const { data: p } = await supabase.from('profiles').select('*').eq('id', fallback.provider_id).single();
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
    const { data: p } = await supabase.from('profiles').select('*').eq('id', fallback.provider_id).single();
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

// ─── PROFILES ───────────────────────────────────────────────

export async function getProfileByIdServer(id: string): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) {
    console.warn('[getProfileByIdServer] Failed:', error.message);
    return null;
  }
  return data;
}

export async function getProfileBySlugServer(slug: string): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();
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
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)
    .in('status', ['confirmed', 'completed'])
    .lt('event_date', today);
  if (error) {
    console.warn('[getServiceBookingCountServer] Query failed:', error.message);
    return 0;
  }
  return count ?? 0;
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
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, subscriptions:campaign_subscriptions(*, service:services(*, provider:profiles!provider_id(*)))')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getActiveCampaignsWithServicesServer] Query failed:', error.message);
    return [];
  }
  return (data || []) as (Campaign & { subscriptions: CampaignSubscription[] })[];
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
    .limit(20);
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

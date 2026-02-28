import { createServerSupabaseClient } from './server';
import type { Service, Profile, BlogPost, FeaturedPlacement, FeaturedSection, Campaign, CampaignSubscription, FeaturedProvider, ShowcaseItem, SiteBanner } from '@/types/database';

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
    .select('*, extras(*), provider:profiles!provider_id(*)')
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

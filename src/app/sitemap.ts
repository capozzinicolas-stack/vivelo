import type { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EVENT_TYPES } from '@/data/event-types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/servicios`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  let servicePages: MetadataRoute.Sitemap = [];
  let blogPages: MetadataRoute.Sitemap = [];
  let providerPages: MetadataRoute.Sitemap = [];
  let categoryPages: MetadataRoute.Sitemap = [];
  let categoryZonePages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerSupabaseClient();

    // Active services
    const { data: services } = await supabase
      .from('services')
      .select('id, slug, updated_at, category, zones')
      .eq('status', 'active');

    if (services) {
      servicePages = services.map((s) => ({
        url: `${siteUrl}/servicios/${s.slug}`,
        lastModified: new Date(s.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }

    // Published blog posts
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published');

    if (posts) {
      blogPages = posts.map((p) => ({
        url: `${siteUrl}/blog/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    }

    // Active providers (only those with at least one active service)
    const { data: activeProviderIds } = await supabase
      .from('services')
      .select('provider_id')
      .eq('status', 'active');
    const providerIdSet = new Set((activeProviderIds || []).map(s => s.provider_id));

    const { data: providers } = await supabase
      .from('profiles')
      .select('id, slug, updated_at')
      .eq('role', 'provider');

    if (providers) {
      providerPages = providers
        .filter(p => providerIdSet.has(p.id))
        .map((p) => ({
          url: `${siteUrl}/proveedores/${p.slug}`,
          lastModified: new Date(p.updated_at),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }));
    }

    // Category pages (from active categories in DB)
    const { data: dbCategories } = await supabase
      .from('service_categories')
      .select('slug')
      .eq('is_active', true);

    if (dbCategories) {
      categoryPages = dbCategories.map(c => ({
        url: `${siteUrl}/servicios/categoria/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }

    // Category+Zone pages (only combos that have at least one service)
    const { data: dbZones } = await supabase
      .from('service_zones')
      .select('slug, label')
      .eq('is_active', true);

    if (services && dbCategories && dbZones) {
      const zoneSlugByLabel = Object.fromEntries((dbZones || []).map(z => [z.label, z.slug]));
      const combosWithServices = new Set<string>();
      for (const s of services) {
        for (const zoneLabel of (s.zones || [])) {
          const zoneSlug = zoneSlugByLabel[zoneLabel];
          if (zoneSlug) {
            combosWithServices.add(`${s.category}|${zoneSlug}`);
          }
        }
      }
      categoryZonePages = Array.from(combosWithServices).map(combo => {
        const [cat, zon] = combo.split('|');
        return {
          url: `${siteUrl}/servicios/categoria/${cat}/${zon}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        };
      });
    }
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic data:', error);
  }

  // Zone landing pages
  const zonePages: MetadataRoute.Sitemap = [
    'ciudad-de-mexico', 'estado-de-mexico', 'toluca', 'puebla', 'hidalgo', 'queretaro', 'guanajuato', 'tlaxcala', 'morelos',
  ].map(zona => ({
    url: `${siteUrl}/servicios/zona/${zona}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Event type landing pages
  const eventTypePages: MetadataRoute.Sitemap = EVENT_TYPES.map(et => ({
    url: `${siteUrl}/eventos/${et.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...servicePages,
    ...blogPages,
    ...providerPages,
    ...zonePages,
    ...categoryPages,
    ...categoryZonePages,
    ...eventTypePages,
  ];
}

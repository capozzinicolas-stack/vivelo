import type { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  try {
    const supabase = createServerSupabaseClient();

    // Active services
    const { data: services } = await supabase
      .from('services')
      .select('id, updated_at')
      .eq('status', 'active');

    if (services) {
      servicePages = services.map((s) => ({
        url: `${siteUrl}/servicios/${s.id}`,
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

    // Active providers (those with at least one active service)
    const { data: providers } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .eq('role', 'provider');

    if (providers) {
      providerPages = providers.map((p) => ({
        url: `${siteUrl}/proveedores/${p.id}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic data:', error);
  }

  // Zone landing pages
  const zonePages: MetadataRoute.Sitemap = [
    'cdmx', 'estado-de-mexico', 'guadalajara', 'monterrey', 'puebla', 'queretaro', 'cancun',
  ].map(zona => ({
    url: `${siteUrl}/servicios/zona/${zona}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...blogPages, ...providerPages, ...zonePages];
}

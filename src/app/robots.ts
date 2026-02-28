import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin-portal/', '/dashboard/', '/api/', '/checkout/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

import type { Metadata } from 'next';
import { getActiveServicesServer, enrichServicesWithTagsServer, getFeaturedPlacementsServer } from '@/lib/supabase/server-queries';
import { ServiciosListClient } from './servicios-list-client';
import type { Service } from '@/types/database';

export const metadata: Metadata = {
  title: 'Servicios para Eventos',
  description: 'Encuentra el servicio perfecto para tu evento en México. Catering, audio, decoracion, fotografia, mobiliario y mas.',
  openGraph: {
    title: 'Servicios para Eventos - Vivelo',
    description: 'Encuentra el servicio perfecto para tu evento en México',
  },
};

export default async function ServiciosPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  let services: Service[] = [];
  let sponsoredServices: Service[] = [];

  try {
    const [rawServices, placements] = await Promise.all([
      getActiveServicesServer(),
      getFeaturedPlacementsServer('servicios_destacados'),
    ]);
    services = await enrichServicesWithTagsServer(rawServices);
    const featuredIds = new Set(placements.map(p => p.service_id));
    sponsoredServices = services.filter(s => featuredIds.has(s.id));
  } catch (error) {
    console.error('[ServiciosPage] Error loading data:', error);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Servicios para Eventos en México',
    numberOfItems: services.length,
    itemListElement: services.slice(0, 30).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/servicios/${s.slug}`,
      name: s.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiciosListClient initialServices={services} initialSponsoredServices={sponsoredServices} />
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActiveServicesServer, enrichServicesWithTagsServer, getActiveCategoriesServer, getActiveZonesServer } from '@/lib/supabase/server-queries';
import { LandingGridClient } from '@/components/services/landing-grid-client';
import { Badge } from '@/components/ui/badge';
import { EVENT_TYPES, EVENT_TYPE_MAP } from '@/data/event-types';
import type { Service } from '@/types/database';

interface Props {
  params: { tipo: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const eventType = EVENT_TYPE_MAP[params.tipo];
  if (!eventType) return { title: 'Eventos' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  return {
    title: eventType.metaTitle,
    description: eventType.metaDescription,
    alternates: { canonical: `${siteUrl}/eventos/${params.tipo}` },
    openGraph: {
      title: `${eventType.metaTitle} | Vivelo`,
      description: eventType.metaDescription,
    },
  };
}

export default async function EventoTipoPage({ params }: Props) {
  const eventType = EVENT_TYPE_MAP[params.tipo];
  if (!eventType) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  let services: Service[] = [];
  try {
    const rawServices = await getActiveServicesServer();
    services = await enrichServicesWithTagsServer(rawServices);
    // Sort: highlighted categories first, then the rest
    const highlightSet = new Set(eventType.highlightCategories);
    services.sort((a, b) => {
      const aHighlighted = highlightSet.has(a.category) ? 0 : 1;
      const bHighlighted = highlightSet.has(b.category) ? 0 : 1;
      return aHighlighted - bHighlighted;
    });
  } catch (error) {
    console.error('[EventoTipoPage] Error loading services:', error);
  }

  let categories: { slug: string; label: string }[] = [];
  let zones: { slug: string; label: string }[] = [];
  try {
    [categories, zones] = await Promise.all([
      getActiveCategoriesServer(),
      getActiveZonesServer(),
    ]);
  } catch { /* fallback empty */ }

  const otherEventTypes = EVENT_TYPES.filter(et => et.slug !== params.tipo);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: eventType.heading,
    numberOfItems: services.length,
    itemListElement: services.slice(0, 30).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/servicios/${s.slug}`,
      name: s.title,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Eventos', item: `${siteUrl}/eventos/${params.tipo}` },
      { '@type': 'ListItem', position: 3, name: eventType.label, item: `${siteUrl}/eventos/${params.tipo}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm text-muted-foreground flex items-center gap-1.5">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <span>/</span>
          <span className="text-foreground">{eventType.label}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{eventType.heading}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">{eventType.intro}</p>
        </div>

        <LandingGridClient services={services} />

        {/* SEO content */}
        <div className="mt-12 prose prose-gray max-w-none">
          <p className="text-muted-foreground">{eventType.content}</p>
        </div>

        {/* Internal links: categories */}
        {categories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Explora por categoria</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <Link key={c.slug} href={`/servicios/categoria/${c.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{c.label}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Internal links: zones */}
        {zones.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Servicios para {eventType.label.toLowerCase()} por zona</h2>
            <div className="flex flex-wrap gap-2">
              {zones.map(z => (
                <Link key={z.slug} href={`/servicios/zona/${z.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{z.label}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Internal links: other event types */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Otros tipos de eventos</h2>
          <div className="flex flex-wrap gap-2">
            {otherEventTypes.map(et => (
              <Link key={et.slug} href={`/eventos/${et.slug}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{et.label}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/servicios" className="text-primary hover:underline font-medium">
            Ver todos los servicios →
          </Link>
        </div>
      </div>
    </>
  );
}

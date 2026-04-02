import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActiveServicesServer, enrichServicesWithTagsServer, getActiveCategoriesServer, getActiveZonesServer } from '@/lib/supabase/server-queries';
import { LandingPageClient } from '@/components/services/landing-page-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
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

  const categoryCounts = categories.map(c => ({
    label: c.label,
    href: `/servicios/categoria/${c.slug}`,
    count: services.filter(s => s.category === c.slug).length,
  })).filter(c => c.count > 0);

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
          {services.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">{services.length} servicio{services.length !== 1 ? 's' : ''} · {categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        <LandingPageClient
          services={services}
          emptyStateTitle={`Aun no hay servicios para ${eventType.label.toLowerCase()}`}
          emptyStateSuggestions={categoryCounts.slice(0, 5)}
          emptyStateCta={{ label: 'Ver todos los servicios', href: '/servicios' }}
        />

        {/* SEO content */}
        <div className="mt-12 prose prose-gray max-w-none">
          <p className="text-muted-foreground">{eventType.content}</p>
        </div>

        {/* Internal links: categories */}
        {categories.length > 0 && (
          <CollapsibleSection title="Explora por categoria" defaultOpen>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <Link key={c.slug} href={`/servicios/categoria/${c.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{c.label}</Badge>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Internal links: zones */}
        {zones.length > 0 && (
          <CollapsibleSection title={`Servicios para ${eventType.label.toLowerCase()} por zona`}>
            <div className="flex flex-wrap gap-2">
              {zones.map(z => (
                <Link key={z.slug} href={`/servicios/zona/${z.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{z.label}</Badge>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Internal links: other event types */}
        <CollapsibleSection title="Otros tipos de eventos">
          <div className="flex flex-wrap gap-2">
            {otherEventTypes.map(et => (
              <Link key={et.slug} href={`/eventos/${et.slug}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{et.label}</Badge>
              </Link>
            ))}
          </div>
        </CollapsibleSection>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/servicios">
            <Button variant="outline">Ver todos los servicios</Button>
          </Link>
        </div>
      </div>
    </>
  );
}

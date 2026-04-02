import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActiveServicesServer, enrichServicesWithTagsServer, getActiveCategoriesServer, getActiveZonesServer } from '@/lib/supabase/server-queries';
import { LandingPageClient } from '@/components/services/landing-page-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { VIVELO_ZONES } from '@/lib/constants';
import { categories as fallbackCategories } from '@/data/categories';
import type { Service } from '@/types/database';

interface Props {
  params: { categoria: string; zona: string };
  searchParams: { subcategoria?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = fallbackCategories.find(c => c.value === params.categoria);
  const zone = VIVELO_ZONES.find(z => z.slug === params.zona);
  if (!category || !zone) return { title: 'Servicios' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const title = `${category.label} en ${zone.label} - Servicios para Eventos`;
  const description = `Encuentra proveedores de ${category.label.toLowerCase()} para eventos en ${zone.label}. ${category.description}. Cotiza en Vivelo.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/servicios/categoria/${params.categoria}/${params.zona}` },
    openGraph: { title: `${title} | Vivelo`, description },
  };
}

export default async function CategoriaZonaLandingPage({ params, searchParams }: Props) {
  const category = fallbackCategories.find(c => c.value === params.categoria);
  const zone = VIVELO_ZONES.find(z => z.slug === params.zona);
  if (!category || !zone) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  let allEnriched: Service[] = [];
  let services: Service[] = [];
  try {
    const rawServices = await getActiveServicesServer();
    allEnriched = await enrichServicesWithTagsServer(rawServices);
    services = allEnriched.filter(s => s.category === params.categoria && s.zones.includes(zone.label));
  } catch (error) {
    console.error('[CategoriaZonaLandingPage] Error loading services:', error);
  }

  let allZones: { slug: string; label: string }[] = [];
  let allCategories: { slug: string; label: string }[] = [];
  try {
    [allZones, allCategories] = await Promise.all([
      getActiveZonesServer(),
      getActiveCategoriesServer(),
    ]);
  } catch { /* fallback empty */ }

  const otherZones = allZones.filter(z => z.slug !== params.zona);
  const otherCategories = allCategories.filter(c => c.slug !== params.categoria);

  const zoneSuggestions = otherZones.map(z => ({
    label: `${category.label} en ${z.label}`,
    href: `/servicios/categoria/${params.categoria}/${z.slug}`,
    count: allEnriched.filter(s => s.category === params.categoria && s.zones.includes(z.label)).length,
  })).filter(s => s.count > 0).slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.label} en ${zone.label}`,
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
      { '@type': 'ListItem', position: 2, name: 'Servicios', item: `${siteUrl}/servicios` },
      { '@type': 'ListItem', position: 3, name: category.label, item: `${siteUrl}/servicios/categoria/${params.categoria}` },
      { '@type': 'ListItem', position: 4, name: zone.label, item: `${siteUrl}/servicios/categoria/${params.categoria}/${params.zona}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <span>/</span>
          <Link href="/servicios" className="hover:text-foreground">Servicios</Link>
          <span>/</span>
          <Link href={`/servicios/categoria/${params.categoria}`} className="hover:text-foreground">{category.label}</Link>
          <span>/</span>
          <span className="text-foreground">{zone.label}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{category.label} en {zone.label}</h1>
          <p className="text-muted-foreground mt-2">
            Encuentra proveedores de {category.label.toLowerCase()} para tu evento en {zone.label}. {category.description}.
          </p>
          {services.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">{services.length} servicio{services.length !== 1 ? 's' : ''} disponible{services.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        <LandingPageClient
          services={services}
          initialCategory={params.categoria}
          initialSubcategory={searchParams?.subcategoria || ''}
          initialZone={zone.label}
          hideCategory
          hideZone
          emptyStateTitle={`Aun no hay ${category.label.toLowerCase()} en ${zone.label}`}
          emptyStateSuggestions={zoneSuggestions}
          emptyStateCta={{ label: `Ver todos ${category.label.toLowerCase()}`, href: `/servicios/categoria/${params.categoria}` }}
        />

        {/* Internal links: same category in other zones */}
        {otherZones.length > 0 && (
          <CollapsibleSection title={`${category.label} en otras zonas`} defaultOpen>
            <div className="flex flex-wrap gap-2">
              {otherZones.map(z => (
                <Link key={z.slug} href={`/servicios/categoria/${params.categoria}/${z.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{z.label}</Badge>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Internal links: other categories in this zone */}
        {otherCategories.length > 0 && (
          <CollapsibleSection title={`Otros servicios en ${zone.label}`}>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map(c => (
                <Link key={c.slug} href={`/servicios/categoria/${c.slug}/${params.zona}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{c.label}</Badge>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Related links */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={`/servicios/categoria/${params.categoria}`}>
            <Button variant="outline">Ver todos {category.label.toLowerCase()}</Button>
          </Link>
          <Link href={`/servicios/zona/${params.zona}`}>
            <Button variant="outline">Servicios en {zone.label}</Button>
          </Link>
          <Link href="/servicios">
            <Button variant="outline">Ver todos los servicios</Button>
          </Link>
        </div>
      </div>
    </>
  );
}

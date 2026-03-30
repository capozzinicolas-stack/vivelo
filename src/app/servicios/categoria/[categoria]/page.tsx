import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActiveServicesServer, enrichServicesWithTagsServer, getActiveCategoriesServer, getActiveZonesServer } from '@/lib/supabase/server-queries';
import { LandingGridClient } from '@/components/services/landing-grid-client';
import { Badge } from '@/components/ui/badge';
import { categories as fallbackCategories } from '@/data/categories';
import type { Service } from '@/types/database';

interface Props {
  params: { categoria: string };
}

function getCategoryContent(slug: string): { description: string; content: string } | null {
  const contents: Record<string, { description: string; content: string }> = {
    FOOD_DRINKS: {
      description: 'Taquizas, catering por tiempos, estaciones de comida, barras de bebidas, reposteria y mas para tu evento.',
      content: 'La comida es el corazon de todo evento. En Vivelo encontraras proveedores de catering para todos los gustos y presupuestos: desde taquizas tradicionales y estaciones de food trucks hasta catering gourmet por tiempos. Tambien barras de cocteleria de autor, mesas de dulces, coffee break para corporativos y mucho mas. Todos nuestros proveedores son verificados y ofrecen precios transparentes.',
    },
    AUDIO: {
      description: 'DJs, mariachis, grupos en vivo, bandas, karaoke, animadores y entretenimiento profesional para tu evento.',
      content: 'La musica y el entretenimiento definen la atmosfera de tu evento. Desde DJs profesionales con sonido e iluminacion, mariachis para la tradicion, grupos en vivo y bandas para la fiesta, hasta karaoke, animadores, comediantes y shows interactivos. En Vivelo encuentras opciones para todo tipo de celebracion — compara precios y disponibilidad de forma facil.',
    },
    DECORATION: {
      description: 'Decoracion floral, globos, backdrops, centros de mesa, iluminacion ambiental y ambientacion tematica.',
      content: 'La decoracion transforma cualquier espacio en algo magico. Explora proveedores de decoracion floral natural y artificial, montajes con globos y backdrops, centros de mesa personalizados, iluminacion ambiental y escenografia tematica. Ya sea un estilo rustico, minimalista, elegante o bohemio, encontraras el proveedor perfecto para tu vision.',
    },
    PHOTO_VIDEO: {
      description: 'Fotografia profesional, videografia, drones, cabinas 360, photobooths y sesiones privadas para tu evento.',
      content: 'Captura cada momento de tu evento con los mejores profesionales de foto y video. Encontraras fotografos de eventos con experiencia, videografos cinematograficos, servicio de dron para tomas aereas, cabinas 360, photobooths con impresiones al instante y sesiones privadas pre-evento. Todo con portfolios que puedes revisar antes de contratar.',
    },
    STAFF: {
      description: 'Meseros, bartenders, chefs en sitio, coordinadores, hostess, seguridad, valet parking y mas.',
      content: 'El staff profesional es la clave para que tu evento fluya sin contratiempos. En Vivelo encontraras meseros capacitados, bartenders profesionales, chefs en sitio, coordinadores y planners, hostess, personal de limpieza, seguridad, valet parking y nineras. Todos los proveedores ofrecen personal con experiencia en eventos.',
    },
    FURNITURE: {
      description: 'Mesas, sillas, lounge, carpas, tarimas, pistas de baile, pantallas LED, plantas de luz y clima.',
      content: 'El mobiliario y equipo adecuado hacen la diferencia en cualquier evento. Renta sillas y mesas en diversos estilos, salas lounge para areas VIP, carpas para eventos al aire libre, tarimas y escenarios, pistas de baile, pantallas LED y proyectores, plantas de luz y sistemas de climatizacion. Compara opciones y arma el montaje perfecto.',
    },
  };
  return contents[slug] || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fallback = fallbackCategories.find(c => c.value === params.categoria);
  if (!fallback) return { title: 'Categoria' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const title = `${fallback.label} para Eventos en Mexico`;
  const description = `Encuentra proveedores de ${fallback.label.toLowerCase()} para tu evento. ${fallback.description}. Cotiza y reserva en Vivelo.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/servicios/categoria/${params.categoria}` },
    openGraph: { title: `${title} | Vivelo`, description },
  };
}

export default async function CategoriaLandingPage({ params }: Props) {
  const fallback = fallbackCategories.find(c => c.value === params.categoria);
  if (!fallback) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const categoryContent = getCategoryContent(params.categoria);

  let services: Service[] = [];
  try {
    const rawServices = await getActiveServicesServer();
    const enriched = await enrichServicesWithTagsServer(rawServices);
    services = enriched.filter(s => s.category === params.categoria);
  } catch (error) {
    console.error('[CategoriaLandingPage] Error loading services:', error);
  }

  let zones: { slug: string; label: string }[] = [];
  let categories: { slug: string; label: string }[] = [];
  try {
    [zones, categories] = await Promise.all([
      getActiveZonesServer(),
      getActiveCategoriesServer(),
    ]);
  } catch { /* fallback empty */ }

  const otherCategories = categories.filter(c => c.slug !== params.categoria);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${fallback.label} para Eventos en Mexico`,
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
      { '@type': 'ListItem', position: 3, name: fallback.label, item: `${siteUrl}/servicios/categoria/${params.categoria}` },
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
          <Link href="/servicios" className="hover:text-foreground">Servicios</Link>
          <span>/</span>
          <span className="text-foreground">{fallback.label}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{fallback.label} para Eventos</h1>
          <p className="text-muted-foreground mt-2">{categoryContent?.description || fallback.description}</p>
        </div>

        <LandingGridClient services={services} />

        {/* SEO content */}
        {categoryContent && (
          <div className="mt-12 prose prose-gray max-w-none">
            <p className="text-muted-foreground">{categoryContent.content}</p>
          </div>
        )}

        {/* Internal links: zones for this category */}
        {zones.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">{fallback.label} por zona</h2>
            <div className="flex flex-wrap gap-2">
              {zones.map(z => (
                <Link key={z.slug} href={`/servicios/categoria/${params.categoria}/${z.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{fallback.label} en {z.label}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Internal links: other categories */}
        {otherCategories.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Otras categorias</h2>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map(c => (
                <Link key={c.slug} href={`/servicios/categoria/${c.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{c.label}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

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

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActiveServicesServer, enrichServicesWithTagsServer, getActiveCategoriesServer } from '@/lib/supabase/server-queries';
import { LandingGridClient } from '@/components/services/landing-grid-client';
import { VIVELO_ZONES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { Service } from '@/types/database';

const ZONE_META: Record<string, { title: string; description: string; intro: string; content: string }> = {
  'ciudad-de-mexico': {
    title: 'Servicios para Eventos en Ciudad de Mexico',
    description: 'Encuentra los mejores servicios para tu evento en la Ciudad de Mexico. Catering, audio, decoracion, fotografia y mas en CDMX.',
    intro: 'Encuentra proveedores verificados para tu evento en la Ciudad de Mexico. Desde catering y audio hasta decoracion y fotografia profesional.',
    content: 'La CDMX es el centro de eventos mas grande de Mexico. Con miles de celebraciones cada semana, contar con proveedores confiables es clave. En Vivelo conectamos organizadores con los mejores profesionales de la capital: catering para todos los gustos, DJs y grupos musicales, decoracion floral y tematica, fotografia y video cinematografico, mobiliario premium y staff capacitado.',
  },
  'estado-de-mexico': {
    title: 'Servicios para Eventos en Estado de Mexico',
    description: 'Los mejores proveedores de servicios para eventos en el Estado de Mexico. Cotiza catering, audio, mobiliario y mas.',
    intro: 'Proveedores profesionales para eventos en el Estado de Mexico. Cotiza y compara servicios de catering, audio, decoracion y mas.',
    content: 'El Estado de Mexico ofrece una gran variedad de opciones para celebrar eventos, desde salones en zona metropolitana hasta haciendas y jardines en municipios como Naucalpan, Tlalnepantla, Ecatepec y Huixquilucan. En Vivelo encontraras proveedores locales verificados que cubren toda la zona.',
  },
  toluca: {
    title: 'Servicios para Eventos en Toluca',
    description: 'Proveedores de servicios para eventos en Toluca y zona metropolitana. Catering, audio, decoracion y mas.',
    intro: 'Servicios profesionales para eventos en Toluca y zona metropolitana. Catering, musica, decoracion y todo lo que necesitas.',
    content: 'Toluca y su zona metropolitana (Metepec, Zinacantepec, Lerma) cuentan con una creciente oferta de servicios para eventos. En Vivelo te conectamos con proveedores locales que conocen la region y ofrecen servicios de calidad para bodas, xv anos, corporativos y todo tipo de celebraciones.',
  },
  puebla: {
    title: 'Servicios para Eventos en Puebla',
    description: 'Proveedores de servicios para eventos en Puebla. Cotiza y reserva catering, decoracion, fotografia y mas.',
    intro: 'Descubre proveedores de eventos en Puebla. Catering regional, decoracion, fotografia y servicios profesionales para tu celebracion.',
    content: 'Puebla es reconocida por su rica tradicion gastronomica y cultural, lo que la convierte en un destino ideal para eventos. Encuentra proveedores que ofrecen desde catering con cocina poblana hasta decoracion con toques coloniales, fotografia en locaciones historicas y musica regional.',
  },
  hidalgo: {
    title: 'Servicios para Eventos en Hidalgo',
    description: 'Encuentra servicios para eventos en Hidalgo. Proveedores verificados de catering, audio, fotografia y mas.',
    intro: 'Proveedores verificados para eventos en Hidalgo. Encuentra catering, audio, fotografia y mas para tu celebracion.',
    content: 'Hidalgo ofrece escenarios unicos para eventos: desde haciendas historicas en zonas como Pachuca, Mineral del Monte y Tula, hasta espacios al aire libre rodeados de naturaleza. En Vivelo encontraras proveedores locales que conocen la region y pueden hacer de tu evento algo especial.',
  },
  queretaro: {
    title: 'Servicios para Eventos en Queretaro',
    description: 'Servicios para eventos en Queretaro. Encuentra proveedores de catering, audio, decoracion y mas.',
    intro: 'Servicios de calidad para eventos en Queretaro. Catering, musica, decoracion y fotografia con proveedores verificados.',
    content: 'Queretaro se ha posicionado como uno de los destinos favoritos para eventos en el centro del pais. Con vinedos, haciendas y venues modernos, la ciudad ofrece opciones para todos los gustos. En Vivelo conectamos organizadores con proveedores profesionales que operan en la zona.',
  },
  guanajuato: {
    title: 'Servicios para Eventos en Guanajuato',
    description: 'Proveedores de servicios para eventos en Guanajuato. Cotiza catering, decoracion, fotografia y mas.',
    intro: 'Encuentra proveedores para eventos en Guanajuato. Catering, decoracion, fotografia y musica para bodas y celebraciones.',
    content: 'Guanajuato, con ciudades como Leon, San Miguel de Allende e Irapuato, es un destino premium para bodas y eventos sociales. San Miguel de Allende en particular es reconocido internacionalmente como destino de bodas. Encuentra proveedores locales que conocen estas locaciones y ofrecen servicios de primer nivel.',
  },
  tlaxcala: {
    title: 'Servicios para Eventos en Tlaxcala',
    description: 'Encuentra proveedores para tu evento en Tlaxcala. Catering, audio, decoracion y servicios profesionales.',
    intro: 'Proveedores profesionales para eventos en Tlaxcala. Catering, decoracion, fotografia y servicios para tu celebracion.',
    content: 'Tlaxcala, el estado mas pequeno de Mexico, ofrece espacios intimos y con encanto para eventos. Desde ex-haciendas hasta jardines campestres, la region cuenta con locaciones unicas. En Vivelo encontraras proveedores que cubren Tlaxcala y zonas aledanas para hacer de tu evento algo memorable.',
  },
  morelos: {
    title: 'Servicios para Eventos en Morelos',
    description: 'Servicios para bodas y eventos en Morelos y Cuernavaca. Proveedores locales verificados en Vivelo.',
    intro: 'Servicios para eventos en Morelos y Cuernavaca. Proveedores verificados para bodas, xv anos y todo tipo de celebraciones.',
    content: 'Morelos, con Cuernavaca como su capital, es conocido como "la ciudad de la eterna primavera" — un destino ideal para eventos al aire libre durante todo el ano. Jardines, haciendas y villas con alberca son escenarios populares para bodas y celebraciones. Encuentra proveedores locales verificados en Vivelo.',
  },
};

interface Props {
  params: { zona: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const zone = VIVELO_ZONES.find(z => z.slug === params.zona);
  const zoneMeta = ZONE_META[params.zona];
  if (!zone || !zoneMeta) {
    return { title: 'Servicios por Zona' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  return {
    title: zoneMeta.title,
    description: zoneMeta.description,
    alternates: { canonical: `${siteUrl}/servicios/zona/${params.zona}` },
    openGraph: {
      title: `${zoneMeta.title} | Vivelo`,
      description: zoneMeta.description,
    },
  };
}

export default async function ZonaLandingPage({ params }: Props) {
  const zone = VIVELO_ZONES.find(z => z.slug === params.zona);
  const zoneMeta = ZONE_META[params.zona];
  if (!zone || !zoneMeta) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  let services: Service[] = [];
  try {
    const rawServices = await getActiveServicesServer();
    const enriched = await enrichServicesWithTagsServer(rawServices);
    services = enriched.filter(s => s.zones.includes(zone.label));
  } catch (error) {
    console.error('[ZonaLandingPage] Error loading services:', error);
  }

  let categories: { slug: string; label: string }[] = [];
  try {
    categories = await getActiveCategoriesServer();
  } catch { /* fallback empty */ }

  const otherZones = VIVELO_ZONES.filter(z => z.slug !== params.zona);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: zoneMeta.title,
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
      { '@type': 'ListItem', position: 3, name: zone.label, item: `${siteUrl}/servicios/zona/${params.zona}` },
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
          <span className="text-foreground">{zone.label}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{zoneMeta.title}</h1>
          <p className="text-muted-foreground mt-2">{zoneMeta.intro}</p>
        </div>

        <LandingGridClient services={services} />

        {/* SEO content */}
        <div className="mt-12 prose prose-gray max-w-none">
          <p className="text-muted-foreground">{zoneMeta.content}</p>
        </div>

        {/* Internal links: categories in this zone */}
        {categories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Explora por categoria en {zone.label}</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <Link key={c.slug} href={`/servicios/categoria/${c.slug}/${params.zona}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{c.label}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Internal links: other zones */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Otras zonas</h2>
          <div className="flex flex-wrap gap-2">
            {otherZones.map(z => (
              <Link key={z.slug} href={`/servicios/zona/${z.slug}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{z.label}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/servicios" className="text-primary hover:underline font-medium">
            Ver todos los servicios en Mexico →
          </Link>
        </div>
      </div>
    </>
  );
}

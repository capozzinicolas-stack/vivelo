import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

// Known zones for SEO
const ZONE_META: Record<string, { title: string; description: string }> = {
  'ciudad-de-mexico': {
    title: 'Servicios para Eventos en Ciudad de Mexico',
    description: 'Encuentra los mejores servicios para tu evento en la Ciudad de Mexico. Catering, audio, decoracion, fotografia y mas en CDMX.',
  },
  'estado-de-mexico': {
    title: 'Servicios para Eventos en Estado de Mexico',
    description: 'Los mejores proveedores de servicios para eventos en el Estado de Mexico. Cotiza catering, audio, mobiliario y mas.',
  },
  toluca: {
    title: 'Servicios para Eventos en Toluca',
    description: 'Proveedores de servicios para eventos en Toluca y zona metropolitana. Catering, audio, decoracion y mas.',
  },
  puebla: {
    title: 'Servicios para Eventos en Puebla',
    description: 'Proveedores de servicios para eventos en Puebla. Cotiza y reserva catering, decoracion, fotografia y mas.',
  },
  hidalgo: {
    title: 'Servicios para Eventos en Hidalgo',
    description: 'Encuentra servicios para eventos en Hidalgo. Proveedores verificados de catering, audio, fotografia y mas.',
  },
  queretaro: {
    title: 'Servicios para Eventos en Queretaro',
    description: 'Servicios para eventos en Queretaro. Encuentra proveedores de catering, audio, decoracion y mas.',
  },
  guanajuato: {
    title: 'Servicios para Eventos en Guanajuato',
    description: 'Proveedores de servicios para eventos en Guanajuato. Cotiza catering, decoracion, fotografia y mas.',
  },
  tlaxcala: {
    title: 'Servicios para Eventos en Tlaxcala',
    description: 'Encuentra proveedores para tu evento en Tlaxcala. Catering, audio, decoracion y servicios profesionales.',
  },
  morelos: {
    title: 'Servicios para Eventos en Morelos',
    description: 'Servicios para bodas y eventos en Morelos y Cuernavaca. Proveedores locales verificados en Vivelo.',
  },
};

interface Props {
  params: { zona: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const zoneMeta = ZONE_META[params.zona];
  if (!zoneMeta) {
    return { title: 'Servicios por Zona' };
  }

  return {
    title: zoneMeta.title,
    description: zoneMeta.description,
    openGraph: {
      title: `${zoneMeta.title} | Vivelo`,
      description: zoneMeta.description,
    },
  };
}

export default async function ZonaLandingPage({ params }: Props) {
  // Redirect to servicios page with zone filter pre-applied
  permanentRedirect(`/servicios?zona=${params.zona}`);
}

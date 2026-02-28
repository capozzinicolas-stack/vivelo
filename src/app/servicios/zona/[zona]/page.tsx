import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

// Known zones for SEO
const ZONE_META: Record<string, { title: string; description: string }> = {
  cdmx: {
    title: 'Servicios para Eventos en CDMX',
    description: 'Encuentra los mejores servicios para tu evento en la Ciudad de Mexico. Catering, audio, decoracion, fotografia y mas en CDMX.',
  },
  'estado-de-mexico': {
    title: 'Servicios para Eventos en Estado de Mexico',
    description: 'Los mejores proveedores de servicios para eventos en el Estado de Mexico. Cotiza catering, audio, mobiliario y mas.',
  },
  guadalajara: {
    title: 'Servicios para Eventos en Guadalajara',
    description: 'Proveedores de servicios para eventos en Guadalajara, Jalisco. Encuentra el servicio perfecto para tu evento.',
  },
  monterrey: {
    title: 'Servicios para Eventos en Monterrey',
    description: 'Encuentra y reserva servicios para eventos en Monterrey, Nuevo Leon. Catering, fotografia, audio y mas.',
  },
  puebla: {
    title: 'Servicios para Eventos en Puebla',
    description: 'Proveedores de servicios para eventos en Puebla. Cotiza y reserva catering, decoracion, fotografia y mas.',
  },
  queretaro: {
    title: 'Servicios para Eventos en Queretaro',
    description: 'Servicios para eventos en Queretaro. Encuentra proveedores de catering, audio, decoracion y mas.',
  },
  cancun: {
    title: 'Servicios para Eventos en Cancun',
    description: 'Servicios para bodas y eventos en Cancun y la Riviera Maya. Proveedores locales verificados.',
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
  redirect(`/servicios?zona=${params.zona}`);
}

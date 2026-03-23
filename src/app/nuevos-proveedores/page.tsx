import type { Metadata } from 'next';
import { LandingPage } from '@/components/nuevos-proveedores/landing-page';

export const metadata: Metadata = {
  title: 'Registra tu Negocio en Vivelo — La Plataforma #1 de Servicios para Eventos en México',
  description:
    'Únete a Vivelo y ofrece tus servicios de catering, audio, decoración, foto y video a miles de clientes. Sin cuota mensual, cobros seguros con Stripe y dashboard para gestionar tu negocio.',
  alternates: {
    canonical: 'https://nuevosproveedores.solovivelo.com',
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://nuevosproveedores.solovivelo.com',
    title: 'Registra tu Negocio en Vivelo — Plataforma de Servicios para Eventos',
    description:
      'Haz crecer tu negocio de eventos. Recibe reservas, gestiona tu agenda y cobra de forma segura en la plataforma líder de México.',
    siteName: 'Vivelo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Registra tu Negocio en Vivelo',
    description:
      'Únete a la plataforma líder de servicios para eventos en México. Sin cuota mensual.',
  },
};

const faqItems = [
  {
    question: '¿Cuánto cuesta registrarse en Vivelo?',
    answer:
      'Registrarse es completamente gratis. No hay cuota de inscripción ni mensualidades. Solo pagas una comisión cuando realizas una venta.',
  },
  {
    question: '¿Qué comisión cobra Vivelo?',
    answer:
      'Vivelo cobra una comisión por transacción que varía según la categoría de servicio. No hay cobros fijos ni sorpresas — solo pagas cuando vendes.',
  },
  {
    question: '¿Cómo recibo mis pagos?',
    answer:
      'Los pagos se procesan de forma segura a través de Stripe y se depositan directamente en tu cuenta bancaria. Puedes configurar tus datos bancarios desde tu dashboard.',
  },
  {
    question: '¿Qué tipo de servicios puedo ofrecer?',
    answer:
      'Puedes ofrecer servicios de catering, audio e iluminación, decoración, fotografía y video, staff para eventos y mobiliario. Cada servicio se configura con precios, fotos y extras.',
  },
  {
    question: '¿Puedo manejar mi disponibilidad?',
    answer:
      'Sí. Desde tu dashboard puedes bloquear fechas, configurar horarios disponibles y establecer cuántos eventos puedes atender simultáneamente.',
  },
  {
    question: '¿Qué pasa si un cliente cancela?',
    answer:
      'Cada servicio tiene una política de cancelación configurable. Dependiendo del tiempo de anticipación, puedes retener un porcentaje del pago como protección.',
  },
  {
    question: '¿Necesito facturar?',
    answer:
      'Vivelo no emite facturas en tu nombre. Tú eres responsable de tu facturación como proveedor independiente. Te proporcionamos los datos de cada transacción para facilitar tu contabilidad.',
  },
  {
    question: '¿Cómo me encuentran los clientes?',
    answer:
      'Tu perfil y servicios aparecen en el marketplace de Vivelo. Los clientes pueden buscarte por categoría, zona geográfica, precio y disponibilidad. También puedes participar en campañas promocionales para mayor visibilidad.',
  },
];

export default function NuevosProveedoresPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Registra tu Negocio en Vivelo',
    description:
      'Únete a Vivelo y ofrece tus servicios de eventos a miles de clientes en México.',
    url: 'https://nuevosproveedores.solovivelo.com',
    publisher: {
      '@type': 'Organization',
      name: 'Vivelo',
      url: 'https://solovivelo.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage faqItems={faqItems} />
    </>
  );
}

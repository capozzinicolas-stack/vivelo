import type { Metadata } from 'next';
import { TermsPageClient } from './terms-page-client';

export const metadata: Metadata = {
  title: 'Terminos y Condiciones — Vivelo',
  description:
    'Terminos y condiciones de uso de Vivelo para clientes y proveedores de servicios para eventos en Mexico.',
  alternates: {
    canonical: 'https://solovivelo.com/terminos-y-condiciones',
  },
};

export default function TerminosPage() {
  return <TermsPageClient />;
}

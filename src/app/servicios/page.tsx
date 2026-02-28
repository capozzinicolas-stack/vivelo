import type { Metadata } from 'next';
import { ServiciosListClient } from './servicios-list-client';

export const metadata: Metadata = {
  title: 'Servicios para Eventos',
  description: 'Encuentra el servicio perfecto para tu evento en México. Catering, audio, decoracion, fotografia, mobiliario y mas.',
  openGraph: {
    title: 'Servicios para Eventos - Vivelo',
    description: 'Encuentra el servicio perfecto para tu evento en México',
  },
};

export default function ServiciosPage() {
  return <ServiciosListClient />;
}

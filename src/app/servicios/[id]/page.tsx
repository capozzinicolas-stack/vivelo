import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getServiceByIdServer, getServiceBySlugServer, getProfileByIdServer, getServiceBookingCountServer, getReviewsByServiceServer } from '@/lib/supabase/server-queries';
import { isUUID } from '@/lib/slug';
import { ServiceDetailClient } from '@/components/services/service-detail-client';
import { ServiceFaq } from '@/components/services/service-faq';
import { ServiceReviews } from '@/components/services/service-reviews';
import { PromoBanner } from '@/components/marketing/promo-banner';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = isUUID(params.id)
    ? await getServiceByIdServer(params.id)
    : await getServiceBySlugServer(params.id);
  if (!service) return { title: 'Servicio no encontrado' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const providerName = service.provider?.company_name || service.provider?.full_name || 'Proveedor';
  const description = service.description?.slice(0, 160) || `${service.title} por ${providerName} en Vivelo`;

  return {
    title: service.title,
    description,
    alternates: {
      canonical: `${siteUrl}/servicios/${service.slug}`,
    },
    openGraph: {
      title: `${service.title} - Vivelo`,
      description,
      type: 'website',
      ...(service.images?.[0] ? { images: [{ url: service.images[0] }] } : {}),
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const idOrSlug = params.id;

  // If UUID, redirect permanently to slug URL
  if (isUUID(idOrSlug)) {
    const service = await getServiceByIdServer(idOrSlug);
    if (!service) notFound();
    permanentRedirect(`/servicios/${service.slug}`);
  }

  // Resolve by slug
  const service = await getServiceBySlugServer(idOrSlug);
  if (!service) notFound();

  const [bookingCount, reviews] = await Promise.all([
    getServiceBookingCountServer(service.id),
    getReviewsByServiceServer(service.id),
  ]);

  // Ensure provider is loaded
  let provider = service.provider || null;
  if (!provider && service.provider_id) {
    provider = await getProfileByIdServer(service.provider_id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const providerName = provider?.company_name || provider?.full_name || 'Proveedor';

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    provider: {
      '@type': 'LocalBusiness',
      name: providerName,
      ...(provider?.avatar_url ? { image: provider.avatar_url } : {}),
    },
    ...(service.images?.[0] ? { image: service.images[0] } : {}),
    offers: {
      '@type': 'Offer',
      price: service.base_price,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
    },
    ...(service.zones.length > 0 ? {
      areaServed: service.zones.map(z => ({ '@type': 'Place', name: z })),
    } : {}),
    ...(service.avg_rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: service.avg_rating,
        reviewCount: service.review_count,
      },
    } : {}),
    url: `${siteUrl}/servicios/${service.slug}`,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs items={[
        { label: 'Inicio', href: '/' },
        { label: 'Servicios', href: '/servicios' },
        { label: service.title },
      ]} />

      <Button variant="ghost" asChild className="mb-6"><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link></Button>

      <ServiceDetailClient
        service={service}
        provider={provider}
        bookingCount={bookingCount}
      />

      <div className="mt-10">
        <PromoBanner bannerKey="service_detail_banner" variant="card" />
      </div>

      {reviews.length > 0 && (
        <div className="mt-12">
          <ServiceReviews reviews={reviews} />
        </div>
      )}

      <div className="mt-12">
        <ServiceFaq service={service} providerName={providerName} />
      </div>
    </div>
  );
}

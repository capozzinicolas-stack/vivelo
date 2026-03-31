import type { Metadata } from 'next';
import Link from 'next/link';
import { getProfileByIdServer, getProfileBySlugServer, getServicesByProviderServer, getProviderBookingCountServer, getProviderReviewsServer } from '@/lib/supabase/server-queries';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/ui/share-button';
import { ArrowLeft, MapPin, Star, ShieldCheck, CalendarDays, Award, Briefcase } from 'lucide-react';
import { notFound, permanentRedirect } from 'next/navigation';
import { isUUID } from '@/lib/slug';
import { ProviderServicesGrid } from './provider-services-grid';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = isUUID(params.id)
    ? await getProfileByIdServer(params.id)
    : await getProfileBySlugServer(params.id);
  if (!provider) return { title: 'Proveedor no encontrado' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const name = provider.company_name || provider.full_name;
  return {
    title: name,
    description: provider.bio || `Conoce a ${name}, proveedor de servicios para eventos en Vivelo`,
    alternates: {
      canonical: `${siteUrl}/proveedores/${provider.slug}`,
    },
    openGraph: {
      title: `${name} - Proveedor en Vivelo`,
      description: provider.bio || undefined,
      ...(provider.avatar_url ? { images: [{ url: provider.avatar_url }] } : {}),
    },
  };
}

export default async function ProveedorPublicPage({ params }: Props) {
  const idOrSlug = params.id;

  // If UUID, redirect permanently to slug URL
  if (isUUID(idOrSlug)) {
    const provider = await getProfileByIdServer(idOrSlug);
    if (!provider) notFound();
    permanentRedirect(`/proveedores/${provider.slug}`);
  }

  // Resolve by slug
  const provider = await getProfileBySlugServer(idOrSlug);
  if (!provider) notFound();

  const [allServices, bookingCount, providerReviews] = await Promise.all([
    getServicesByProviderServer(provider.id),
    getProviderBookingCountServer(provider.id),
    getProviderReviewsServer(provider.id, 5),
  ]);

  const services = allServices
    .filter(s => s.status === 'active')
    .map(s => ({ ...s, provider: provider || undefined }));

  const initials = provider.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const allZones = Array.from(new Set(services.flatMap(s => s.zones)));
  const allCategories = Array.from(new Set(services.map(s => s.category)));
  const avgRating = services.length
    ? Number((services.reduce((s, sv) => s + sv.avg_rating, 0) / services.length).toFixed(1))
    : 0;
  const totalReviews = services.reduce((s, sv) => s + sv.review_count, 0);

  // Member since
  const memberSince = new Date(provider.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const providerName = provider.company_name || provider.full_name;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: providerName,
    description: provider.bio || undefined,
    ...(provider.avatar_url ? { image: provider.avatar_url } : {}),
    url: `${siteUrl}/proveedores/${provider.slug}`,
    ...(allZones.length > 0 ? { areaServed: allZones.map(z => ({ '@type': 'Place', name: z })) } : {}),
    ...(avgRating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating,
        reviewCount: totalReviews,
      },
    } : {}),
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
        { label: providerName },
      ]} />

      <Button variant="ghost" asChild className="mb-6"><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver a servicios</Link></Button>

      <div className="max-w-5xl mx-auto space-y-10">
        {/* Provider header */}
        <div className="flex items-start gap-6 flex-col sm:flex-row">
          <Avatar className="h-24 w-24 shrink-0">
            <AvatarImage src={provider.avatar_url || undefined} alt={provider.full_name} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{providerName}</h1>
              {provider.verified && (
                <Badge className="bg-green-100 text-green-800 gap-1"><ShieldCheck className="h-3 w-3" />Verificado</Badge>
              )}
              <ShareButton url={`/proveedores/${provider.slug}`} title={providerName} />
            </div>
            {provider.company_name && (
              <p className="text-muted-foreground">{provider.full_name}</p>
            )}
            {provider.bio && <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>}

            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap text-sm pt-1">
              {avgRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{avgRating}</span>
                  <span className="text-muted-foreground">({totalReviews} resenas)</span>
                </span>
              )}
              {bookingCount > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Award className="h-4 w-4" />
                  {bookingCount} evento{bookingCount !== 1 ? 's' : ''} realizado{bookingCount !== 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {services.length} servicio{services.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Miembro desde {memberSince}
              </span>
            </div>

            {/* Zones */}
            {allZones.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allZones.slice(0, 5).map((z) => <Badge key={z} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{z}</Badge>)}
                {allZones.length > 5 && <Badge variant="outline" className="text-xs">+{allZones.length - 5} mas</Badge>}
              </div>
            )}

            {/* Categories */}
            {allCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((c) => <Badge key={c} className="text-xs bg-deep-purple/10 text-deep-purple border-0">{c}</Badge>)}
              </div>
            )}
          </div>
        </div>

        {/* Services grid with filters */}
        <ProviderServicesGrid services={services} />

        {/* Provider reviews */}
        {providerReviews.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Resenas de clientes</h2>
            <div className="space-y-4">
              {providerReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{review.client?.full_name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                  {review.service && (
                    <Link href={`/servicios/${review.service.slug}`} className="text-xs text-deep-purple hover:underline mt-2 inline-block">
                      {review.service.title}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

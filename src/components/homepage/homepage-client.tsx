'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { HomeSearchBar } from '@/components/home-search-bar';
import { MobileCategoryBar } from '@/components/homepage/mobile-category-bar';
import { CashbackBanner } from '@/components/homepage/cashback-banner';
import { FeaturedServicesSection } from '@/components/homepage/featured-services-section';
import { NewServicesSection } from '@/components/homepage/new-services-section';
import { SubcategoryShowcaseSection } from '@/components/homepage/subcategory-showcase-section';
import { CategoriesShowcaseSection } from '@/components/homepage/categories-showcase-section';
import { EventTypesSection } from '@/components/homepage/event-types-section';
import { BlogSection } from '@/components/homepage/blog-section';
import { FeaturedProvidersSection } from '@/components/homepage/featured-providers-section';
import { TopRatedSection } from '@/components/homepage/top-rated-section';
import { TestimonialsSection } from '@/components/homepage/testimonials-section';
import { NewsletterSection } from '@/components/homepage/newsletter-section';
import { ExitIntentPopup } from '@/components/marketing/exit-intent-popup';
import { CampaignOffersSection } from '@/components/homepage/campaign-offers-section';
import { PromoBanner } from '@/components/marketing/promo-banner';
import { useUtmCapture } from '@/hooks/use-utm-capture';
import type { FeaturedPlacement, BlogPost, FeaturedProvider, Campaign, CampaignSubscription, ShowcaseItem, SiteBanner, Service } from '@/types/database';

interface TestimonialReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client?: { full_name: string };
  service?: { title: string; slug: string };
}

interface HomepageClientProps {
  featuredPlacements: FeaturedPlacement[];
  blogPosts: BlogPost[];
  featuredProviders: FeaturedProvider[];
  campaignsWithServices: (Campaign & { subscriptions: CampaignSubscription[] })[];
  showcaseItems: ShowcaseItem[];
  siteBanners: SiteBanner[];
  newServices: Service[];
  topRatedServices: Service[];
  testimonialReviews: TestimonialReview[];
}

export function HomepageClient({
  featuredPlacements,
  blogPosts,
  featuredProviders,
  campaignsWithServices,
  showcaseItems,
  siteBanners,
  newServices,
  topRatedServices,
  testimonialReviews,
}: HomepageClientProps) {
  useUtmCapture();

  return (
    <div>
      {/* 1. Cashback Banner */}
      <CashbackBanner banner={siteBanners.find(b => b.banner_key === 'cashback_banner')} />

      {/* 2. Hero + Search */}
      <section className="relative text-white overflow-hidden">
        <Image
          src="/hero-bg.webp"
          alt="Personas celebrando en un evento"
          fill
          className="object-cover"
          priority
          sizes="100vw"
          quality={80}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative container mx-auto px-4 pt-12 pb-10 md:pt-24 md:pb-20">
          <div className="max-w-xl">
            <h1 className="text-2xl md:text-6xl font-bold mb-1 md:mb-2 leading-tight">Hazlo unico, hazlo Facil.</h1>
            <p className="text-2xl md:text-6xl font-bold mb-3 md:mb-6 leading-tight">Solo <span className="italic">Vivelo</span></p>
            <p className="text-sm md:text-xl text-white/90 mb-4 md:mb-8">Los mejores proveedores para tus eventos</p>
          </div>
          <HomeSearchBar />
        </div>
      </section>

      {/* 2b. Hero Promo Banner */}
      <PromoBanner banner={siteBanners.find(b => b.banner_key === 'hero_promo_banner')} variant="full" />

      {/* 3. Mobile: horizontal category bar */}
      <MobileCategoryBar />

      {/* 4. Los Mas Contratados (featured services carousel) */}
      <FeaturedServicesSection placements={featuredPlacements} loading={false} />

      {/* 5. Los Mas Recomendados */}
      <TopRatedSection services={topRatedServices} loading={false} />

      {/* 6. Recien Llegados */}
      <NewServicesSection services={newServices} loading={false} />

      {/* 7. Los mejores servicios para tu evento (subcategory showcase) */}
      <SubcategoryShowcaseSection items={showcaseItems} promoBanner={siteBanners.find(b => b.banner_key === 'showcase_promo') ?? null} />

      {/* 8. Ofertas activas */}
      <CampaignOffersSection campaigns={campaignsWithServices} loading={false} />

      {/* 9. Categorias Destacadas */}
      <CategoriesShowcaseSection />

      {/* 10. Que estas celebrando? */}
      <EventTypesSection />

      {/* 11. Proveedores Destacados */}
      <FeaturedProvidersSection providers={featuredProviders} loading={false} />

      {/* 12. Testimonios reales */}
      <TestimonialsSection reviews={testimonialReviews} />

      {/* 11. Blog - Todo sobre el mundo de eventos */}
      <BlogSection posts={blogPosts} loading={false} />

      {/* 11.5. Newsletter */}
      <NewsletterSection />

      {/* 12. CTA Proveedor */}
      <section className="bg-gradient-to-r from-deep-purple to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Eres proveedor de servicios?</h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto">Unete a Vivelo y conecta con miles de clientes buscando servicios para sus eventos en México.</p>
          <Button size="lg" variant="secondary" asChild><Link href="https://nuevosproveedores.solovivelo.com">Registrate como Proveedor</Link></Button>
        </div>
      </section>

      {/* Exit-intent popup */}
      <ExitIntentPopup />
    </div>
  );
}

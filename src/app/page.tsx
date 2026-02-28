import type { Metadata } from 'next';
import {
  getFeaturedPlacementsServer,
  getPublishedBlogPostsServer,
  getActiveFeaturedProvidersServer,
  getActiveCampaignsWithServicesServer,
  getActiveShowcaseItemsServer,
  getActiveSiteBannersServer,
  getNewServicesServer,
  getTopRatedServicesServer,
} from '@/lib/supabase/server-queries';
import { HomepageClient } from '@/components/homepage/homepage-client';
import type { FeaturedPlacement, BlogPost, FeaturedProvider, Campaign, CampaignSubscription, ShowcaseItem, SiteBanner, Service } from '@/types/database';

export const metadata: Metadata = {
  openGraph: {
    title: 'Vivelo - Servicios para Eventos en Mexico',
    description: 'Encuentra y reserva los mejores servicios para tu evento en México. Catering, audio, decoracion, fotografia y mas.',
    url: '/',
  },
};

export default async function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  let featuredPlacements: FeaturedPlacement[] = [];
  let blogPosts: BlogPost[] = [];
  let featuredProviders: FeaturedProvider[] = [];
  let campaignsWithServices: (Campaign & { subscriptions: CampaignSubscription[] })[] = [];
  let showcaseItems: ShowcaseItem[] = [];
  let siteBanners: SiteBanner[] = [];
  let newServices: Service[] = [];
  let topRatedServices: Service[] = [];

  try {
    [featuredPlacements, blogPosts, featuredProviders, campaignsWithServices, showcaseItems, siteBanners, newServices, topRatedServices] = await Promise.all([
      getFeaturedPlacementsServer('servicios_destacados'),
      getPublishedBlogPostsServer(),
      getActiveFeaturedProvidersServer(),
      getActiveCampaignsWithServicesServer(),
      getActiveShowcaseItemsServer(),
      getActiveSiteBannersServer(),
      getNewServicesServer(),
      getTopRatedServicesServer(),
    ]);
  } catch (error) {
    console.error('[Homepage] Error loading data:', error);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Vivelo',
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/servicios?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'Vivelo',
        url: siteUrl,
        description: 'Marketplace de servicios para eventos en México',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageClient
        featuredPlacements={featuredPlacements}
        blogPosts={blogPosts}
        featuredProviders={featuredProviders}
        campaignsWithServices={campaignsWithServices}
        showcaseItems={showcaseItems}
        siteBanners={siteBanners}
        newServices={newServices}
        topRatedServices={topRatedServices}
      />
    </>
  );
}

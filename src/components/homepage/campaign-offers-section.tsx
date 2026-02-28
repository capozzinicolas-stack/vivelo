'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
import { TrackedCard } from '@/components/homepage/tracked-card';
import { ServiceCarouselCard } from '@/components/services/service-carousel-card';
import type { Campaign, CampaignSubscription } from '@/types/database';

const discountPills = [
  { label: 'Todos', value: 'ALL' },
  { label: '10% off', value: '10' },
  { label: 'Combos', value: 'combos' },
  { label: '25% off', value: '25' },
  { label: '35% off', value: '35' },
  { label: '45% off', value: '45' },
  { label: '50% off', value: '50' },
];

export function CampaignOffersSection({ campaigns, loading }: {
  campaigns: (Campaign & { subscriptions: CampaignSubscription[] })[];
  loading: boolean;
}) {
  const [selectedDiscount, setSelectedDiscount] = useState('ALL');

  const allServices = campaigns.flatMap(c =>
    (c.subscriptions || []).map(sub => ({
      ...sub,
      discount_pct: c.discount_pct,
      campaign_name: c.external_name,
    }))
  );

  const filtered = selectedDiscount === 'ALL'
    ? allServices
    : selectedDiscount === 'combos'
      ? allServices
      : allServices.filter(item => {
          const target = parseInt(selectedDiscount);
          return item.discount_pct >= target && item.discount_pct < target + 10;
        });

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-8 w-96 mb-8" />
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[340px] w-[240px] flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (allServices.length === 0) return null;

  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-4 md:mb-6">
          <h2 className="text-xl md:text-3xl font-bold">Ofertas de la semana</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <FilterPills
          options={discountPills}
          selected={selectedDiscount}
          onSelect={setSelectedDiscount}
          className="mb-8"
        />

        <HorizontalCarousel>
          {filtered.map(item => {
            const svc = item.service;
            if (!svc) return null;
            const discountedPrice = Math.round(svc.base_price * (1 - item.discount_pct / 100));
            return (
              <TrackedCard key={item.id} placementType="campaign" placementId={item.id} serviceId={svc.id} className="min-w-[44vw] max-w-[48vw] md:min-w-[220px] md:max-w-[260px] snap-start flex-shrink-0">
                <ServiceCarouselCard
                  service={svc}
                  badge={{ text: `${item.discount_pct}% OFF`, className: 'bg-red-500 text-white' }}
                  originalPrice={svc.base_price}
                  discountedPrice={discountedPrice}
                />
              </TrackedCard>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

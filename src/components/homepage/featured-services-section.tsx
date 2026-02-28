'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { useCatalog } from '@/providers/catalog-provider';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
import { TrackedCard } from '@/components/homepage/tracked-card';
import { ServiceCarouselCard } from '@/components/services/service-carousel-card';
import type { FeaturedPlacement } from '@/types/database';

export function FeaturedServicesSection({ placements, loading }: { placements: FeaturedPlacement[]; loading: boolean }) {
  const { categories } = useCatalog();
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categoryPills = [
    { label: 'Todos', value: 'ALL' },
    ...categories.filter(c => c.is_active).map(c => ({ label: c.label, value: c.slug })),
  ];

  const filtered = selectedCategory === 'ALL'
    ? placements
    : placements.filter(p => p.service?.category === selectedCategory);

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

  if (placements.length === 0) return null;

  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-4 md:mb-6">
          <h2 className="text-xl md:text-3xl font-bold">Recomendados</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <FilterPills
          options={categoryPills}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          className="mb-8"
        />

        <HorizontalCarousel>
          {filtered.map(p => {
            const svc = p.service;
            if (!svc) return null;
            return (
              <TrackedCard key={p.id} placementType="featured_placement" placementId={p.id} serviceId={svc.id} className="min-w-[44vw] max-w-[48vw] md:min-w-[220px] md:max-w-[260px] snap-start flex-shrink-0">
                <ServiceCarouselCard service={svc} />
              </TrackedCard>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

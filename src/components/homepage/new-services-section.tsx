'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { HorizontalCarousel } from '@/components/ui/horizontal-carousel';
import { ServiceCarouselCard } from '@/components/services/service-carousel-card';
import type { Service } from '@/types/database';

export function NewServicesSection({ services, loading }: { services: Service[]; loading: boolean }) {
  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[340px] w-[240px] flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (services.length === 0) return null;

  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-4 md:mb-6">
          <h2 className="text-xl md:text-3xl font-bold">Recien Llegados</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <HorizontalCarousel>
          {services.map(svc => (
            <div key={svc.id} className="min-w-[44vw] max-w-[48vw] md:min-w-[220px] md:max-w-[260px] snap-start flex-shrink-0">
              <ServiceCarouselCard
                service={svc}
                badge={{ text: 'Nuevo', className: 'bg-gold text-deep-purple' }}
              />
            </div>
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

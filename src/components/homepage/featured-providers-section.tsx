'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle, ArrowRight } from 'lucide-react';
import { HorizontalCarousel } from '@/components/ui/horizontal-carousel';
import type { FeaturedProvider } from '@/types/database';

export function FeaturedProvidersSection({ providers, loading }: { providers: FeaturedProvider[]; loading: boolean }) {
  if (loading) {
    return (
      <section className="py-16 bg-off-white">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-10" />
          <div className="flex gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-32 rounded-full flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (providers.length === 0) return null;

  return (
    <section className="py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-3xl font-bold">Proveedores Destacados</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <HorizontalCarousel arrowSize="md">
          {providers.map(fp => {
            const provider = fp.provider;
            if (!provider) return null;
            return (
              <div key={fp.id} className="flex flex-col items-center gap-3 snap-start flex-shrink-0 min-w-[140px]">
                <div className="w-28 h-28 rounded-full bg-white shadow-soft flex items-center justify-center overflow-hidden">
                  {provider.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={provider.avatar_url} alt={provider.company_name || provider.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="h-14 w-14 text-muted-foreground/40" />
                  )}
                </div>
                <span className="text-xs font-medium text-center line-clamp-1 max-w-[120px]">
                  {provider.company_name || provider.full_name}
                </span>
              </div>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

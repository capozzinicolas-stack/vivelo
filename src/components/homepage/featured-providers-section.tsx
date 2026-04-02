'use client';

import Link from 'next/link';
import Image from 'next/image';
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
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36 w-36 rounded-2xl flex-shrink-0" />)}
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
            const href = provider.slug ? `/proveedores/${provider.slug}` : '/servicios';
            return (
              <Link key={fp.id} href={href} className="flex flex-col items-center gap-3 snap-start flex-shrink-0 min-w-[160px] group">
                <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl bg-white shadow-soft flex items-center justify-center overflow-hidden group-hover:shadow-lg transition-shadow">
                  {provider.avatar_url ? (
                    <Image src={provider.avatar_url} alt={provider.company_name || provider.full_name} fill className="object-cover" sizes="(max-width: 768px) 128px, 144px" />
                  ) : (
                    <UserCircle className="h-16 w-16 text-muted-foreground/40" />
                  )}
                </div>
                <span className="text-sm font-medium text-center line-clamp-1 max-w-[150px] group-hover:text-deep-purple transition-colors">
                  {provider.company_name || provider.full_name}
                </span>
              </Link>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

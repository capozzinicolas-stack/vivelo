'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ArrowRight, Handshake } from 'lucide-react';
import { categories, categoryMap } from '@/data/categories';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
import type { FeaturedPlacement } from '@/types/database';

export function FeaturedServicesSection({ placements, loading }: { placements: FeaturedPlacement[]; loading: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categoryPills = [
    { label: 'Todos', value: 'ALL' },
    ...categories.map(c => ({ label: c.label, value: c.value })),
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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[420px] w-[300px] flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (placements.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold">Recomendados</h2>
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
            const cat = categoryMap[svc.category];
            const coverImage = svc.images?.[0];
            return (
              <div key={p.id} className="min-w-[280px] max-w-[300px] snap-start flex-shrink-0">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                  <div className="relative">
                    {coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImage} alt={svc.title} className="h-56 w-full object-cover" />
                    ) : (
                      <div className={`h-56 w-full flex items-center justify-center ${cat ? cat.color.replace('text-', 'bg-').split(' ')[0] : 'bg-gray-200'}`}>
                        {cat && (
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${cat.color}`}>
                            <cat.icon className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-gold text-deep-purple border-0 font-semibold">
                      Nuevo
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-1">{svc.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                      {svc.zones.slice(0, 2).map(z => <span key={z}>{z}</span>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`}> | </span>, curr], [] as React.ReactNode[])}
                      {svc.review_count > 0 && (
                        <>
                          <span>|</span>
                          <Handshake className="h-3 w-3 text-gold" />
                          <span>{svc.review_count} reviews</span>
                          <span className="flex items-center">
                            {Array.from({ length: Math.round(svc.avg_rating) }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                    {svc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
                    )}
                    <div className="pt-1">
                      <span className="font-bold text-deep-purple">${svc.base_price.toLocaleString()} mxn</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {svc.price_unit}</span>
                    </div>
                    <Button size="sm" className="w-full bg-deep-purple hover:bg-deep-purple/90 text-white" asChild>
                      <Link href={`/servicios/${svc.id}`}>Explorar</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Handshake, ArrowRight } from 'lucide-react';
import { useCatalog } from '@/providers/catalog-provider';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
import { TrackedCard } from '@/components/homepage/tracked-card';
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
  const { categoryMap, getCategoryIcon } = useCatalog();
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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[420px] w-[300px] flex-shrink-0" />)}
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
            const cat = categoryMap[svc.category];
            const coverImage = svc.images?.[0];
            const discountedPrice = Math.round(svc.base_price * (1 - item.discount_pct / 100));
            return (
              <TrackedCard key={item.id} placementType="campaign" placementId={item.id} serviceId={svc.id} className="min-w-[44vw] max-w-[48vw] md:min-w-[280px] md:max-w-[300px] snap-start flex-shrink-0">
                <Link href={`/servicios/${svc.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                    <div className="relative">
                      {coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverImage} alt={svc.title} className="h-32 md:h-56 w-full object-cover" />
                      ) : (
                        <div className={`h-32 md:h-56 w-full flex items-center justify-center ${cat ? cat.color.replace('text-', 'bg-').split(' ')[0] : 'bg-gray-200'}`}>
                          {cat && (() => {
                            const CatIcon = getCategoryIcon(cat.slug);
                            return (
                            <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl flex items-center justify-center ${cat.color}`}>
                              <CatIcon className="h-5 w-5 md:h-8 md:w-8" />
                            </div>
                            );
                          })()}
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 md:top-3 md:left-3 bg-gold text-deep-purple border-0 font-semibold text-[10px] md:text-xs">
                        Nuevo
                      </Badge>
                    </div>
                    <CardContent className="p-2 md:p-4 space-y-1 md:space-y-2">
                      <h3 className="font-semibold line-clamp-1 text-sm md:text-base">{svc.title}</h3>
                      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                        {svc.zones.slice(0, 2).map((z, i) => (
                          <span key={z}>{i > 0 ? ' | ' : ''}{z}</span>
                        ))}
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
                      {svc.review_count > 0 && (
                        <div className="md:hidden flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-gold text-gold" />
                          <span>{svc.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                      <p className="hidden md:block text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
                      <div className="pt-0.5 md:pt-1">
                        <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                          ${svc.base_price.toLocaleString()}
                        </div>
                        <div className="font-bold text-deep-purple text-sm md:text-base">
                          ${discountedPrice.toLocaleString()}
                          <span className="text-[10px] md:text-xs text-muted-foreground font-normal ml-1">/ {svc.price_unit}</span>
                        </div>
                      </div>
                      <Button size="sm" className="hidden md:flex w-full bg-deep-purple hover:bg-deep-purple/90 text-white" asChild>
                        <Link href={`/servicios/${svc.id}`}>Explorar</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </TrackedCard>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

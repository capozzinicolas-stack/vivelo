'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Handshake, ArrowRight } from 'lucide-react';
import { categoryMap } from '@/data/categories';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[420px] w-[300px] flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (allServices.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold">Ofertas de la semana</h2>
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
              <div key={item.id} className="min-w-[280px] max-w-[300px] snap-start flex-shrink-0">
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
                    {svc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
                    )}
                    <div className="pt-1">
                      <div className="text-xs text-muted-foreground line-through">
                        De: ${svc.base_price.toLocaleString()} mxn / {svc.price_unit}
                      </div>
                      <div className="font-bold text-deep-purple">
                        Por: ${discountedPrice.toLocaleString()} mxn / {svc.price_unit}
                      </div>
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

'use client';

import Link from 'next/link';
import { Star, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCatalog } from '@/providers/catalog-provider';
import type { Service } from '@/types/database';

interface ServiceCarouselCardProps {
  service: Service;
  badge?: { text: string; className: string };
  originalPrice?: number;
  discountedPrice?: number;
}

export function ServiceCarouselCard({ service, badge, originalPrice, discountedPrice }: ServiceCarouselCardProps) {
  const { categoryMap, getCategoryIcon } = useCatalog();
  const cat = categoryMap[service.category];
  const CatIcon = getCategoryIcon(service.category);
  const visibleZones = service.zones.slice(0, 2);
  const remaining = service.zones.length - 2;
  const coverImage = service.images?.[0];

  const displayPrice = discountedPrice ?? service.base_price;
  const showStrikethrough = originalPrice != null && discountedPrice != null;

  return (
    <Link href={`/servicios/${service.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg cursor-pointer h-full">
        {/* Image */}
        <div className="relative">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={service.title} className="h-36 md:h-44 w-full object-cover" />
          ) : (
            <div className={`h-36 md:h-44 w-full flex items-center justify-center ${cat ? cat.color.replace('text-', 'bg-').split(' ')[0] : 'bg-gray-200'}`}>
              {cat && (
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <CatIcon className="h-5 w-5 md:h-7 md:w-7" />
                </div>
              )}
            </div>
          )}
          {badge && (
            <Badge className={`absolute top-2 left-2 md:top-3 md:left-3 border-0 font-semibold text-[10px] md:text-xs ${badge.className}`}>
              {badge.text}
            </Badge>
          )}
        </div>

        <CardContent className="p-2 md:p-3 space-y-1 md:space-y-1.5">
          {/* Category badge */}
          {cat && (
            <Badge className={`${cat.color} text-[10px] md:text-xs`} variant="secondary">
              {cat.label}
            </Badge>
          )}

          {/* Title */}
          <h3 className="font-semibold line-clamp-1 text-sm md:text-base leading-tight">{service.title}</h3>

          {/* Rating */}
          {service.review_count > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{service.avg_rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({service.review_count})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1">
            {showStrikethrough && (
              <span className="text-xs text-muted-foreground line-through">${originalPrice!.toLocaleString()}</span>
            )}
            <span className="text-sm md:text-base font-bold text-deep-purple">${displayPrice.toLocaleString()}</span>
            <span className="text-[10px] md:text-xs text-muted-foreground">/ {service.price_unit}</span>
          </div>

          {/* Provider */}
          {service.provider && (
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 truncate">
              <User className="h-3 w-3 flex-shrink-0" />
              por {service.provider.company_name || service.provider.full_name}
            </p>
          )}

          {/* Zones as badges */}
          <div className="flex flex-wrap gap-1">
            {visibleZones.map((z) => (
              <Badge key={z} variant="outline" className="text-[10px] md:text-xs font-normal py-0 px-1.5">{z}</Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="text-[10px] md:text-xs font-normal py-0 px-1.5">+{remaining}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

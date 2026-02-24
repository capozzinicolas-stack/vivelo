'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import type { ChatServiceCard as CardType } from '@/types/chat';

const CATEGORY_LABELS: Record<string, string> = {
  FOOD_DRINKS: 'Alimentos',
  AUDIO: 'Audio',
  DECORATION: 'Decoración',
  PHOTO_VIDEO: 'Foto/Video',
  STAFF: 'Staff',
  FURNITURE: 'Mobiliario',
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function ChatServiceCard({ service }: { service: CardType }) {
  return (
    <Link
      href={`/servicios/${service.id}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex gap-3">
        {service.image && (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={service.image}
              alt={service.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{service.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{CATEGORY_LABELS[service.category] || service.category}</span>
            {service.avg_rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {service.avg_rating.toFixed(1)}
                <span className="text-muted-foreground/60">({service.review_count})</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">
              {formatPrice(service.base_price)}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {service.price_unit}
              </span>
            </span>
            <span className="text-xs font-medium text-primary">Ver servicio →</span>
          </div>
          {service.provider_name && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {service.provider_name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

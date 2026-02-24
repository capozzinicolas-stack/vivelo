'use client';

import { Gift } from 'lucide-react';
import type { SiteBanner } from '@/types/database';

interface CashbackBannerProps {
  banner?: SiteBanner | null;
}

export function CashbackBanner({ banner }: CashbackBannerProps) {
  const title = banner?.title ?? 'Cashback de 5%';
  const subtitle = banner?.subtitle ?? 'regalos y servicios gratuitos con tus recompras';

  if (banner && !banner.is_active) return null;

  return (
    <div className="bg-deep-purple text-white py-2">
      <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm">
        <Gift className="h-4 w-4 text-gold" />
        <span>
          <span className="font-semibold text-gold">{title}</span>, {subtitle}
        </span>
      </div>
    </div>
  );
}

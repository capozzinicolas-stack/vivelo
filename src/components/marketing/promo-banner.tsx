'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import type { SiteBanner } from '@/types/database';
import { getActiveSiteBanners } from '@/lib/supabase/queries';

interface PromoBannerProps {
  /** Pass a pre-loaded banner (e.g. from server-side data) */
  banner?: SiteBanner | null;
  /** Or pass a banner_key to self-fetch */
  bannerKey?: string;
  /** Visual variant */
  variant?: 'full' | 'card' | 'inline';
  className?: string;
}

export function PromoBanner({ banner: bannerProp, bannerKey, variant = 'card', className = '' }: PromoBannerProps) {
  const [banner, setBanner] = useState<SiteBanner | null>(bannerProp ?? null);
  const [loaded, setLoaded] = useState(!!bannerProp);

  useEffect(() => {
    if (bannerProp || !bannerKey) return;
    getActiveSiteBanners().then(banners => {
      const found = banners.find(b => b.banner_key === bannerKey) ?? null;
      setBanner(found);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [bannerProp, bannerKey]);

  if (!loaded || !banner || !banner.is_active) return null;

  const gradient = banner.gradient || 'from-deep-purple to-indigo-800';

  if (variant === 'full') {
    return (
      <section className={`bg-gradient-to-r ${gradient} text-white py-10 md:py-14 ${className}`}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Megaphone className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Promocion</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{banner.title}</h2>
          {banner.subtitle && <p className="text-white/80 mb-6 max-w-xl mx-auto">{banner.subtitle}</p>}
          {banner.button_text && banner.button_link && (
            <Button size="lg" variant="secondary" asChild>
              <Link href={banner.button_link}>{banner.button_text}</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`bg-gradient-to-r ${gradient} text-white rounded-lg p-4 flex items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Megaphone className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{banner.title}</p>
            {banner.subtitle && <p className="text-xs text-white/80 truncate">{banner.subtitle}</p>}
          </div>
        </div>
        {banner.button_text && banner.button_link && (
          <Button size="sm" variant="secondary" asChild className="shrink-0">
            <Link href={banner.button_link}>{banner.button_text}</Link>
          </Button>
        )}
      </div>
    );
  }

  // variant === 'card'
  return (
    <div className={`bg-gradient-to-r ${gradient} text-white rounded-xl p-6 md:p-8 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <Megaphone className="h-5 w-5 mt-0.5 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Promocion</span>
      </div>
      <h3 className="text-xl md:text-2xl font-bold mb-2">{banner.title}</h3>
      {banner.subtitle && <p className="text-white/80 text-sm mb-4">{banner.subtitle}</p>}
      {banner.button_text && banner.button_link && (
        <Button variant="secondary" asChild>
          <Link href={banner.button_link}>{banner.button_text}</Link>
        </Button>
      )}
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import type { LandingPageBanner } from '@/types/database';

export function LandingHeroBanner({ banner }: { banner: LandingPageBanner | null }) {
  if (!banner) return null;

  return (
    <Link href={banner.cta_url} className="block mb-6">
      <div
        className="relative rounded-2xl overflow-hidden p-6 md:p-8 flex items-center justify-between gap-6 min-h-[120px]"
        style={{ backgroundColor: banner.background_color || '#43276c' }}
      >
        {banner.image_url && (
          <>
            <Image src={banner.image_url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          </>
        )}
        <div className="relative z-10 flex-1">
          <span className="inline-block bg-gold text-deep-purple text-xs font-bold px-2 py-1 rounded-full mb-2">
            Patrocinado
          </span>
          <h3 className="text-lg md:text-xl font-bold text-white mb-1">{banner.title}</h3>
          {banner.subtitle && (
            <p className="text-white/80 text-sm mb-3">{banner.subtitle}</p>
          )}
          <Button variant="secondary" size="sm">{banner.cta_text}</Button>
        </div>
        {banner.provider?.avatar_url && !banner.image_url && (
          <div className="relative z-10 hidden md:flex w-24 h-24 rounded-xl bg-white/10 items-center justify-center overflow-hidden flex-shrink-0">
            <Image src={banner.provider.avatar_url} alt="" fill className="object-cover" sizes="96px" />
          </div>
        )}
      </div>
    </Link>
  );
}

export function LandingMidFeedBanner({ banner }: { banner: LandingPageBanner | null }) {
  if (!banner) return null;

  return (
    <div className="col-span-full my-2">
      <Link href={banner.cta_url} className="block">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 p-5 md:p-6 rounded-2xl border-2 border-gold/30 bg-white hover:border-gold hover:shadow-lg transition-all relative">
          <span className="absolute top-2 right-3 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
            Patrocinado
          </span>
          {(banner.image_url || banner.provider?.avatar_url) && (
            <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
              <Image src={banner.image_url || banner.provider!.avatar_url!} alt="" fill className="object-cover" sizes="(max-width: 768px) 80px, 112px" />
            </div>
          )}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-base md:text-lg font-bold text-deep-purple mb-1">{banner.title}</h3>
            {banner.subtitle && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{banner.subtitle}</p>
            )}
          </div>
          <Button className="flex-shrink-0" size="sm">{banner.cta_text}</Button>
        </div>
      </Link>
    </div>
  );
}

export function LandingBottomBanner({ banner }: { banner: LandingPageBanner | null }) {
  if (!banner) return null;

  return (
    <Link href={banner.cta_url} className="block mt-8 mb-4">
      <div className="rounded-2xl bg-gradient-to-br from-off-white to-purple-50 border border-purple-100 p-6 md:p-8 text-center hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-bold text-deep-purple mb-2">{banner.title}</h3>
        {banner.subtitle && (
          <p className="text-sm text-muted-foreground mb-4">{banner.subtitle}</p>
        )}
        <Button>{banner.cta_text}</Button>
      </div>
    </Link>
  );
}

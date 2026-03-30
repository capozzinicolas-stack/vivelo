'use client';

import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { VIVELO_ZONES } from '@/lib/constants';

export function ZonesSection() {
  return (
    <section className="py-8 md:py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold">Servicios por zona</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {VIVELO_ZONES.map(zone => (
            <Link key={zone.slug} href={`/servicios/zona/${zone.slug}`}>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-md transition-shadow hover:border-deep-purple/30 group">
                <MapPin className="h-5 w-5 mx-auto mb-2 text-deep-purple/60 group-hover:text-deep-purple transition-colors" />
                <span className="font-medium text-sm">{zone.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

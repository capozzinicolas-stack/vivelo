'use client';

import Link from 'next/link';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { EVENT_TYPES } from '@/data/event-types';

export function EventTypesSection() {
  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold">Encuentra servicios para tu evento</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {EVENT_TYPES.map(et => (
            <Link key={et.slug} href={`/eventos/${et.slug}`}>
              <div className="rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow hover:border-deep-purple/30 group">
                <PartyPopper className="h-5 w-5 mx-auto mb-2 text-deep-purple/60 group-hover:text-deep-purple transition-colors" />
                <span className="font-medium text-sm">{et.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

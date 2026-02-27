'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { categories } from '@/data/categories';

const categoryGradients: Record<string, string> = {
  FOOD_DRINKS: 'from-orange-200 to-orange-100',
  AUDIO: 'from-blue-200 to-blue-100',
  DECORATION: 'from-pink-200 to-pink-100',
  PHOTO_VIDEO: 'from-purple-200 to-purple-100',
  STAFF: 'from-green-200 to-green-100',
  FURNITURE: 'from-amber-200 to-amber-100',
};

export function CategoriesShowcaseSection() {
  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold">Categorias destacadas</h2>
          <Link href="/servicios" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todas <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.slice(0, 4).map((cat) => (
            <Link key={cat.value} href={`/servicios?categoria=${cat.value}`}>
              <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${categoryGradients[cat.value] || 'from-gray-200 to-gray-100'} h-[160px] md:h-[280px] p-4 md:p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer group`}>
                <h3 className="text-base md:text-2xl font-bold text-deep-purple leading-tight">{cat.label}</h3>
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${cat.color} self-end group-hover:scale-110 transition-transform`}>
                  <cat.icon className="h-5 w-5 md:h-7 md:w-7" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

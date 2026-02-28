'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCatalog } from '@/providers/catalog-provider';

export function MobileCategoryBar() {
  const [selected, setSelected] = useState<string | null>(null);
  const { categories, getCategoryIcon } = useCatalog();

  return (
    <div className="md:hidden border-b bg-white">
      <div className="flex overflow-x-auto scrollbar-hide gap-0 px-2">
        {categories.filter(c => c.is_active).map((cat) => {
          const active = selected === cat.slug;
          const CatIcon = getCategoryIcon(cat.slug);
          return (
            <Link
              key={cat.slug}
              href={`/servicios?categoria=${cat.slug}`}
              onClick={() => setSelected(cat.slug)}
              className={`flex flex-col items-center gap-1 px-4 py-3 min-w-[76px] shrink-0 transition-colors ${
                active
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-500 border-b-2 border-transparent'
              }`}
            >
              <CatIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium whitespace-nowrap leading-none">
                {cat.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

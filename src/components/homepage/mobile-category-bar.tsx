'use client';

import { useState } from 'react';
import Link from 'next/link';
import { categories } from '@/data/categories';

export function MobileCategoryBar() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="md:hidden border-b bg-white">
      <div className="flex overflow-x-auto scrollbar-hide gap-0 px-2">
        {categories.map((cat) => {
          const active = selected === cat.value;
          return (
            <Link
              key={cat.value}
              href={`/servicios?categoria=${cat.value}`}
              onClick={() => setSelected(cat.value)}
              className={`flex flex-col items-center gap-1 px-4 py-3 min-w-[76px] shrink-0 transition-colors ${
                active
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-500 border-b-2 border-transparent'
              }`}
            >
              <cat.icon className="h-5 w-5" />
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

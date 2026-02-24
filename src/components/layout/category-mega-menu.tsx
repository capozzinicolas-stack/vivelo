'use client';

import Link from 'next/link';
import type { CategoryInfo } from '@/data/categories';

interface CategoryMegaMenuProps {
  category: CategoryInfo;
  onClose: () => void;
}

export function CategoryMegaMenu({ category, onClose }: CategoryMegaMenuProps) {
  return (
    <div
      className="absolute top-full left-0 w-full bg-white border-b shadow-lg z-50"
      onMouseLeave={onClose}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.color}`}>
            <category.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{category.label}</h3>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <Link
            href={`/servicios?categoria=${category.value}`}
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
          >
            Ver todos
          </Link>
          {category.subcategories.map((sub) => (
            <Link
              key={sub.value}
              href={`/servicios?categoria=${category.value}&subcategoria=${sub.value}`}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

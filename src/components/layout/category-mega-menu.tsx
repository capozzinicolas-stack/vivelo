'use client';

import Link from 'next/link';
import type { CatalogCategory } from '@/types/database';
import { useCatalog } from '@/providers/catalog-provider';
import { getIcon } from '@/lib/icon-registry';

interface CategoryMegaMenuProps {
  category: CatalogCategory;
  onClose: () => void;
}

export function CategoryMegaMenu({ category, onClose }: CategoryMegaMenuProps) {
  const { getSubcategoriesByCategory } = useCatalog();
  const subcategories = getSubcategoriesByCategory(category.slug);
  const Icon = getIcon(category.icon);

  return (
    <div
      className="absolute top-full left-0 w-full bg-white border-b shadow-lg z-50"
      onMouseLeave={onClose}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{category.label}</h3>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <Link
            href={`/servicios?categoria=${category.slug}`}
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
          >
            Ver todos
          </Link>
          {subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={`/servicios?categoria=${category.slug}&subcategoria=${sub.slug}`}
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

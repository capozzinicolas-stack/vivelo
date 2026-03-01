'use client';

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import type { CatalogCategory, CatalogSubcategory, CatalogZone } from '@/types/database';
import type { LucideIcon } from 'lucide-react';
import { getIcon } from '@/lib/icon-registry';

interface CatalogContextValue {
  categories: CatalogCategory[];
  subcategories: CatalogSubcategory[];
  zones: CatalogZone[];
  loading: boolean;
  categoryMap: Record<string, CatalogCategory>;
  subcategoryMap: Record<string, CatalogSubcategory & { parentCategory: string }>;
  getCategoryBySlug: (slug: string) => CatalogCategory | undefined;
  getSubcategoriesByCategory: (categorySlug: string) => CatalogSubcategory[];
  getZoneLabel: (slug: string) => string;
  getCategoryIcon: (slug: string) => LucideIcon;
  getCategoryLabel: (slug: string) => string;
  getCategoryColor: (slug: string) => string;
  getCategoryCommissionRate: (slug: string) => number;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([]);
  const [zones, setZones] = useState<CatalogZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/admin/catalog');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setSubcategories(data.subcategories || []);
        setZones(data.zones || []);
      } else {
        // Fallback to static data if API fails
        const { categories: staticCats } = await import('@/data/categories');
        const { ZONES } = await import('@/lib/constants');
        setCategories(staticCats.map((c, i) => ({
          slug: c.value,
          label: c.label,
          description: c.description,
          icon: c.icon.displayName || 'Tag',
          color: c.color,
          sku_prefix: c.value === 'FOOD_DRINKS' ? 'FD' : c.value === 'AUDIO' ? 'AU' : c.value === 'DECORATION' ? 'DE' : c.value === 'PHOTO_VIDEO' ? 'PV' : c.value === 'STAFF' ? 'ST' : 'FU',
          sort_order: i + 1,
          is_active: true,
          commission_rate: 0.12,
        })));
        setSubcategories(staticCats.flatMap((c) =>
          c.subcategories.map((s, j) => ({
            slug: s.value,
            category_slug: c.value,
            label: s.label,
            sort_order: j + 1,
            is_active: true,
          }))
        ));
        setZones(ZONES.map((z, i) => ({
          slug: z.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          label: z,
          sort_order: i + 1,
          is_active: true,
          commission_rate: 0.12,
        })));
      }
    } catch {
      // Fallback to static data
      const { categories: staticCats } = await import('@/data/categories');
      const { ZONES } = await import('@/lib/constants');
      setCategories(staticCats.map((c, i) => ({
        slug: c.value,
        label: c.label,
        description: c.description,
        icon: c.icon.displayName || 'Tag',
        color: c.color,
        sku_prefix: c.value === 'FOOD_DRINKS' ? 'FD' : c.value === 'AUDIO' ? 'AU' : c.value === 'DECORATION' ? 'DE' : c.value === 'PHOTO_VIDEO' ? 'PV' : c.value === 'STAFF' ? 'ST' : 'FU',
        sort_order: i + 1,
        is_active: true,
        commission_rate: 0.12,
      })));
      setSubcategories(staticCats.flatMap((c) =>
        c.subcategories.map((s, j) => ({
          slug: s.value,
          category_slug: c.value,
          label: s.label,
          sort_order: j + 1,
          is_active: true,
        }))
      ));
      setZones(ZONES.map((z, i) => ({
        slug: z.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        label: z,
        sort_order: i + 1,
        is_active: true,
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCatalog(); }, []);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map(c => [c.slug, c])),
    [categories]
  );

  const subcategoryMap = useMemo(
    () => Object.fromEntries(
      subcategories.map(s => [s.slug, { ...s, parentCategory: s.category_slug }])
    ),
    [subcategories]
  );

  const getCategoryBySlug = (slug: string) => categoryMap[slug];

  const getSubcategoriesByCategory = (categorySlug: string) =>
    subcategories.filter(s => s.category_slug === categorySlug && s.is_active);

  const getZoneLabel = (slug: string) => {
    const zone = zones.find(z => z.slug === slug || z.label === slug);
    return zone?.label || slug;
  };

  const getCategoryIcon = (slug: string): LucideIcon => {
    const cat = categoryMap[slug];
    return getIcon(cat?.icon || 'Tag');
  };

  const getCategoryLabel = (slug: string): string => {
    return categoryMap[slug]?.label || slug;
  };

  const getCategoryColor = (slug: string): string => {
    return categoryMap[slug]?.color || 'bg-gray-100 text-gray-600';
  };

  const getCategoryCommissionRate = (slug: string): number => {
    return categoryMap[slug]?.commission_rate ?? 0.12;
  };

  const value: CatalogContextValue = {
    categories,
    subcategories,
    zones,
    loading,
    categoryMap,
    subcategoryMap,
    getCategoryBySlug,
    getSubcategoriesByCategory,
    getZoneLabel,
    getCategoryIcon,
    getCategoryLabel,
    getCategoryColor,
    getCategoryCommissionRate,
    refresh: fetchCatalog,
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ServiceFilters, defaultFilters, type Filters } from './service-filters';
import { ServiceCard } from './service-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';
import type { Service } from '@/types/database';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';

interface EmptyStateSuggestion {
  label: string;
  href: string;
  count: number;
}

interface LandingPageClientProps {
  services: Service[];
  initialCategory?: string;
  initialSubcategory?: string;
  initialZone?: string;
  hideCategory?: boolean;
  hideZone?: boolean;
  emptyStateTitle?: string;
  emptyStateSuggestions?: EmptyStateSuggestion[];
  emptyStateCta?: { label: string; href: string };
}

export function LandingPageClient({
  services,
  initialCategory = '',
  initialSubcategory = '',
  initialZone = '',
  hideCategory,
  hideZone,
  emptyStateTitle,
  emptyStateSuggestions,
  emptyStateCta,
}: LandingPageClientProps) {
  const [filters, setFilters] = useState<Filters>({
    ...defaultFilters,
    category: initialCategory,
    subcategory: initialSubcategory,
    zone: initialZone,
  });
  const [sort, setSort] = useState<SortOption>('relevance');

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters({
      ...newFilters,
      ...(hideCategory ? { category: initialCategory } : {}),
      ...(hideZone ? { zone: initialZone } : {}),
    });
  };

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (filters.category && s.category !== filters.category) return false;
      if (filters.subcategory && s.subcategory !== filters.subcategory) return false;
      if (filters.zone && !s.zones.includes(filters.zone)) return false;
      if (s.base_price > filters.priceRange[1]) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      if (filters.tags.length > 0) {
        if (!s.tags || !s.tags.some(t => filters.tags.includes(t))) return false;
      }
      return true;
    });
  }, [services, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case 'price_asc': return list.sort((a, b) => a.base_price - b.base_price);
      case 'price_desc': return list.sort((a, b) => b.base_price - a.base_price);
      case 'rating': return list.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
      case 'newest': return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default: return list;
    }
  }, [filtered, sort]);

  const handleReset = () => {
    setFilters({ ...defaultFilters, category: initialCategory, zone: initialZone });
  };

  const activeFilterCount = [
    !hideCategory && filters.category && filters.category !== initialCategory,
    filters.subcategory,
    !hideZone && filters.zone && filters.zone !== initialZone,
    filters.priceRange[1] < 1000000,
    filters.tags.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="flex gap-8">
      <aside className="hidden lg:block w-64 shrink-0">
        <ServiceFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          hideCategory={hideCategory}
          hideZone={hideZone}
        />
      </aside>

      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="rounded-full shadow-lg">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
            <div className="mt-6">
              <ServiceFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                hideCategory={hideCategory}
                hideZone={hideZone}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {sorted.length} servicio{sorted.length !== 1 ? 's' : ''} disponible{sorted.length !== 1 ? 's' : ''}
          </p>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevancia</SelectItem>
              <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="rating">Mejor calificados</SelectItem>
              <SelectItem value="newest">Mas recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-4xl mb-4">&#x1F50D;</div>
            <h3 className="text-lg font-semibold mb-2">{emptyStateTitle || 'No se encontraron servicios'}</h3>
            <p className="text-muted-foreground mb-6">
              {filters.search.trim()
                ? 'Intenta con otro termino de busqueda o ajusta los filtros.'
                : 'Ajusta los filtros o explora otras opciones.'}
            </p>
            {emptyStateSuggestions && emptyStateSuggestions.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">Prueba en:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {emptyStateSuggestions.map(s => (
                    <Link key={s.href} href={s.href}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent">{s.label} ({s.count})</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleReset}>Limpiar filtros</Button>
              {emptyStateCta && (
                <Link href={emptyStateCta.href}>
                  <Button variant="outline">{emptyStateCta.label}</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sorted.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}

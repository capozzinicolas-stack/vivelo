'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ServiceCard } from './service-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { Service } from '@/types/database';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';

interface EmptyStateSuggestion {
  label: string;
  href: string;
  count: number;
}

interface LandingGridClientProps {
  services: Service[];
  showSearch?: boolean;
  showSort?: boolean;
  emptyStateTitle?: string;
  emptyStateSuggestions?: EmptyStateSuggestion[];
  emptyStateCta?: { label: string; href: string };
}

export function LandingGridClient({
  services,
  showSearch = true,
  showSort = true,
  emptyStateTitle,
  emptyStateSuggestions,
  emptyStateCta,
}: LandingGridClientProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('relevance');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return services;
    const q = debouncedSearch.toLowerCase();
    return services.filter(s =>
      s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [services, debouncedSearch]);

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

  return (
    <>
      {/* Toolbar: search + sort */}
      {(showSearch || showSort) && services.length > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {showSearch && services.length > 3 && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar servicios..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-9" />
            </div>
          )}
          {showSort && services.length > 1 && (
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="text-4xl mb-4">&#x1F50D;</div>
          <h3 className="text-lg font-semibold mb-2">{emptyStateTitle || 'Aun no hay servicios disponibles'}</h3>
          <p className="text-muted-foreground mb-6">
            {debouncedSearch.trim()
              ? 'Intenta con otro termino de busqueda.'
              : 'Estamos creciendo. Pronto habra opciones aqui.'}
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
          {emptyStateCta && (
            <Link href={emptyStateCta.href}>
              <Button variant="outline">{emptyStateCta.label}</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{sorted.length} servicio{sorted.length !== 1 ? 's' : ''} disponible{sorted.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        </>
      )}
    </>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { ServiceCard } from '@/components/services/service-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Tag, Grid3X3 } from 'lucide-react';
import type { Service } from '@/types/database';

interface ProviderServicesGridProps {
  services: Service[];
}

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating';

export function ProviderServicesGrid({ services }: ProviderServicesGridProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Extract unique filter values
  const allZones = useMemo(() => Array.from(new Set(services.flatMap(s => s.zones))).sort(), [services]);
  const allCategories = useMemo(() => Array.from(new Set(services.map(s => s.category))).sort(), [services]);
  const allSubcategories = useMemo(() => {
    const subs = services.filter(s => s.subcategory).map(s => s.subcategory!);
    return Array.from(new Set(subs)).sort();
  }, [services]);

  const showFilters = services.length >= 4;

  // Filter
  const filtered = useMemo(() => {
    let result = services;
    if (selectedZone) {
      result = result.filter(s => s.zones.includes(selectedZone));
    }
    if (selectedCategory) {
      result = result.filter(s => s.category === selectedCategory);
    }
    if (selectedSubcategory) {
      result = result.filter(s => s.subcategory === selectedSubcategory);
    }
    // Sort
    switch (sortBy) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.base_price - b.base_price);
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => b.base_price - a.base_price);
        break;
      case 'rating':
        result = [...result].sort((a, b) => b.avg_rating - a.avg_rating);
        break;
    }
    return result;
  }, [services, selectedZone, selectedCategory, selectedSubcategory, sortBy]);

  const hasActiveFilters = selectedZone || selectedCategory || selectedSubcategory;

  const clearFilters = () => {
    setSelectedZone(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSortBy('default');
  };

  if (services.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Servicios ofrecidos</h2>
        <p className="text-muted-foreground text-center py-8">Este proveedor no tiene servicios activos</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Servicios ofrecidos</h2>
        {showFilters && (
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Predeterminado</SelectItem>
              <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="rating">Mejor calificados</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-5">
          {/* Zone filters */}
          {allZones.length >= 2 && allZones.map((zone) => (
            <button
              key={`z-${zone}`}
              onClick={() => setSelectedZone(selectedZone === zone ? null : zone)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedZone === zone
                  ? 'bg-deep-purple text-white'
                  : 'bg-white border text-muted-foreground hover:border-deep-purple/30'
              }`}
            >
              <MapPin className="h-3 w-3" />{zone}
            </button>
          ))}

          {/* Category filters */}
          {allCategories.length >= 2 && allCategories.map((cat) => (
            <button
              key={`c-${cat}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-deep-purple text-white'
                  : 'bg-white border text-muted-foreground hover:border-deep-purple/30'
              }`}
            >
              <Grid3X3 className="h-3 w-3" />{cat}
            </button>
          ))}

          {/* Subcategory filters */}
          {allSubcategories.length >= 2 && allSubcategories.map((sub) => (
            <button
              key={`s-${sub}`}
              onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedSubcategory === sub
                  ? 'bg-deep-purple text-white'
                  : 'bg-white border text-muted-foreground hover:border-deep-purple/30'
              }`}
            >
              <Tag className="h-3 w-3" />{sub}
            </button>
          ))}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Results count when filtering */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length} de {services.length} servicio{services.length !== 1 ? 's' : ''}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No hay servicios que coincidan con los filtros seleccionados</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}
    </div>
  );
}

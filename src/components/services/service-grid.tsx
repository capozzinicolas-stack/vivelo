'use client';

import { ServiceCard } from './service-card';
import { Button } from '@/components/ui/button';
import type { Service } from '@/types/database';
import type { Filters } from './service-filters';

interface ServiceGridProps {
  services: Service[];
  filters: Filters;
  onResetFilters: () => void;
}

export function ServiceGrid({ services, filters, onResetFilters }: ServiceGridProps) {
  const filtered = services.filter((s) => {
    if (s.status !== 'active') return false;
    if (filters.category && s.category !== filters.category) return false;
    if (filters.zone && !s.zones.includes(filters.zone)) return false;
    if (s.base_price > filters.priceRange[1]) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-muted-foreground mb-4">No se encontraron servicios</p>
        <Button variant="outline" onClick={onResetFilters}>Limpiar filtros</Button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{filtered.length} servicio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s) => <ServiceCard key={s.id} service={s} />)}
      </div>
    </div>
  );
}

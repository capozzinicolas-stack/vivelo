'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useCatalog } from '@/providers/catalog-provider';
import { Search, X } from 'lucide-react';

export interface Filters {
  category: string;
  subcategory: string;
  zone: string;
  priceRange: [number, number];
  search: string;
}

interface ServiceFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const defaultFilters: Filters = { category: '', subcategory: '', zone: '', priceRange: [0, 1000000], search: '' };

export function ServiceFilters({ filters, onFiltersChange }: ServiceFiltersProps) {
  const { categories, zones, getSubcategoriesByCategory } = useCatalog();
  const update = (partial: Partial<Filters>) => onFiltersChange({ ...filters, ...partial });

  const availableSubcategories = filters.category
    ? getSubcategoriesByCategory(filters.category)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar servicios..." value={filters.search} onChange={(e) => update({ search: e.target.value })} className="pl-9" />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Categoria</Label>
        <Select value={filters.category} onValueChange={(v) => update({ category: v === 'ALL' ? '' : v, subcategory: '' })}>
          <SelectTrigger><SelectValue placeholder="Todas las categorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las categorias</SelectItem>
            {categories.filter(c => c.is_active).map((c) => <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {availableSubcategories.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Subcategoria</Label>
          <Select value={filters.subcategory} onValueChange={(v) => update({ subcategory: v === 'ALL' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Todas las subcategorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las subcategorias</SelectItem>
              {availableSubcategories.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-2 block">Zona</Label>
        <Select value={filters.zone} onValueChange={(v) => update({ zone: v === 'ALL' ? '' : v })}>
          <SelectTrigger><SelectValue placeholder="Todas las zonas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las zonas</SelectItem>
            {zones.filter(z => z.is_active).map((z) => <SelectItem key={z.slug} value={z.label}>{z.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Precio maximo: ${filters.priceRange[1].toLocaleString()}</Label>
        <Slider min={0} max={1000000} step={5000} value={[filters.priceRange[1]]} onValueChange={([v]) => update({ priceRange: [0, v] })} />
      </div>

      <Button variant="outline" className="w-full" onClick={() => onFiltersChange(defaultFilters)}>
        <X className="h-4 w-4 mr-2" />Limpiar Filtros
      </Button>
    </div>
  );
}

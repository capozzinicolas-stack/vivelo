'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useCatalog } from '@/providers/catalog-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X } from 'lucide-react';

export interface Filters {
  category: string;
  subcategory: string;
  zone: string;
  priceRange: [number, number];
  search: string;
  tags: string[];
}

interface ServiceFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  hideCategory?: boolean;
  hideZone?: boolean;
}

export const defaultFilters: Filters = { category: '', subcategory: '', zone: '', priceRange: [0, 1000000], search: '', tags: [] };

export function ServiceFilters({ filters, onFiltersChange, hideCategory, hideZone }: ServiceFiltersProps) {
  const { categories, zones, getSubcategoriesByCategory, getTagsByCategory, getSubcategoryIcon } = useCatalog();
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

      {!hideCategory && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Categoria</Label>
          <Select value={filters.category} onValueChange={(v) => update({ category: v === 'ALL' ? '' : v, subcategory: '', tags: [] })}>
            <SelectTrigger><SelectValue placeholder="Todas las categorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las categorias</SelectItem>
              {categories.filter(c => c.is_active).map((c) => <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {availableSubcategories.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Subcategoria</Label>
          <Select value={filters.subcategory} onValueChange={(v) => update({ subcategory: v === 'ALL' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Todas las subcategorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las subcategorias</SelectItem>
              {availableSubcategories.map((s) => {
                const SubIcon = getSubcategoryIcon(s.slug);
                return <SelectItem key={s.slug} value={s.slug}><span className="flex items-center gap-2"><SubIcon className="h-4 w-4" />{s.label}</span></SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {filters.category && getTagsByCategory(filters.category).length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Etiquetas</Label>
          <div className="space-y-2">
            {getTagsByCategory(filters.category).map(tag => (
              <label key={tag.slug} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.tags.includes(tag.slug)}
                  onCheckedChange={(checked) => {
                    const newTags = checked
                      ? [...filters.tags, tag.slug]
                      : filters.tags.filter(t => t !== tag.slug);
                    update({ tags: newTags });
                  }}
                />
                <span className="text-sm">{tag.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!hideZone && (
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
      )}

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

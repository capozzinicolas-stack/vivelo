'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ServiceFilters, defaultFilters, type Filters } from '@/components/services/service-filters';
import { ServiceGrid } from '@/components/services/service-grid';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ServiceCard } from '@/components/services/service-card';
import { PromoBanner } from '@/components/marketing/promo-banner';
import type { Service } from '@/types/database';

interface ServiciosListClientProps {
  initialServices: Service[];
  initialSponsoredServices: Service[];
}

function ServiciosContent({ initialServices, initialSponsoredServices }: ServiciosListClientProps) {
  const searchParams = useSearchParams();
  const paramCat = searchParams.get('categoria') || '';
  const paramSubcat = searchParams.get('subcategoria') || '';
  const paramZone = searchParams.get('zona') || '';
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, category: paramCat, subcategory: paramSubcat, zone: paramZone });
  const [services] = useState<Service[]>(initialServices);
  const [sponsoredServices] = useState<Service[]>(initialSponsoredServices);

  // Sync filters when URL search params change (e.g. clicking a different category in the navbar)
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category: paramCat,
      subcategory: paramSubcat,
      zone: paramZone,
    }));
  }, [paramCat, paramSubcat, paramZone]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Servicios para Eventos</h1>
        <p className="text-muted-foreground mt-2">Encuentra el servicio perfecto para tu evento en México</p>
      </div>

      <PromoBanner bannerKey="services_top_banner" variant="inline" className="mb-6" />

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <ServiceFilters filters={filters} onFiltersChange={setFilters} />
        </aside>

        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="rounded-full shadow-lg"><SlidersHorizontal className="h-4 w-4 mr-2" />Filtros</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
              <div className="mt-6"><ServiceFilters filters={filters} onFiltersChange={setFilters} /></div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1">
          {(() => {
            const filteredSponsored = sponsoredServices.filter(s => {
              if (s.status !== 'active') return false;
              if (filters.category && s.category !== filters.category) return false;
              if (filters.subcategory && s.subcategory !== filters.subcategory) return false;
              if (filters.zone && !s.zones.includes(filters.zone)) return false;
              if (s.base_price > filters.priceRange[1]) return false;
              if (filters.search) {
                const q = filters.search.toLowerCase();
                if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
              }
              if (filters.tags && filters.tags.length > 0) {
                if (!s.tags || !s.tags.some(t => filters.tags.includes(t))) return false;
              }
              return true;
            });
            return filteredSponsored.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Patrocinado</Badge>
                  Servicios destacados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {filteredSponsored.slice(0, 3).map(s => (
                    <div key={s.id} className="relative">
                      <ServiceCard service={s} />
                      <Badge className="absolute top-2 right-2 bg-gold text-deep-purple border-0 text-[10px]">Patrocinado</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
          <ServiceGrid services={services} filters={filters} onResetFilters={() => setFilters(defaultFilters)} />
        </div>
      </div>
    </div>
  );
}

export function ServiciosListClient({ initialServices, initialSponsoredServices }: ServiciosListClientProps) {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Cargando servicios...</div>}>
      <ServiciosContent initialServices={initialServices} initialSponsoredServices={initialSponsoredServices} />
    </Suspense>
  );
}

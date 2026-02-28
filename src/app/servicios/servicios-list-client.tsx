'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getServices, getFeaturedPlacements } from '@/lib/supabase/queries';
import { ServiceFilters, defaultFilters, type Filters } from '@/components/services/service-filters';
import { ServiceGrid } from '@/components/services/service-grid';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ServiceCard } from '@/components/services/service-card';
import type { Service } from '@/types/database';

function ServiciosContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('categoria') || '';
  const initialSubcat = searchParams.get('subcategoria') || '';
  const initialZone = searchParams.get('zona') || '';
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, category: initialCat, subcategory: initialSubcat, zone: initialZone });
  const [services, setServices] = useState<Service[]>([]);
  const [sponsoredServices, setSponsoredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getServices(),
      getFeaturedPlacements('servicios_destacados'),
    ]).then(([svcs, placements]) => {
      setServices(svcs);
      const featuredIds = new Set(placements.map(p => p.service_id));
      setSponsoredServices(svcs.filter(s => featuredIds.has(s.id)));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Servicios para Eventos</h1>
        <p className="text-muted-foreground mt-2">Encuentra el servicio perfecto para tu evento en México</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
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
            {sponsoredServices.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Patrocinado</Badge>
                  Servicios destacados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {sponsoredServices.slice(0, 3).map(s => (
                    <div key={s.id} className="relative">
                      <ServiceCard service={s} />
                      <Badge className="absolute top-2 right-2 bg-gold text-deep-purple border-0 text-[10px]">Patrocinado</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ServiceGrid services={services} filters={filters} onResetFilters={() => setFilters(defaultFilters)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ServiciosListClient() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Cargando servicios...</div>}>
      <ServiciosContent />
    </Suspense>
  );
}

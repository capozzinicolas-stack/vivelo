'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getServices } from '@/lib/supabase/queries';
import { ServiceFilters, defaultFilters, type Filters } from '@/components/services/service-filters';
import { ServiceGrid } from '@/components/services/service-grid';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import type { Service } from '@/types/database';

function ServiciosContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('categoria') || '';
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, category: initialCat });
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices().then(setServices).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Servicios para Eventos</h1>
        <p className="text-muted-foreground mt-2">Encuentra el servicio perfecto para tu evento en Puerto Rico</p>
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
            <ServiceGrid services={services} filters={filters} onResetFilters={() => setFilters(defaultFilters)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Cargando servicios...</div>}>
      <ServiciosContent />
    </Suspense>
  );
}

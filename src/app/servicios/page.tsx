'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockServices } from '@/data/mock-services';
import { ServiceFilters, defaultFilters, type Filters } from '@/components/services/service-filters';
import { ServiceGrid } from '@/components/services/service-grid';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';

export default function ServiciosPage() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('categoria') || '';
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, category: initialCat });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Servicios para Eventos</h1>
        <p className="text-muted-foreground mt-2">Encuentra el servicio perfecto para tu evento en Puerto Rico</p>
      </div>

      <div className="flex gap-8">
        {/* Desktop filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <ServiceFilters filters={filters} onFiltersChange={setFilters} />
        </aside>

        {/* Mobile filter button */}
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

        {/* Grid */}
        <div className="flex-1">
          <ServiceGrid services={mockServices} filters={filters} onResetFilters={() => setFilters(defaultFilters)} />
        </div>
      </div>
    </div>
  );
}

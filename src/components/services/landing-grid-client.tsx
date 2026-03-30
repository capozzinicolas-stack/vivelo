'use client';

import { useState } from 'react';
import { ServiceCard } from './service-card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Service } from '@/types/database';

interface LandingGridClientProps {
  services: Service[];
  showSearch?: boolean;
}

export function LandingGridClient({ services, showSearch = true }: LandingGridClientProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? services.filter(s => {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      })
    : services;

  return (
    <>
      {showSearch && services.length > 3 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar servicios..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">
            {search.trim() ? 'No se encontraron servicios para tu busqueda.' : 'Aun no hay servicios disponibles en esta seccion.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} servicio{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        </>
      )}
    </>
  );
}

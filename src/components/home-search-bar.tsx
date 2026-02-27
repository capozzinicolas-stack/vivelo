'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { categories, subcategoriesByCategory } from '@/data/categories';
import { ZONES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, CalendarIcon, Users, MapPin } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';

export function HomeSearchBar() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [guests, setGuests] = useState('');
  const [zone, setZone] = useState('');

  const availableSubcategories = category && category !== 'ALL'
    ? subcategoriesByCategory[category as ServiceCategory] || []
    : [];

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setSubcategory('');
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.set('categoria', category);
    if (subcategory && subcategory !== 'ALL') params.set('subcategoria', subcategory);
    if (date) params.set('fecha', format(date, 'yyyy-MM-dd'));
    if (guests) params.set('personas', guests);
    if (zone && zone !== 'ALL') params.set('zona', zone);
    router.push(`/servicios${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="bg-white text-gray-900 rounded-2xl md:rounded-full shadow-xl border border-gray-200 p-2 flex flex-col md:flex-row items-stretch md:items-center gap-0">
        {/* Tipo de servicio */}
        <div className="flex-1 min-w-0 px-4 py-2 md:border-r border-gray-200">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Tipo de Servicio</label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="border-0 shadow-none p-0 h-auto text-sm font-medium focus:ring-0 bg-transparent text-gray-900 data-[placeholder]:text-gray-400">
              <SelectValue placeholder="Todas las categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subcategoria - conditional */}
        {availableSubcategories.length > 0 && (
          <div className="flex-1 min-w-0 px-4 py-2 md:border-r border-gray-200">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Subcategoria</label>
            <Select value={subcategory} onValueChange={setSubcategory}>
              <SelectTrigger className="border-0 shadow-none p-0 h-auto text-sm font-medium focus:ring-0 bg-transparent text-gray-900 data-[placeholder]:text-gray-400">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {availableSubcategories.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fecha del evento */}
        <div className="flex-1 min-w-0 px-4 py-2 md:border-r border-gray-200">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Fecha del Evento</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium w-full text-left">
                <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
                <span className={date ? 'text-gray-900' : 'text-gray-400'}>
                  {date ? format(date, 'd MMM yyyy', { locale: es }) : 'Seleccionar fecha'}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Numero de personas */}
        <div className="flex-1 min-w-0 px-4 py-2 md:border-r border-gray-200">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Personas</label>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400 shrink-0" />
            <Input
              type="number"
              min={1}
              placeholder="Cantidad"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="border-0 shadow-none p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Ubicacion */}
        <div className="flex-1 min-w-0 px-4 py-2">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Ubicacion</label>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger className="border-0 shadow-none p-0 h-auto text-sm font-medium focus:ring-0 bg-transparent text-gray-900 data-[placeholder]:text-gray-400">
                <SelectValue placeholder="Toda la zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toda la zona</SelectItem>
                {ZONES.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search button */}
        <div className="px-2 py-2 md:py-0">
          <Button
            onClick={handleSearch}
            size="lg"
            className="rounded-full w-full md:w-12 h-12 p-0 bg-violet-600 hover:bg-violet-700"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

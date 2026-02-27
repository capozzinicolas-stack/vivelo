'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
import type { ShowcaseItem, SiteBanner } from '@/types/database';

interface ShowcaseSubcategory {
  value: string;
  label: string;
  description: string;
  parentCategory: string;
  color: string;
}

const DEFAULT_ITEMS: ShowcaseSubcategory[] = [
  { value: 'ANIMADOR_MC', label: 'Animadores', description: 'El espiritu de tu evento quien determina eres tu! Conozca la amplia variedad de animadores de Vivelo y dale vida a tu evento con tu toque especial.', parentCategory: 'AUDIO', color: 'from-purple-500 to-pink-500' },
  { value: 'MARIACHI', label: 'Mariachis', description: 'La alma de tu evento no puede dejar de existir! Los mariachis mas clasicos de Mexico pueden estar presentes en tu evento para que tu lo vivas sin igual.', parentCategory: 'AUDIO', color: 'from-amber-500 to-orange-500' },
  { value: 'COORDINADOR_PLANNER', label: 'Planners', description: 'No deje que ningun detalle de tu evento sea olvidado, solo Vivelo. Nuestra seleccion especial de planners para que tu disfrute cada momento.', parentCategory: 'STAFF', color: 'from-green-500 to-teal-500' },
  { value: 'FLORAL', label: 'Floristas', description: 'Transforma tu evento en un jardin de ensueño. Los mejores arreglos florales para bodas, fiestas y celebraciones especiales.', parentCategory: 'DECORATION', color: 'from-pink-400 to-rose-500' },
  { value: 'SEGURIDAD', label: 'Seguridad', description: 'La tranquilidad de tu evento empieza con la seguridad. Profesionales capacitados para garantizar que todo salga perfecto.', parentCategory: 'STAFF', color: 'from-gray-600 to-gray-800' },
  { value: 'VALET_PARKING', label: 'Valet Parking', description: 'La primera impresion cuenta. Servicio de estacionamiento profesional para que tus invitados lleguen con estilo.', parentCategory: 'STAFF', color: 'from-blue-500 to-indigo-600' },
];

interface SubcategoryShowcaseSectionProps {
  items?: ShowcaseItem[];
  promoBanner?: SiteBanner | null;
}

export function SubcategoryShowcaseSection({ items, promoBanner }: SubcategoryShowcaseSectionProps) {
  const showcaseData: ShowcaseSubcategory[] = (items && items.length > 0)
    ? items.map(i => ({
        value: i.subcategory,
        label: i.label,
        description: i.description,
        parentCategory: i.parent_category,
        color: i.gradient_color,
      }))
    : DEFAULT_ITEMS;

  const promoTitle = promoBanner?.title ?? 'Los mejores servicios para tu evento';
  const promoButtonText = promoBanner?.button_text ?? 'Todos los servicios';
  const promoButtonLink = promoBanner?.button_link ?? '/servicios';
  const promoGradient = promoBanner?.gradient ?? 'from-pink-300 via-pink-400 to-pink-500';

  const [selected, setSelected] = useState<string>(showcaseData[0]?.value ?? '');

  const pills = showcaseData.map(s => ({ label: s.label, value: s.value }));
  const displayItems = selected
    ? [
        ...showcaseData.filter(s => s.value === selected),
        ...showcaseData.filter(s => s.value !== selected),
      ]
    : showcaseData;

  return (
    <section className="py-8 md:py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left promo card */}
          <div className="lg:w-[300px] flex-shrink-0">
            <div className={`relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br ${promoGradient} flex flex-col justify-end p-8`}>
              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                {promoTitle}
              </h2>
              <Button variant="secondary" className="w-fit bg-deep-purple text-white hover:bg-deep-purple/90" asChild>
                <Link href={promoButtonLink}>{promoButtonText}</Link>
              </Button>
            </div>
          </div>

          {/* Right: pills + carousel */}
          <div className="flex-1 min-w-0">
            <FilterPills
              options={pills}
              selected={selected}
              onSelect={setSelected}
              className="mb-6"
            />
            <HorizontalCarousel>
              {displayItems.map((sub) => (
                <div key={sub.value} className="min-w-[44vw] max-w-[48vw] md:min-w-[280px] md:max-w-[300px] snap-start flex-shrink-0">
                  <Link href={`/servicios?categoria=${sub.parentCategory}&subcategoria=${sub.value}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                      <div className={`h-28 md:h-52 bg-gradient-to-br ${sub.color} flex items-center justify-center`}>
                        <span className="text-white/30 text-4xl md:text-6xl font-bold">{sub.label[0]}</span>
                      </div>
                      <CardContent className="p-2 md:p-4 space-y-1 md:space-y-2">
                        <h3 className="font-bold text-sm md:text-lg">{sub.label}</h3>
                        <p className="hidden md:block text-sm text-muted-foreground line-clamp-4">{sub.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </HorizontalCarousel>
          </div>
        </div>
      </div>
    </section>
  );
}

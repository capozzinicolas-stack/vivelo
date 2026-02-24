import { UtensilsCrossed, Music, Flower2, Camera, Users, Armchair } from 'lucide-react';
import { ServiceCategory, ServiceSubcategory } from '@/types/database';
import { LucideIcon } from 'lucide-react';

export interface SubcategoryInfo {
  value: ServiceSubcategory;
  label: string;
}

export interface CategoryInfo {
  value: ServiceCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  subcategories: SubcategoryInfo[];
}

export const categories: CategoryInfo[] = [
  {
    value: 'FOOD_DRINKS',
    label: 'Alimentos y Bebidas',
    description: 'Catering, barras de bebidas, food trucks y mas',
    icon: UtensilsCrossed,
    color: 'bg-orange-100 text-orange-600',
    subcategories: [
      { value: 'TAQUIZA', label: 'Taquiza' },
      { value: 'CATERING_POR_TIEMPOS', label: 'Catering por tiempos' },
      { value: 'ESTACIONES_FOODTRUCKS', label: 'Estaciones o FoodTrucks' },
      { value: 'REPOSTERIA', label: 'Reposteria' },
      { value: 'MESAS_DE_DULCES', label: 'Mesas de dulces' },
      { value: 'COFFEE_BREAK', label: 'Coffee Break' },
      { value: 'BARRA_COCTELERIA', label: 'Barra de bebidas o Cocteleria' },
    ],
  },
  {
    value: 'AUDIO',
    label: 'Audio y Entretenimiento',
    description: 'DJs, sistemas de sonido, bandas y entretenimiento',
    icon: Music,
    color: 'bg-blue-100 text-blue-600',
    subcategories: [
      { value: 'MARIACHI', label: 'Mariachi' },
      { value: 'GRUPO_EN_VIVO', label: 'Grupo en vivo' },
      { value: 'DJ', label: 'DJ' },
      { value: 'BANDA', label: 'Banda' },
      { value: 'DUETO_TRIO', label: 'Dueto o Trio' },
      { value: 'SAXOFON_VIOLIN', label: 'Saxofon o Violin' },
      { value: 'KARAOKE', label: 'Karaoke' },
      { value: 'ANIMADOR_MC', label: 'Animador o MC' },
      { value: 'IMITADOR', label: 'Imitador' },
      { value: 'COMEDIANTE', label: 'Comediante' },
    ],
  },
  {
    value: 'DECORATION',
    label: 'Decoracion y Ambientacion',
    description: 'Decoracion floral, iluminacion y ambientacion',
    icon: Flower2,
    color: 'bg-pink-100 text-pink-600',
    subcategories: [
      { value: 'FLORAL', label: 'Floral' },
      { value: 'GLOBOS_BACKDROPS', label: 'Globos y Backdrops' },
      { value: 'CENTROS_DE_MESA', label: 'Centros de mesa' },
      { value: 'ESCENOGRAFIA_TEMATIZACION', label: 'Escenografia y Tematizacion' },
      { value: 'ILUMINACION_AMBIENTAL', label: 'Iluminacion ambiental' },
    ],
  },
  {
    value: 'PHOTO_VIDEO',
    label: 'Foto y Video',
    description: 'Fotografia, videografia, photobooths y drones',
    icon: Camera,
    color: 'bg-purple-100 text-purple-600',
    subcategories: [
      { value: 'FOTOGRAFIA', label: 'Fotografia' },
      { value: 'VIDEO', label: 'Video' },
      { value: 'DRON', label: 'Dron' },
      { value: 'CABINA_360', label: 'Cabina 360' },
      { value: 'PHOTOBOOTH_IMPRESIONES', label: 'Photobooth e Impresiones' },
      { value: 'SESION_PRIVADA', label: 'Sesion privada' },
    ],
  },
  {
    value: 'STAFF',
    label: 'Staff y Operacion',
    description: 'Meseros, coordinadores, bartenders y mas',
    icon: Users,
    color: 'bg-green-100 text-green-600',
    subcategories: [
      { value: 'MESEROS', label: 'Meseros' },
      { value: 'BARTENDER', label: 'Bartender' },
      { value: 'CHEF_EN_SITIO', label: 'Chef en sitio' },
      { value: 'PARRILLERO', label: 'Parrillero' },
      { value: 'COORDINADOR_PLANNER', label: 'Coordinador o Planner' },
      { value: 'HOSTESS', label: 'Hostess' },
      { value: 'LIMPIEZA', label: 'Limpieza' },
      { value: 'SEGURIDAD', label: 'Seguridad' },
      { value: 'VALET_PARKING', label: 'Valet parking' },
      { value: 'NINERA', label: 'Ninera' },
    ],
  },
  {
    value: 'FURNITURE',
    label: 'Mobiliario y Equipo',
    description: 'Mesas, sillas, tarimas y carpas',
    icon: Armchair,
    color: 'bg-amber-100 text-amber-600',
    subcategories: [
      { value: 'SILLAS_MESAS', label: 'Sillas y Mesas' },
      { value: 'LOUNGE', label: 'Lounge' },
      { value: 'MANTELERIA', label: 'Manteleria' },
      { value: 'CARPAS', label: 'Carpas' },
      { value: 'TARIMAS_ESCENARIOS', label: 'Tarimas y Escenarios' },
      { value: 'PISTA_DE_BAILE', label: 'Pista de baile' },
      { value: 'ILUMINACION_EQUIPO', label: 'Iluminacion (equipo)' },
      { value: 'PROYECTOR_PANTALLAS_LED', label: 'Proyector y Pantallas LED' },
      { value: 'PLANTA_DE_LUZ', label: 'Planta de luz' },
      { value: 'CLIMA', label: 'Clima' },
    ],
  },
];

export const categoryMap = Object.fromEntries(
  categories.map((c) => [c.value, c])
) as Record<ServiceCategory, CategoryInfo>;

export const subcategoriesByCategory = Object.fromEntries(
  categories.map((c) => [c.value, c.subcategories])
) as Record<ServiceCategory, SubcategoryInfo[]>;

export const subcategoryMap = Object.fromEntries(
  categories.flatMap((c) =>
    c.subcategories.map((s) => [s.value, { ...s, parentCategory: c.value }])
  )
) as Record<ServiceSubcategory, SubcategoryInfo & { parentCategory: ServiceCategory }>;

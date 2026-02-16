import { UtensilsCrossed, Music, Flower2, Camera, Users, Armchair } from 'lucide-react';
import { ServiceCategory } from '@/types/database';
import { LucideIcon } from 'lucide-react';

export interface CategoryInfo {
  value: ServiceCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const categories: CategoryInfo[] = [
  {
    value: 'FOOD_DRINKS',
    label: 'Comida y Bebidas',
    description: 'Catering, barras de bebidas, food trucks y más',
    icon: UtensilsCrossed,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    value: 'AUDIO',
    label: 'Audio y Sonido',
    description: 'DJs, sistemas de sonido, bandas y entretenimiento',
    icon: Music,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    value: 'DECORATION',
    label: 'Decoración',
    description: 'Decoración floral, iluminación y ambientación',
    icon: Flower2,
    color: 'bg-pink-100 text-pink-600',
  },
  {
    value: 'PHOTO_VIDEO',
    label: 'Foto y Video',
    description: 'Fotografía, videografía, photobooths y drones',
    icon: Camera,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    value: 'STAFF',
    label: 'Personal',
    description: 'Meseros, coordinadores, bartenders y más',
    icon: Users,
    color: 'bg-green-100 text-green-600',
  },
  {
    value: 'FURNITURE',
    label: 'Mobiliario',
    description: 'Mesas, sillas, tarimas y carpas',
    icon: Armchair,
    color: 'bg-amber-100 text-amber-600',
  },
];

export const categoryMap = Object.fromEntries(
  categories.map((c) => [c.value, c])
) as Record<ServiceCategory, CategoryInfo>;

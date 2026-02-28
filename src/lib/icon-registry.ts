import {
  UtensilsCrossed,
  Music,
  Flower2,
  Camera,
  Users,
  Armchair,
  Tag,
  Mic2,
  Palette,
  PartyPopper,
  Sparkles,
  Lightbulb,
  Truck,
  Gift,
  Heart,
  Star,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Music,
  Flower2,
  Camera,
  Users,
  Armchair,
  Tag,
  Mic2,
  Palette,
  PartyPopper,
  Sparkles,
  Lightbulb,
  Truck,
  Gift,
  Heart,
  Star,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || Tag;
}

export const availableIcons = Object.keys(iconMap);

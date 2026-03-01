export const COMMISSION_RATE = 0.12;

export const ZONES = [
  'Ciudad de México',
  'Estado de México',
  'Puebla',
  'Toluca',
  'Cuernavaca',
  'Querétaro',
  'Pachuca',
] as const;

export const PRICE_UNITS = [
  { value: 'por evento', label: 'Precio fijo (por evento)' },
  { value: 'por persona', label: 'Por persona' },
  { value: 'por hora', label: 'Por hora' },
] as const;

export const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6; // 6:00 AM to 22:00
  const min = i % 2 === 0 ? '00' : '30';
  const h24 = `${hour.toString().padStart(2, '0')}:${min}`;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const label = `${h12}:${min} ${ampm}`;
  return { value: h24, label };
}) as readonly { value: string; label: string }[];

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En Progreso',
  in_review: 'En Revisión',
  completed: 'Completada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-purple-100 text-purple-800',
  in_review: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};

export const EXTRA_PRICE_TYPES = [
  { value: 'fixed', label: 'Precio fijo' },
  { value: 'per_person', label: 'Por persona' },
  { value: 'per_hour', label: 'Por hora' },
] as const;


export const FEATURED_SECTION_LABELS: Record<string, string> = {
  servicios_destacados: 'Servicios Destacados',
  servicios_recomendados: 'Servicios Recomendados',
  mas_vendidos: 'Mas Vendidos',
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  ended: 'Finalizada',
  cancelled: 'Cancelada',
};

export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  ended: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const BLOG_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

export const BLOG_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  featured_placement: 'Destaque',
  campaign_enrollment: 'Inscripcion a Campana',
  campaign_available: 'Campana Disponible',
  system: 'Sistema',
};

export const GRADIENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'from-pink-300 via-pink-400 to-pink-500', label: 'Rosa' },
  { value: 'from-purple-500 to-pink-500', label: 'Purpura-Rosa' },
  { value: 'from-amber-500 to-orange-500', label: 'Ambar-Naranja' },
  { value: 'from-green-500 to-teal-500', label: 'Verde-Teal' },
  { value: 'from-pink-400 to-rose-500', label: 'Rosa-Rose' },
  { value: 'from-gray-600 to-gray-800', label: 'Gris Oscuro' },
  { value: 'from-blue-500 to-indigo-600', label: 'Azul-Indigo' },
  { value: 'from-red-500 to-orange-500', label: 'Rojo-Naranja' },
  { value: 'from-teal-400 to-cyan-500', label: 'Teal-Cyan' },
  { value: 'from-indigo-500 to-purple-600', label: 'Indigo-Purpura' },
];

export const BANNER_KEY_LABELS: Record<string, string> = {
  showcase_promo: 'Tarjeta Promo Showcase',
  cashback_banner: 'Banner Cashback',
  hero_promo_banner: 'Banner Promo Hero (Homepage)',
  services_top_banner: 'Banner Superior Servicios',
  service_detail_banner: 'Banner Detalle de Servicio',
  blog_inline_banner: 'Banner Inline Blog',
  cart_upsell_banner: 'Banner Upsell Carrito',
  post_purchase_banner: 'Banner Post-Compra',
};

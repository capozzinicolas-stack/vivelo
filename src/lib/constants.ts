import type { AdminLevel } from '@/types/database';

export const COMMISSION_RATE = 0.12;
export const PROVIDER_ACCEPTANCE_HOURS = 48;
export const MIN_BOOKING_ADVANCE_HOURS = 24;

export const VIVELO_ZONES = [
  { slug: 'ciudad-de-mexico', label: 'Ciudad de México' },
  { slug: 'estado-de-mexico', label: 'Estado de México' },
  { slug: 'toluca', label: 'Toluca' },
  { slug: 'puebla', label: 'Puebla' },
  { slug: 'hidalgo', label: 'Hidalgo' },
  { slug: 'queretaro', label: 'Querétaro' },
  { slug: 'guanajuato', label: 'Guanajuato' },
  { slug: 'tlaxcala', label: 'Tlaxcala' },
  { slug: 'morelos', label: 'Morelos' },
] as const;

/** @deprecated Use VIVELO_ZONES instead */
export const ZONES = VIVELO_ZONES.map(z => z.label);

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

export const PROVIDER_PROMO_LIMITS = {
  MAX_ACTIVE_PROMOS_PER_PROVIDER: 5,
  MAX_DISCOUNT_PCT: 50,
  MIN_DISCOUNT_PCT: 5,
  MIN_DAYS_DURATION: 1,
  MAX_DAYS_DURATION: 90,
  COUPON_CODE_MIN_LENGTH: 4,
  COUPON_CODE_MAX_LENGTH: 16,
  COUPON_CODE_REGEX: /^[A-Z0-9]+$/,
} as const;

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

// ============================================================================
// Service Admin Comments — categorias para comentarios admin→proveedor
// ============================================================================
export const SERVICE_COMMENT_CATEGORIES = [
  {
    value: 'sugerencia',
    label: 'Sugerencia',
    description: 'Recomendacion para mejorar el servicio',
    icon: 'Lightbulb',
    color: 'bg-deep-purple/10 text-deep-purple border-deep-purple/30',
    severity: 2,
  },
  {
    value: 'reconocimiento',
    label: 'Reconocimiento',
    description: 'Felicitaciones o elogio por el buen trabajo',
    icon: 'Award',
    color: 'bg-green-50 text-green-700 border-green-200',
    severity: 0,
  },
  {
    value: 'aviso',
    label: 'Aviso importante',
    description: 'Informacion critica que el proveedor debe saber',
    icon: 'AlertTriangle',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    severity: 4,
  },
  {
    value: 'oportunidad',
    label: 'Oportunidad',
    description: 'Invitacion a campana, destacado, o promo',
    icon: 'Sparkles',
    color: 'bg-gold/10 text-amber-700 border-gold/40',
    severity: 1,
  },
  {
    value: 'recordatorio',
    label: 'Recordatorio',
    description: 'Tarea pendiente o deadline',
    icon: 'Bell',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    severity: 3,
  },
] as const;

export const SERVICE_COMMENT_CATEGORY_MAP = Object.fromEntries(
  SERVICE_COMMENT_CATEGORIES.map(c => [c.value, c])
) as Record<typeof SERVICE_COMMENT_CATEGORIES[number]['value'], typeof SERVICE_COMMENT_CATEGORIES[number]>;

export const SERVICE_COMMENT_LIMITS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 2000,
} as const;

// ============================================================================
// Provider Referrals V2 — tier rules from T&C 2.4
// ============================================================================
export const REFERRAL_TIERS = {
  // Nivel 1: 1 a 3 referidos => 3 ventas con 50% off de comision
  LEVEL_1_MIN_REFERRALS: 1,
  LEVEL_1_SALES: 3,
  LEVEL_1_COMMISSION_OFF_PCT: 50,

  // Nivel 2: 4+ referidos => 3 ventas adicionales con 75% off
  LEVEL_2_MIN_REFERRALS: 4,
  LEVEL_2_SALES: 3,
  LEVEL_2_COMMISSION_OFF_PCT: 75,

  // Nivel 3: cada multiplo de 8 referidos => 3 ventas con 75% off + 3 meses de prioridad
  LEVEL_3_EVERY_N_REFERRALS: 8,
  LEVEL_3_SALES: 3,
  LEVEL_3_COMMISSION_OFF_PCT: 75,
  LEVEL_3_PRIORITY_MONTHS: 3,
} as const;

export const REFERRAL_BENEFIT_LABELS: Record<string, string> = {
  commission_50_off: 'Comision 50% off',
  commission_75_off: 'Comision 75% off',
  priority_placement_3m: '3 meses de prioridad',
};

export const REFERRAL_BENEFIT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  consumed: 'Consumido',
  expired: 'Expirado',
};

export const REFERRAL_BENEFIT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  consumed: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-800',
};

export const REFERRAL_REWARD_STATUS_LABELS: Record<string, string> = {
  pending_signup: 'Registrado',
  active_sale: 'Activado',
  expired: 'Expirado',
  revoked: 'Revocado',
};

export const REFERRAL_REWARD_STATUS_COLORS: Record<string, string> = {
  pending_signup: 'bg-yellow-100 text-yellow-800',
  active_sale: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  revoked: 'bg-red-100 text-red-800',
};

// ============================================================================
// Admin Access Levels
// ============================================================================

/** Which sidebar sections each admin level can see */
export const ADMIN_LEVEL_CONFIG: Record<AdminLevel, {
  label: string;
  description: string;
  allowedSections: string[];
}> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Acceso completo a todas las secciones',
    allowedSections: ['*'],
  },
  operations: {
    label: 'Operaciones',
    description: 'Servicios, reservas, reviews, fiscal, finanzas (lectura), proveedores, usuarios',
    allowedSections: [
      '/dashboard',
      '/dashboard/usuarios',
      '/dashboard/proveedores',
      '/dashboard/servicios',
      '/dashboard/reservas',
      '/dashboard/reviews',
      '/dashboard/fiscal',
      '/dashboard/finanzas',
      '/dashboard/perfil',
    ],
  },
  marketing: {
    label: 'Marketing',
    description: 'Campanas, banners, contenido, notificaciones, conversaciones',
    allowedSections: [
      '/dashboard',
      '/dashboard/marketing',
      '/dashboard/banners',
      '/dashboard/contenido',
      '/dashboard/notificaciones',
      '/dashboard/whatsapp',
      '/dashboard/perfil',
    ],
  },
  support: {
    label: 'Soporte',
    description: 'Solo lectura + mensajes WhatsApp manuales',
    allowedSections: [
      '/dashboard',
      '/dashboard/usuarios',
      '/dashboard/proveedores',
      '/dashboard/servicios',
      '/dashboard/reservas',
      '/dashboard/reviews',
      '/dashboard/whatsapp',
      '/dashboard/perfil',
    ],
  },
};

export const ADMIN_LEVEL_LABELS: Record<AdminLevel, string> = {
  super_admin: 'Super Admin',
  operations: 'Operaciones',
  marketing: 'Marketing',
  support: 'Soporte',
};

// ============================================================================
// Conversaciones — Canales y Touchpoints
// ============================================================================

export type ConversationChannel = 'whatsapp' | 'sms' | 'instagram' | 'messenger';

export const CHANNEL_CONFIG: Record<ConversationChannel, { label: string; icon: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: 'text-green-600' },
  sms: { label: 'SMS', icon: 'Smartphone', color: 'text-blue-600' },
  instagram: { label: 'Instagram', icon: 'Instagram', color: 'text-pink-600' },
  messenger: { label: 'Messenger', icon: 'Facebook', color: 'text-blue-500' },
};

export interface WhatsAppPhase {
  id: string;
  label: string;
  touchpoints: string[]; // eventType references
}

export interface WhatsAppJourney {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  phases: WhatsAppPhase[];
}

export const WHATSAPP_JOURNEYS: WhatsAppJourney[] = [
  {
    id: 'reserva',
    label: 'Reserva',
    icon: 'CalendarCheck',
    phases: [
      { id: 'pago', label: 'Pago autorizado', touchpoints: ['client_payment_authorized', 'provider_new_booking'] },
      { id: 'aceptacion', label: 'Aceptacion del proveedor', touchpoints: ['provider_booking_accepted', 'client_booking_confirmed'] },
      { id: 'recordatorios', label: 'Recordatorios', touchpoints: ['client_event_reminder', 'provider_event_reminder'] },
      { id: 'codigos', label: 'Codigos de verificacion', touchpoints: ['client_verification_codes', 'provider_start_code'] },
      { id: 'ejecucion', label: 'Ejecucion del evento', touchpoints: ['client_event_started'] },
      { id: 'cierre', label: 'Cierre', touchpoints: ['client_booking_completed', 'provider_booking_completed', 'provider_new_review'] },
      { id: 'cancelacion', label: 'Cancelacion / Rechazo', touchpoints: ['client_booking_cancelled', 'provider_booking_cancelled', 'client_booking_rejected', 'provider_booking_rejected'] },
    ],
  },
  {
    id: 'onboarding_proveedor',
    label: 'Onboarding Proveedor',
    icon: 'UserPlus',
    phases: [
      { id: 'registro', label: 'Registro', touchpoints: ['provider_welcome'] },
      { id: 'servicio', label: 'Publicacion de servicio', touchpoints: ['provider_no_service_reminder', 'provider_service_approved', 'provider_service_rejected', 'provider_service_needs_revision'] },
      { id: 'fiscal', label: 'Datos fiscales', touchpoints: ['provider_fiscal_approved', 'provider_fiscal_rejected'] },
      { id: 'banco', label: 'Datos bancarios', touchpoints: ['provider_banking_approved', 'provider_banking_rejected'] },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: 'Settings',
    phases: [
      { id: 'cliente_registro', label: 'Registro de cliente', touchpoints: ['client_welcome'] },
      { id: 'comentarios', label: 'Comentarios admin', touchpoints: ['provider_admin_comment'] },
      { id: 'manual', label: 'Mensajes manuales', touchpoints: ['admin_manual'] },
    ],
  },
];

export const TOUCHPOINT_CONFIG: Array<{
  eventType: string;
  label: string;
  description: string;
  recipient: 'provider' | 'client' | 'admin';
  trigger: string;
  channel: ConversationChannel;
  journey: string;
  phase: string;
}> = [
  // Provider (18)
  { eventType: 'provider_welcome', label: 'Bienvenida proveedor', description: 'Al registrarse como proveedor', recipient: 'provider', trigger: 'Registro', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Registro' },
  { eventType: 'provider_service_approved', label: 'Servicio aprobado', description: 'Admin aprueba un servicio', recipient: 'provider', trigger: 'Admin aprueba servicio', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Publicacion de servicio' },
  { eventType: 'provider_service_rejected', label: 'Servicio rechazado', description: 'Admin rechaza un servicio', recipient: 'provider', trigger: 'Admin rechaza servicio', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Publicacion de servicio' },
  { eventType: 'provider_service_needs_revision', label: 'Servicio requiere revision', description: 'Admin solicita ajustes', recipient: 'provider', trigger: 'Admin solicita revision', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Publicacion de servicio' },
  { eventType: 'provider_new_booking', label: 'Nueva reserva', description: 'Cliente confirma reserva', recipient: 'provider', trigger: 'Pago confirmado (Stripe)', channel: 'whatsapp', journey: 'reserva', phase: 'Pago autorizado' },
  { eventType: 'provider_booking_accepted', label: 'Reserva aceptada', description: 'Proveedor acepta la reserva', recipient: 'provider', trigger: 'Proveedor acepta booking', channel: 'whatsapp', journey: 'reserva', phase: 'Aceptacion del proveedor' },
  { eventType: 'provider_booking_cancelled', label: 'Reserva cancelada', description: 'Se cancela una reserva', recipient: 'provider', trigger: 'Cancelacion', channel: 'whatsapp', journey: 'reserva', phase: 'Cancelacion / Rechazo' },
  { eventType: 'provider_event_reminder', label: 'Recordatorio evento', description: '24h antes del evento', recipient: 'provider', trigger: 'Cron diario', channel: 'whatsapp', journey: 'reserva', phase: 'Recordatorios' },
  { eventType: 'provider_start_code', label: 'Codigo de inicio', description: 'Codigo para iniciar evento', recipient: 'provider', trigger: 'Cron diario', channel: 'whatsapp', journey: 'reserva', phase: 'Codigos de verificacion' },
  { eventType: 'provider_booking_completed', label: 'Reserva completada', description: 'Evento finalizado', recipient: 'provider', trigger: 'Verificacion / auto-complete', channel: 'whatsapp', journey: 'reserva', phase: 'Cierre' },
  { eventType: 'provider_new_review', label: 'Nueva resena', description: 'Cliente deja resena', recipient: 'provider', trigger: 'Review creada', channel: 'whatsapp', journey: 'reserva', phase: 'Cierre' },
  { eventType: 'provider_fiscal_approved', label: 'Fiscal aprobado', description: 'Datos fiscales aprobados', recipient: 'provider', trigger: 'Admin aprueba fiscal', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Datos fiscales' },
  { eventType: 'provider_fiscal_rejected', label: 'Fiscal rechazado', description: 'Datos fiscales rechazados', recipient: 'provider', trigger: 'Admin rechaza fiscal', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Datos fiscales' },
  { eventType: 'provider_banking_approved', label: 'Banco aprobado', description: 'Datos bancarios aprobados', recipient: 'provider', trigger: 'Admin aprueba banco', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Datos bancarios' },
  { eventType: 'provider_banking_rejected', label: 'Banco rechazado', description: 'Datos bancarios rechazados', recipient: 'provider', trigger: 'Admin rechaza banco', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Datos bancarios' },
  { eventType: 'provider_admin_comment', label: 'Comentario admin', description: 'Admin comenta en servicio', recipient: 'provider', trigger: 'Admin crea comentario', channel: 'whatsapp', journey: 'operaciones', phase: 'Comentarios admin' },
  { eventType: 'provider_booking_rejected', label: 'Reserva rechazada', description: 'Admin rechaza reserva', recipient: 'provider', trigger: 'Admin rechaza booking', channel: 'whatsapp', journey: 'reserva', phase: 'Cancelacion / Rechazo' },
  { eventType: 'provider_no_service_reminder', label: 'Recordatorio sin servicio', description: '3 dias sin dar de alta servicio', recipient: 'provider', trigger: 'Cron diario', channel: 'whatsapp', journey: 'onboarding_proveedor', phase: 'Publicacion de servicio' },
  // Client (10)
  { eventType: 'client_welcome', label: 'Bienvenida cliente', description: 'Al registrarse como cliente', recipient: 'client', trigger: 'Registro', channel: 'whatsapp', journey: 'operaciones', phase: 'Registro de cliente' },
  { eventType: 'client_payment_authorized', label: 'Pago autorizado', description: 'Tarjeta autorizada exitosamente', recipient: 'client', trigger: 'Webhook Stripe (auth)', channel: 'whatsapp', journey: 'reserva', phase: 'Pago autorizado' },
  { eventType: 'client_booking_confirmed', label: 'Reserva confirmada', description: 'Pago exitoso', recipient: 'client', trigger: 'Pago confirmado (Stripe)', channel: 'whatsapp', journey: 'reserva', phase: 'Aceptacion del proveedor' },
  { eventType: 'client_booking_cancelled', label: 'Reserva cancelada', description: 'Se cancela una reserva', recipient: 'client', trigger: 'Cancelacion', channel: 'whatsapp', journey: 'reserva', phase: 'Cancelacion / Rechazo' },
  { eventType: 'client_event_reminder', label: 'Recordatorio evento', description: '24h antes del evento', recipient: 'client', trigger: 'Cron diario', channel: 'whatsapp', journey: 'reserva', phase: 'Recordatorios' },
  { eventType: 'client_verification_codes', label: 'Codigos verificacion', description: 'Codigos inicio/fin evento', recipient: 'client', trigger: 'Cron diario', channel: 'whatsapp', journey: 'reserva', phase: 'Codigos de verificacion' },
  { eventType: 'client_booking_completed', label: 'Reserva completada', description: 'Evento finalizado', recipient: 'client', trigger: 'Verificacion / auto-complete', channel: 'whatsapp', journey: 'reserva', phase: 'Cierre' },
  { eventType: 'client_event_started', label: 'Evento iniciado', description: 'Proveedor verifico start_code', recipient: 'client', trigger: 'Verificacion start_code', channel: 'whatsapp', journey: 'reserva', phase: 'Ejecucion del evento' },
  { eventType: 'client_booking_rejected', label: 'Reserva rechazada', description: 'Admin rechaza reserva', recipient: 'client', trigger: 'Admin rechaza booking', channel: 'whatsapp', journey: 'reserva', phase: 'Cancelacion / Rechazo' },
  // Admin (1)
  { eventType: 'admin_manual', label: 'Mensaje manual', description: 'Mensaje enviado por admin', recipient: 'admin', trigger: 'Manual', channel: 'whatsapp', journey: 'operaciones', phase: 'Mensajes manuales' },
];

/** Lookup rapido: eventType → phase label */
export function getPhaseLabel(eventType: string): string | null {
  const tp = TOUCHPOINT_CONFIG.find(t => t.eventType === eventType);
  return tp?.phase ?? null;
}

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

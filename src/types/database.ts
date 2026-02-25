export type UserRole = 'client' | 'provider' | 'admin';
export type FeaturedSection = 'servicios_destacados' | 'servicios_recomendados' | 'mas_vendidos';
export type CampaignStatus = 'draft' | 'active' | 'ended' | 'cancelled';
export type NotificationType = 'featured_placement' | 'campaign_enrollment' | 'campaign_available' | 'system';
export type BlogMediaType = 'text' | 'video' | 'audio';
export type BlogStatus = 'draft' | 'published' | 'archived';
export type ServiceCategory = 'FOOD_DRINKS' | 'AUDIO' | 'DECORATION' | 'PHOTO_VIDEO' | 'STAFF' | 'FURNITURE';

export type ServiceSubcategory =
  // Alimentos y Bebidas
  | 'TAQUIZA' | 'CATERING_POR_TIEMPOS' | 'ESTACIONES_FOODTRUCKS' | 'REPOSTERIA' | 'MESAS_DE_DULCES' | 'COFFEE_BREAK' | 'BARRA_COCTELERIA'
  // Audio y Entretenimiento
  | 'MARIACHI' | 'GRUPO_EN_VIVO' | 'DJ' | 'BANDA' | 'DUETO_TRIO' | 'SAXOFON_VIOLIN' | 'KARAOKE' | 'ANIMADOR_MC' | 'IMITADOR' | 'COMEDIANTE'
  // Decoracion y Ambientacion
  | 'FLORAL' | 'GLOBOS_BACKDROPS' | 'CENTROS_DE_MESA' | 'ESCENOGRAFIA_TEMATIZACION' | 'ILUMINACION_AMBIENTAL'
  // Foto y Video
  | 'FOTOGRAFIA' | 'VIDEO' | 'DRON' | 'CABINA_360' | 'PHOTOBOOTH_IMPRESIONES' | 'SESION_PRIVADA'
  // Staff y Operacion
  | 'MESEROS' | 'BARTENDER' | 'CHEF_EN_SITIO' | 'PARRILLERO' | 'COORDINADOR_PLANNER' | 'HOSTESS' | 'LIMPIEZA' | 'SEGURIDAD' | 'VALET_PARKING' | 'NINERA'
  // Mobiliario y Equipo
  | 'SILLAS_MESAS' | 'LOUNGE' | 'MANTELERIA' | 'CARPAS' | 'TARIMAS_ESCENARIOS' | 'PISTA_DE_BAILE' | 'ILUMINACION_EQUIPO' | 'PROYECTOR_PANTALLAS_LED' | 'PLANTA_DE_LUZ' | 'CLIMA';
export type ServiceStatus = 'draft' | 'active' | 'paused' | 'archived';
export type BookingStatus = 'pending' | 'confirmed' | 'in_review' | 'completed' | 'cancelled' | 'rejected';
export type BankingStatus = 'not_submitted' | 'pending_review' | 'verified' | 'rejected';
export type OrderStatus = 'pending' | 'paid' | 'partially_fulfilled' | 'fulfilled' | 'cancelled' | 'refunded';
export type GoogleSyncStatus = 'active' | 'error' | 'disconnected';
export type CalendarBlockSource = 'manual' | 'google_sync';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  company_name: string | null;
  bio: string | null;
  verified: boolean;
  max_concurrent_services: number;
  apply_buffers_to_all: boolean;
  global_buffer_before_minutes: number;
  global_buffer_after_minutes: number;
  rfc: string | null;
  clabe: string | null;
  bank_document_url: string | null;
  banking_status: BankingStatus;
  banking_rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  subcategory: ServiceSubcategory | null;
  status: ServiceStatus;
  sku: string | null;
  base_price: number;
  price_unit: string;
  base_event_hours: number | null;
  min_guests: number;
  max_guests: number;
  zones: string[];
  images: string[];
  videos: string[];
  min_hours: number;
  max_hours: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  buffer_before_days: number;
  buffer_after_days: number;
  deletion_requested: boolean;
  deletion_requested_at: string | null;
  avg_rating: number;
  review_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  category_details?: Record<string, unknown>;
  // Joined data
  provider?: Profile;
  extras?: Extra[];
}

export interface Extra {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: number;
  price_type: 'fixed' | 'per_person' | 'per_hour';
  max_quantity: number;
  sku: string | null;
  depends_on_guests: boolean;
  depends_on_hours: boolean;
  created_at: string;
}

export interface SubBooking {
  id: string;
  booking_id: string;
  extra_id: string | null;
  sku: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  price_type: string;
  subtotal: number;
  created_at: string;
}

export interface Booking {
  id: string;
  service_id: string;
  client_id: string;
  provider_id: string;
  event_date: string;
  guest_count: number;
  base_total: number;
  extras_total: number;
  commission: number;
  total: number;
  selected_extras: SelectedExtra[];
  start_time: string;
  end_time: string;
  event_hours: number;
  start_datetime: string | null;
  end_datetime: string | null;
  effective_start: string | null;
  effective_end: string | null;
  billing_type_snapshot: string | null;
  notes: string | null;
  event_name: string | null;
  status: BookingStatus;
  order_id: string | null;
  stripe_payment_intent_id: string | null;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: Service;
  client?: Profile;
  provider?: Profile;
  sub_bookings?: SubBooking[];
}

export interface Order {
  id: string;
  client_id: string;
  stripe_payment_intent_id: string | null;
  subtotal: number;
  platform_fee: number;
  stripe_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  bookings?: Booking[];
  client?: Profile;
}

export interface SelectedExtra {
  extra_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface BlockedDate {
  id: string;
  service_id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

export interface VendorCalendarBlock {
  id: string;
  vendor_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  google_event_id: string | null;
  source: CalendarBlockSource;
  created_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  provider_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expiry: string;
  vivelo_calendar_id: string | null;
  google_email: string;
  last_sync_at: string | null;
  sync_status: GoogleSyncStatus;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  overlapping_bookings: number;
  max_concurrent: number;
  has_calendar_block: boolean;
}

export interface Review {
  id: string;
  service_id: string;
  client_id: string;
  booking_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined data
  client?: Profile;
}

export interface FeaturedPlacement {
  id: string;
  service_id: string;
  section: FeaturedSection;
  position: number;
  start_date: string;
  end_date: string;
  created_at: string;
  // Joined data
  service?: Service;
}

export interface Campaign {
  id: string;
  internal_name: string;
  external_name: string;
  description: string | null;
  discount_pct: number;
  commission_reduction_pct: number;
  vivelo_absorbs_pct: number;
  provider_absorbs_pct: number;
  start_date: string;
  end_date: string;
  exposure_channels: string[];
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  subscriptions?: CampaignSubscription[];
}

export interface CampaignSubscription {
  id: string;
  campaign_id: string;
  service_id: string;
  provider_id: string;
  status: string;
  created_at: string;
  // Joined data
  service?: Service;
  campaign?: Campaign;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  media_type: BlogMediaType;
  media_url: string | null;
  status: BlogStatus;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeaturedProvider {
  id: string;
  provider_id: string;
  position: number;
  start_date: string;
  end_date: string;
  created_at: string;
  // Joined data
  provider?: Profile;
}

export interface ShowcaseItem {
  id: string;
  label: string;
  description: string;
  subcategory: string;
  parent_category: string;
  gradient_color: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteBanner {
  id: string;
  banner_key: string;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  gradient: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>; Update: Partial<Profile> };
      services: { Row: Service; Insert: Partial<Service> & Pick<Service, 'provider_id' | 'title' | 'category'>; Update: Partial<Service> };
      extras: { Row: Extra; Insert: Partial<Extra> & Pick<Extra, 'service_id' | 'name' | 'price'>; Update: Partial<Extra> };
      bookings: { Row: Booking; Insert: Partial<Booking> & Pick<Booking, 'service_id' | 'client_id' | 'provider_id' | 'event_date' | 'guest_count'>; Update: Partial<Booking> };
      blocked_dates: { Row: BlockedDate; Insert: Partial<BlockedDate> & Pick<BlockedDate, 'service_id' | 'blocked_date'>; Update: Partial<BlockedDate> };
      vendor_calendar_blocks: { Row: VendorCalendarBlock; Insert: Partial<VendorCalendarBlock> & Pick<VendorCalendarBlock, 'vendor_id' | 'start_datetime' | 'end_datetime'>; Update: Partial<VendorCalendarBlock> };
      reviews: { Row: Review; Insert: Partial<Review> & Pick<Review, 'service_id' | 'client_id' | 'rating'>; Update: Partial<Review> };
      sub_bookings: { Row: SubBooking; Insert: Partial<SubBooking> & Pick<SubBooking, 'booking_id' | 'name'>; Update: Partial<SubBooking> };
      google_calendar_connections: { Row: GoogleCalendarConnection; Insert: Partial<GoogleCalendarConnection> & Pick<GoogleCalendarConnection, 'provider_id' | 'access_token_encrypted' | 'refresh_token_encrypted' | 'token_expiry' | 'google_email'>; Update: Partial<GoogleCalendarConnection> };
      featured_placements: { Row: FeaturedPlacement; Insert: Partial<FeaturedPlacement> & Pick<FeaturedPlacement, 'service_id'>; Update: Partial<FeaturedPlacement> };
      campaigns: { Row: Campaign; Insert: Partial<Campaign> & Pick<Campaign, 'internal_name' | 'external_name' | 'start_date' | 'end_date'>; Update: Partial<Campaign> };
      campaign_subscriptions: { Row: CampaignSubscription; Insert: Partial<CampaignSubscription> & Pick<CampaignSubscription, 'campaign_id' | 'service_id' | 'provider_id'>; Update: Partial<CampaignSubscription> };
      notifications: { Row: Notification; Insert: Partial<Notification> & Pick<Notification, 'recipient_id' | 'title' | 'message'>; Update: Partial<Notification> };
      blog_posts: { Row: BlogPost; Insert: Partial<BlogPost> & Pick<BlogPost, 'title' | 'slug'>; Update: Partial<BlogPost> };
      featured_providers: { Row: FeaturedProvider; Insert: Partial<FeaturedProvider> & Pick<FeaturedProvider, 'provider_id'>; Update: Partial<FeaturedProvider> };
      showcase_items: { Row: ShowcaseItem; Insert: Partial<ShowcaseItem> & Pick<ShowcaseItem, 'label' | 'subcategory' | 'parent_category'>; Update: Partial<ShowcaseItem> };
      site_banners: { Row: SiteBanner; Insert: Partial<SiteBanner> & Pick<SiteBanner, 'banner_key' | 'title'>; Update: Partial<SiteBanner> };
    };
  };
}

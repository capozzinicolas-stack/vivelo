export type UserRole = 'client' | 'provider' | 'admin';
export type FeaturedSection = 'servicios_destacados' | 'servicios_recomendados' | 'mas_vendidos';
export type CampaignStatus = 'draft' | 'active' | 'ended' | 'cancelled';
export type NotificationType = 'featured_placement' | 'campaign_enrollment' | 'campaign_available' | 'system';
export type BlogMediaType = 'text' | 'video' | 'audio';
export type BlogStatus = 'draft' | 'published' | 'archived';
export type ServiceCategory = string;
export type ServiceSubcategory = string;

export interface CatalogCategory {
  slug: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  sku_prefix: string;
  sort_order: number;
  is_active: boolean;
}

export interface CatalogSubcategory {
  slug: string;
  category_slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface CatalogZone {
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}
export type ServiceStatus = 'draft' | 'active' | 'paused' | 'archived';
export type BookingStatus = 'pending' | 'confirmed' | 'in_review' | 'completed' | 'cancelled' | 'rejected';
export type BankingStatus = 'not_submitted' | 'pending_review' | 'verified' | 'rejected';
export type OrderStatus = 'pending' | 'paid' | 'partially_fulfilled' | 'fulfilled' | 'cancelled' | 'refunded';
export type GoogleSyncStatus = 'active' | 'error' | 'disconnected';
export type CalendarBlockSource = 'manual' | 'google_sync';

export interface CancellationRule {
  min_hours: number;
  max_hours: number | null;
  refund_percent: number;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string | null;
  rules: CancellationRule[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

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
  default_cancellation_policy_id?: string | null;
  commission_rate: number;
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
  cancellation_policy_id?: string | null;
  category_details?: Record<string, unknown>;
  // Joined data
  provider?: Profile;
  extras?: Extra[];
  cancellation_policy?: CancellationPolicy;
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
  cancellation_policy_snapshot?: Record<string, unknown> | null;
  refund_amount?: number | null;
  refund_percent?: number | null;
  commission_rate_snapshot?: number | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  campaign_id?: string | null;
  discount_amount?: number;
  discount_pct?: number;
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
  discount_total?: number;
  original_total?: number;
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
  author_id?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  tags?: string[];
  og_image?: string | null;
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

export type MarketingEventType = 'impression' | 'click';
export type PlacementType = 'featured_placement' | 'campaign' | 'banner' | 'showcase' | 'featured_provider';

export interface MarketingEvent {
  id: string;
  event_type: MarketingEventType;
  placement_type: PlacementType;
  placement_id: string;
  service_id: string | null;
  user_id: string | null;
  page_url: string | null;
  created_at: string;
}

export interface UtmAttribution {
  id: string;
  user_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  created_at: string;
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
      cancellation_policies: { Row: CancellationPolicy; Insert: Partial<CancellationPolicy> & Pick<CancellationPolicy, 'name' | 'rules'>; Update: Partial<CancellationPolicy> };
    };
  };
}

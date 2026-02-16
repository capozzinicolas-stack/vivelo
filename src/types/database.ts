export type UserRole = 'client' | 'provider' | 'admin';
export type ServiceCategory = 'FOOD_DRINKS' | 'AUDIO' | 'DECORATION' | 'PHOTO_VIDEO' | 'STAFF' | 'FURNITURE';
export type ServiceStatus = 'draft' | 'active' | 'paused' | 'archived';
export type BookingStatus = 'pending' | 'confirmed' | 'in_review' | 'completed' | 'cancelled' | 'rejected';

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
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  status: ServiceStatus;
  base_price: number;
  price_unit: string;
  min_guests: number;
  max_guests: number;
  zones: string[];
  images: string[];
  avg_rating: number;
  review_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
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
  price_type: 'fixed' | 'per_person';
  max_quantity: number;
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
  notes: string | null;
  status: BookingStatus;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: Service;
  client?: Profile;
  provider?: Profile;
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

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>; Update: Partial<Profile> };
      services: { Row: Service; Insert: Partial<Service> & Pick<Service, 'provider_id' | 'title' | 'category'>; Update: Partial<Service> };
      extras: { Row: Extra; Insert: Partial<Extra> & Pick<Extra, 'service_id' | 'name' | 'price'>; Update: Partial<Extra> };
      bookings: { Row: Booking; Insert: Partial<Booking> & Pick<Booking, 'service_id' | 'client_id' | 'provider_id' | 'event_date' | 'guest_count'>; Update: Partial<Booking> };
      blocked_dates: { Row: BlockedDate; Insert: Partial<BlockedDate> & Pick<BlockedDate, 'service_id' | 'blocked_date'>; Update: Partial<BlockedDate> };
      reviews: { Row: Review; Insert: Partial<Review> & Pick<Review, 'service_id' | 'client_id' | 'rating'>; Update: Partial<Review> };
    };
  };
}

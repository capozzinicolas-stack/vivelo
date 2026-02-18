import { createClient } from './client';
import type { Service, Booking, Profile, ServiceCategory, ServiceStatus, BookingStatus } from '@/types/database';

const isMockMode = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true;

// ─── SERVICES ───────────────────────────────────────────────

export async function getServices(filters?: {
  category?: string;
  zone?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  status?: ServiceStatus;
}): Promise<Service[]> {
  if (isMockMode()) {
    const { mockServices } = await import('@/data/mock-services');
    let results = [...mockServices];
    if (filters?.category) results = results.filter(s => s.category === filters.category);
    if (filters?.zone) results = results.filter(s => s.zones.includes(filters.zone!));
    if (filters?.minPrice) results = results.filter(s => s.base_price >= filters.minPrice!);
    if (filters?.maxPrice) results = results.filter(s => s.base_price <= filters.maxPrice!);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    if (filters?.status) results = results.filter(s => s.status === filters.status);
    return results.filter(s => s.status === 'active' || filters?.status);
  }

  const supabase = createClient();
  let query = supabase.from('services').select('*, extras(*), provider:profiles!provider_id(*)');

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.status) query = query.eq('status', filters.status);
  else query = query.eq('status', 'active');
  if (filters?.zone) query = query.contains('zones', [filters.zone]);
  if (filters?.minPrice) query = query.gte('base_price', filters.minPrice);
  if (filters?.maxPrice) query = query.lte('base_price', filters.maxPrice);
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getServiceById(id: string): Promise<Service | null> {
  if (isMockMode()) {
    const { mockServices } = await import('@/data/mock-services');
    return mockServices.find(s => s.id === id) || null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*), provider:profiles!provider_id(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createService(
  service: {
    provider_id: string;
    title: string;
    description: string;
    category: ServiceCategory;
    base_price: number;
    price_unit: string;
    min_guests: number;
    max_guests: number;
    zones: string[];
  },
  extras: { name: string; price: number; price_type: 'fixed' | 'per_person'; max_quantity: number }[]
): Promise<Service> {
  if (isMockMode()) {
    const newService: Service = {
      id: crypto.randomUUID(),
      ...service,
      status: 'active',
      images: [],
      avg_rating: 0,
      review_count: 0,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      extras: extras.map(e => ({
        id: crypto.randomUUID(),
        service_id: '',
        ...e,
        description: null,
        created_at: new Date().toISOString(),
      })),
    };
    return newService;
  }

  const supabase = createClient();
  const { data: svc, error: svcError } = await supabase
    .from('services')
    .insert({ ...service, status: 'active' as ServiceStatus })
    .select()
    .single();
  if (svcError) throw svcError;

  if (extras.length > 0) {
    const { error: extError } = await supabase
      .from('extras')
      .insert(extras.map(e => ({ ...e, service_id: svc.id })));
    if (extError) throw extError;
  }

  return svc;
}

export async function updateServiceStatus(id: string, status: ServiceStatus): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('services').update({ status }).eq('id', id);
  if (error) throw error;
}

// ─── SERVICES BY PROVIDER ───────────────────────────────────

export async function getServicesByProvider(providerId: string): Promise<Service[]> {
  if (isMockMode()) {
    const { mockServices } = await import('@/data/mock-services');
    return mockServices.filter(s => s.provider_id === providerId);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── BOOKINGS ───────────────────────────────────────────────

export async function createBooking(booking: {
  service_id: string;
  client_id: string;
  provider_id: string;
  event_date: string;
  guest_count: number;
  base_total: number;
  extras_total: number;
  commission: number;
  total: number;
  selected_extras: { extra_id: string; name: string; quantity: number; price: number }[];
  notes: string | null;
}): Promise<Booking> {
  if (isMockMode()) {
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      ...booking,
      status: 'pending',
      stripe_payment_intent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return newBooking;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...booking, status: 'pending' as BookingStatus })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBookingsByClient(clientId: string): Promise<Booking[]> {
  if (isMockMode()) {
    const { mockBookings } = await import('@/data/mock-bookings');
    const { mockServices } = await import('@/data/mock-services');
    return mockBookings
      .filter(b => b.client_id === clientId)
      .map(b => ({ ...b, service: mockServices.find(s => s.id === b.service_id) }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service:services(*), provider:profiles!provider_id(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBookingsByProvider(providerId: string): Promise<Booking[]> {
  if (isMockMode()) {
    const { mockBookings } = await import('@/data/mock-bookings');
    const { mockServices } = await import('@/data/mock-services');
    const { mockUsers } = await import('@/data/mock-users');
    return mockBookings
      .filter(b => b.provider_id === providerId)
      .map(b => ({
        ...b,
        service: mockServices.find(s => s.id === b.service_id),
        client: mockUsers.find(u => u.id === b.client_id),
      }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:profiles!client_id(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (isMockMode()) {
    const { mockBookings } = await import('@/data/mock-bookings');
    const { mockServices } = await import('@/data/mock-services');
    const b = mockBookings.find(b => b.id === id);
    if (!b) return null;
    return { ...b, service: mockServices.find(s => s.id === b.service_id) };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:profiles!client_id(*), provider:profiles!provider_id(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ─── ALL BOOKINGS (Admin) ───────────────────────────────────

export async function getAllBookings(): Promise<Booking[]> {
  if (isMockMode()) {
    const { mockBookings } = await import('@/data/mock-bookings');
    const { mockServices } = await import('@/data/mock-services');
    const { mockUsers } = await import('@/data/mock-users');
    return mockBookings.map(b => ({
      ...b,
      service: mockServices.find(s => s.id === b.service_id),
      client: mockUsers.find(u => u.id === b.client_id),
    }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:profiles!client_id(*), provider:profiles!provider_id(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── PROFILES (Admin) ──────────────────────────────────────

export async function getAllProfiles(): Promise<Profile[]> {
  if (isMockMode()) {
    const { mockUsers } = await import('@/data/mock-users');
    return mockUsers;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── STATS ──────────────────────────────────────────────────

export async function getAdminStats() {
  const [profiles, services, bookings] = await Promise.all([
    getAllProfiles(),
    getServices(),
    getAllBookings(),
  ]);

  const totalComisiones = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((s, b) => s + b.commission, 0);

  return { totalUsers: profiles.length, totalServices: services.length, totalBookings: bookings.length, totalComisiones };
}

export async function getProviderStats(providerId: string) {
  const [services, bookings] = await Promise.all([
    getServicesByProvider(providerId),
    getBookingsByProvider(providerId),
  ]);

  const activeServices = services.filter(s => s.status === 'active');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const revenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((s, b) => s + b.base_total + b.extras_total, 0);
  const avgRating = activeServices.length
    ? Number((activeServices.reduce((s, sv) => s + sv.avg_rating, 0) / activeServices.length).toFixed(1))
    : 0;

  return { activeServices: activeServices.length, pendingBookings, revenue, avgRating };
}

export async function getClientStats(clientId: string) {
  const bookings = await getBookingsByClient(clientId);
  const totalSpent = bookings.reduce((s, b) => s + b.total, 0);
  const nextEvent = bookings
    .filter(b => b.status === 'confirmed')
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  return { totalBookings: bookings.length, totalSpent, nextEvent, recentBookings: bookings.slice(0, 3) };
}

import { createClient } from './client';
import type { Service, Booking, Profile, ServiceCategory, ServiceStatus, BookingStatus, UserRole, VendorCalendarBlock, AvailabilityCheckResult } from '@/types/database';

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
    min_hours: number;
    max_hours: number;
    zones: string[];
    images: string[];
    videos: string[];
    buffer_before_minutes?: number;
    buffer_after_minutes?: number;
    buffer_before_days?: number;
    buffer_after_days?: number;
  },
  extras: { name: string; price: number; price_type: 'fixed' | 'per_person' | 'per_hour'; max_quantity: number }[]
): Promise<Service> {
  if (isMockMode()) {
    const newService: Service = {
      id: crypto.randomUUID(),
      ...service,
      buffer_before_minutes: service.buffer_before_minutes ?? 0,
      buffer_after_minutes: service.buffer_after_minutes ?? 0,
      buffer_before_days: service.buffer_before_days ?? 0,
      buffer_after_days: service.buffer_after_days ?? 0,
      status: 'active',
      deletion_requested: false,
      deletion_requested_at: null,
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

export async function updateService(
  id: string,
  updates: {
    title?: string;
    description?: string;
    category?: ServiceCategory;
    base_price?: number;
    price_unit?: string;
    min_guests?: number;
    max_guests?: number;
    min_hours?: number;
    max_hours?: number;
    zones?: string[];
    images?: string[];
    videos?: string[];
    status?: ServiceStatus;
    buffer_before_minutes?: number;
    buffer_after_minutes?: number;
    buffer_before_days?: number;
    buffer_after_days?: number;
  }
): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('services').update(updates).eq('id', id);
  if (error) throw error;
}

export async function updateServiceStatus(id: string, status: ServiceStatus): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('services').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function requestServiceDeletion(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('services').update({
    deletion_requested: true,
    deletion_requested_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function approveDeletion(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('services').update({
    status: 'archived' as ServiceStatus,
    deletion_requested: false,
    deletion_requested_at: null,
  }).eq('id', id);
  if (error) throw error;
}

export async function rejectDeletion(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('services').update({
    deletion_requested: false,
    deletion_requested_at: null,
  }).eq('id', id);
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
  start_time: string;
  end_time: string;
  event_hours: number;
  guest_count: number;
  base_total: number;
  extras_total: number;
  commission: number;
  total: number;
  selected_extras: { extra_id: string; name: string; quantity: number; price: number }[];
  notes: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  effective_start?: string | null;
  effective_end?: string | null;
  billing_type_snapshot?: string | null;
}): Promise<Booking> {
  if (isMockMode()) {
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      ...booking,
      start_datetime: booking.start_datetime ?? null,
      end_datetime: booking.end_datetime ?? null,
      effective_start: booking.effective_start ?? null,
      effective_end: booking.effective_end ?? null,
      billing_type_snapshot: booking.billing_type_snapshot ?? null,
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

// ─── ADMIN: Profile Actions ─────────────────────────────────

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  if (isMockMode()) return;
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function updateProfileVerified(id: string, verified: boolean): Promise<void> {
  if (isMockMode()) return;
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ verified }).eq('id', id);
  if (error) throw error;
}

// ─── ADMIN: All Services ────────────────────────────────────

export async function getAllServices(): Promise<Service[]> {
  if (isMockMode()) {
    const { mockServices } = await import('@/data/mock-services');
    return mockServices;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*), provider:profiles!provider_id(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── ADMIN: Financial Stats ─────────────────────────────────

export async function getFinancialStats() {
  const bookings = await getAllBookings();

  const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
  const pending = bookings.filter(b => b.status === 'pending');

  const totalRevenue = confirmed.reduce((s, b) => s + b.total, 0);
  const totalCommissions = confirmed.reduce((s, b) => s + b.commission, 0);
  const totalProviderPayouts = confirmed.reduce((s, b) => s + b.base_total + b.extras_total, 0);
  const pendingRevenue = pending.reduce((s, b) => s + b.total, 0);

  // Group by month
  const monthlyData: Record<string, { revenue: number; commissions: number; bookings: number }> = {};
  confirmed.forEach(b => {
    const month = b.created_at.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, commissions: 0, bookings: 0 };
    monthlyData[month].revenue += b.total;
    monthlyData[month].commissions += b.commission;
    monthlyData[month].bookings += 1;
  });

  return { totalRevenue, totalCommissions, totalProviderPayouts, pendingRevenue, monthlyData, totalBookings: confirmed.length };
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

// ─── AVAILABILITY ───────────────────────────────────────────

export async function checkVendorAvailability(vendorId: string, startDatetime: string, endDatetime: string): Promise<AvailabilityCheckResult> {
  if (isMockMode()) {
    return { available: true, overlapping_bookings: 0, max_concurrent: 1, has_calendar_block: false };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('check_vendor_availability', {
    p_vendor_id: vendorId,
    p_start: startDatetime,
    p_end: endDatetime,
  });
  if (error) throw error;
  return data as AvailabilityCheckResult;
}

// ─── VENDOR CALENDAR BLOCKS ────────────────────────────────

export async function getVendorCalendarBlocks(vendorId: string): Promise<VendorCalendarBlock[]> {
  if (isMockMode()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('vendor_calendar_blocks')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('start_datetime', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createVendorCalendarBlock(block: {
  vendor_id: string;
  start_datetime: string;
  end_datetime: string;
  reason?: string;
}): Promise<VendorCalendarBlock> {
  if (isMockMode()) {
    return {
      id: crypto.randomUUID(),
      vendor_id: block.vendor_id,
      start_datetime: block.start_datetime,
      end_datetime: block.end_datetime,
      reason: block.reason ?? null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('vendor_calendar_blocks')
    .insert(block)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVendorCalendarBlock(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('vendor_calendar_blocks').delete().eq('id', id);
  if (error) throw error;
}

// ─── MAX CONCURRENT SERVICES ────────────────────────────────

export async function updateMaxConcurrentServices(profileId: string, maxConcurrent: number): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ max_concurrent_services: maxConcurrent }).eq('id', profileId);
  if (error) throw error;
}

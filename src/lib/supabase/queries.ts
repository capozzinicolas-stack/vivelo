import { createClient } from './client';
import type { Service, Booking, Profile, Extra, SubBooking, ServiceCategory, ServiceStatus, BookingStatus, UserRole, VendorCalendarBlock, AvailabilityCheckResult } from '@/types/database';

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

  // Try full join first
  let query = supabase.from('services').select('*, extras(*), provider:profiles!provider_id(*)');
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.status) query = query.eq('status', filters.status);
  else query = query.eq('status', 'active');
  if (filters?.zone) query = query.contains('zones', [filters.zone]);
  if (filters?.minPrice) query = query.gte('base_price', filters.minPrice);
  if (filters?.maxPrice) query = query.lte('base_price', filters.maxPrice);
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (!error) return data || [];

  // Fall back to simple query without joins
  console.warn('[getServices] Join query failed, trying simple:', error.message);
  let q2 = supabase.from('services').select('*');
  if (filters?.category) q2 = q2.eq('category', filters.category);
  if (filters?.status) q2 = q2.eq('status', filters.status);
  else q2 = q2.eq('status', 'active');
  if (filters?.zone) q2 = q2.contains('zones', [filters.zone]);
  if (filters?.minPrice) q2 = q2.gte('base_price', filters.minPrice);
  if (filters?.maxPrice) q2 = q2.lte('base_price', filters.maxPrice);
  if (filters?.search) q2 = q2.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

  const { data: fallback, error: err2 } = await q2.order('created_at', { ascending: false });
  if (err2) {
    console.error('[getServices] Simple query also failed:', JSON.stringify(err2));
    throw new Error(`Error cargando servicios: ${err2.message || JSON.stringify(err2)}`);
  }
  return (fallback || []).map((s) => ({ ...s, extras: [], provider: null })) as unknown as Service[];
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
  if (!error) return data;

  console.warn('[getServiceById] Join query failed, trying simple:', error.message);
  const { data: fallback, error: err2 } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
  if (err2) {
    console.error('[getServiceById] Simple query also failed:', JSON.stringify(err2));
    throw new Error(`Error cargando servicio: ${err2.message || JSON.stringify(err2)}`);
  }
  return fallback ? { ...fallback, extras: [], provider: null } : null;
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
    min_hours?: number;
    max_hours?: number;
    zones: string[];
    images: string[];
    videos?: string[];
    buffer_before_minutes?: number;
    buffer_after_minutes?: number;
    buffer_before_days?: number;
    buffer_after_days?: number;
    sku?: string;
    base_event_hours?: number | null;
  },
  extras: { name: string; price: number; price_type: 'fixed' | 'per_person' | 'per_hour'; max_quantity: number; sku?: string; depends_on_guests?: boolean; depends_on_hours?: boolean }[]
): Promise<Service> {
  if (isMockMode()) {
    const newService: Service = {
      id: crypto.randomUUID(),
      ...service,
      videos: service.videos ?? [],
      min_hours: service.min_hours ?? 1,
      max_hours: service.max_hours ?? 12,
      sku: service.sku ?? null,
      base_event_hours: service.base_event_hours ?? null,
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
        sku: e.sku ?? null,
        depends_on_guests: e.depends_on_guests ?? false,
        depends_on_hours: e.depends_on_hours ?? false,
        description: null,
        created_at: new Date().toISOString(),
      })),
    };
    return newService;
  }

  const supabase = createClient();

  // ONLY use columns from the original services table (migration 00002)
  // Phase 2 columns (sku, base_event_hours, videos, min_hours, max_hours, buffers)
  // are added separately after the main insert succeeds
  const insertData: Record<string, unknown> = {
    provider_id: service.provider_id,
    title: service.title,
    description: service.description || '',
    category: service.category,
    base_price: service.base_price,
    price_unit: service.price_unit,
    min_guests: service.min_guests || 1,
    max_guests: service.max_guests || 100,
    zones: service.zones || [],
    images: service.images || [],
    status: 'active' as ServiceStatus,
  };

  const { data: svc, error: svcError } = await supabase
    .from('services')
    .insert(insertData)
    .select()
    .single();
  if (svcError) {
    console.error('[createService] INSERT failed:', JSON.stringify(svcError));
    throw new Error(`Error creando servicio: ${svcError.message || svcError.code || JSON.stringify(svcError)}`);
  }

  // Try to update with Phase 2 columns (will silently fail if columns don't exist yet)
  const phase2Updates: Record<string, unknown> = {};
  if (service.sku) phase2Updates.sku = service.sku;
  if (service.base_event_hours != null) phase2Updates.base_event_hours = service.base_event_hours;
  if (service.videos && service.videos.length > 0) phase2Updates.videos = service.videos;
  if (service.min_hours && service.min_hours !== 1) phase2Updates.min_hours = service.min_hours;
  if (service.max_hours && service.max_hours !== 12) phase2Updates.max_hours = service.max_hours;
  if (service.buffer_before_minutes) phase2Updates.buffer_before_minutes = service.buffer_before_minutes;
  if (service.buffer_after_minutes) phase2Updates.buffer_after_minutes = service.buffer_after_minutes;

  if (Object.keys(phase2Updates).length > 0) {
    try {
      await supabase.from('services').update(phase2Updates).eq('id', svc.id);
    } catch {
      console.warn('[createService] Phase 2 columns update skipped (columns may not exist yet)');
    }
  }

  // Insert extras using only original columns (migration 00003)
  if (extras.length > 0) {
    const extrasData = extras.map(e => ({
      service_id: svc.id,
      name: e.name,
      price: e.price,
      price_type: e.price_type,
      max_quantity: e.max_quantity,
    }));
    const { error: extError } = await supabase
      .from('extras')
      .insert(extrasData);
    if (extError) {
      console.error('[createService] Extras INSERT failed:', JSON.stringify(extError));
      // Don't throw — service was created successfully, extras are secondary
    }

    // Try Phase 2 extras columns (sku, depends_on_guests, depends_on_hours)
    try {
      for (let i = 0; i < extras.length; i++) {
        const e = extras[i];
        const phase2Extra: Record<string, unknown> = {};
        if (e.sku) phase2Extra.sku = e.sku;
        if (e.depends_on_guests) phase2Extra.depends_on_guests = true;
        if (e.depends_on_hours) phase2Extra.depends_on_hours = true;
        if (Object.keys(phase2Extra).length > 0) {
          await supabase.from('extras').update(phase2Extra).eq('service_id', svc.id).eq('name', e.name);
        }
      }
    } catch {
      console.warn('[createService] Phase 2 extras columns skipped');
    }
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
    sku?: string;
    base_event_hours?: number | null;
  }
): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();

  // Split into original columns (00002) and Phase 2 columns
  const coreUpdates: Record<string, unknown> = {};
  const phase2Updates: Record<string, unknown> = {};

  // Original 00002 columns
  if (updates.title !== undefined) coreUpdates.title = updates.title;
  if (updates.description !== undefined) coreUpdates.description = updates.description;
  if (updates.category !== undefined) coreUpdates.category = updates.category;
  if (updates.base_price !== undefined) coreUpdates.base_price = updates.base_price;
  if (updates.price_unit !== undefined) coreUpdates.price_unit = updates.price_unit;
  if (updates.min_guests !== undefined) coreUpdates.min_guests = updates.min_guests;
  if (updates.max_guests !== undefined) coreUpdates.max_guests = updates.max_guests;
  if (updates.zones !== undefined) coreUpdates.zones = updates.zones;
  if (updates.images !== undefined) coreUpdates.images = updates.images;
  if (updates.status !== undefined) coreUpdates.status = updates.status;

  // Phase 2 columns (may not exist if migrations not run)
  if (updates.min_hours !== undefined) phase2Updates.min_hours = updates.min_hours;
  if (updates.max_hours !== undefined) phase2Updates.max_hours = updates.max_hours;
  if (updates.videos !== undefined) phase2Updates.videos = updates.videos;
  if (updates.buffer_before_minutes !== undefined) phase2Updates.buffer_before_minutes = updates.buffer_before_minutes;
  if (updates.buffer_after_minutes !== undefined) phase2Updates.buffer_after_minutes = updates.buffer_after_minutes;
  if (updates.sku !== undefined) phase2Updates.sku = updates.sku;
  if (updates.base_event_hours !== undefined) phase2Updates.base_event_hours = updates.base_event_hours;

  // Update core columns
  if (Object.keys(coreUpdates).length > 0) {
    const { error } = await supabase.from('services').update(coreUpdates).eq('id', id);
    if (error) {
      console.error('[updateService] Core UPDATE failed:', JSON.stringify(error));
      throw new Error(`Error actualizando servicio: ${error.message || JSON.stringify(error)}`);
    }
  }

  // Try Phase 2 columns separately (won't break if columns don't exist)
  if (Object.keys(phase2Updates).length > 0) {
    try {
      const { error } = await supabase.from('services').update(phase2Updates).eq('id', id);
      if (error) console.warn('[updateService] Phase 2 update skipped:', error.message);
    } catch {
      console.warn('[updateService] Phase 2 columns not available');
    }
  }
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
  try {
    const { error } = await supabase.from('services').update({
      deletion_requested: true,
      deletion_requested_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) console.warn('[requestServiceDeletion] Column may not exist:', error.message);
  } catch {
    console.warn('[requestServiceDeletion] deletion columns not available');
  }
}

export async function approveDeletion(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  // Always archive the service (uses original status column)
  const { error: statusErr } = await supabase.from('services').update({
    status: 'archived' as ServiceStatus,
  }).eq('id', id);
  if (statusErr) throw new Error(`Error archivando servicio: ${statusErr.message}`);

  // Try resetting deletion columns (Phase 2)
  try {
    await supabase.from('services').update({
      deletion_requested: false,
      deletion_requested_at: null,
    }).eq('id', id);
  } catch {
    // Columns may not exist yet
  }
}

export async function rejectDeletion(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  try {
    const { error } = await supabase.from('services').update({
      deletion_requested: false,
      deletion_requested_at: null,
    }).eq('id', id);
    if (error) console.warn('[rejectDeletion] Column may not exist:', error.message);
  } catch {
    console.warn('[rejectDeletion] deletion columns not available');
  }
}

// ─── SERVICES BY PROVIDER ───────────────────────────────────

export async function getServicesByProvider(providerId: string): Promise<Service[]> {
  if (isMockMode()) {
    const { mockServices } = await import('@/data/mock-services');
    return mockServices.filter(s => s.provider_id === providerId);
  }

  const supabase = createClient();
  // Try with extras join first; fall back to plain query if it fails
  const { data, error } = await supabase
    .from('services')
    .select('*, extras(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (!error) return data || [];

  console.warn('[getServicesByProvider] Join query failed, trying simple:', error.message);
  const { data: fallback, error: err2 } = await supabase
    .from('services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (err2) {
    console.error('[getServicesByProvider] Simple query also failed:', JSON.stringify(err2));
    throw new Error(`Error cargando servicios: ${err2.message || JSON.stringify(err2)}`);
  }
  return (fallback || []).map(s => ({ ...s, extras: [] }));
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

  // Split booking into original columns (00004) and Phase 2 columns
  const coreBooking: Record<string, unknown> = {
    service_id: booking.service_id,
    client_id: booking.client_id,
    provider_id: booking.provider_id,
    event_date: booking.event_date,
    guest_count: booking.guest_count,
    base_total: booking.base_total,
    extras_total: booking.extras_total,
    commission: booking.commission,
    total: booking.total,
    selected_extras: booking.selected_extras,
    notes: booking.notes,
    status: 'pending' as BookingStatus,
  };

  // Try full insert first (with Phase 2 columns)
  const fullBooking = {
    ...coreBooking,
    start_time: booking.start_time,
    end_time: booking.end_time,
    event_hours: booking.event_hours,
    start_datetime: booking.start_datetime,
    end_datetime: booking.end_datetime,
    effective_start: booking.effective_start,
    effective_end: booking.effective_end,
    billing_type_snapshot: booking.billing_type_snapshot,
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(fullBooking)
    .select()
    .single();
  if (!error) return data;

  // Fallback: insert with only original columns
  console.warn('[createBooking] Full insert failed, trying core only:', error.message);
  const { data: fb, error: e2 } = await supabase
    .from('bookings')
    .insert(coreBooking)
    .select()
    .single();
  if (e2) {
    console.error('[createBooking] Core insert also failed:', JSON.stringify(e2));
    throw new Error(`Error creando reserva: ${e2.message || JSON.stringify(e2)}`);
  }
  return fb;
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
    .select('*, service:services(*), provider:profiles!provider_id(*), sub_bookings(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (!error) return data || [];

  // Fallback without sub_bookings
  console.warn('[getBookingsByClient] sub_bookings join failed, retrying:', error.message);
  const { data: fb, error: e2 } = await supabase
    .from('bookings')
    .select('*, service:services(*), provider:profiles!provider_id(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (e2) throw new Error(`Error cargando reservas: ${e2.message}`);
  return (fb || []).map(b => ({ ...b, sub_bookings: [] }));
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
    .select('*, service:services(*), client:profiles!client_id(*), sub_bookings(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (!error) return data || [];

  console.warn('[getBookingsByProvider] sub_bookings join failed, retrying:', error.message);
  const { data: fb, error: e2 } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:profiles!client_id(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (e2) throw new Error(`Error cargando reservas: ${e2.message}`);
  return (fb || []).map(b => ({ ...b, sub_bookings: [] }));
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
    .select('*, service:services(*), client:profiles!client_id(*), provider:profiles!provider_id(*), sub_bookings(*)')
    .eq('id', id)
    .single();
  if (!error) return data;

  console.warn('[getBookingById] sub_bookings join failed, retrying:', error.message);
  const { data: fb, error: e2 } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:profiles!client_id(*), provider:profiles!provider_id(*)')
    .eq('id', id)
    .single();
  if (e2) throw new Error(`Error cargando reserva: ${e2.message}`);
  return fb ? { ...fb, sub_bookings: [] } : null;
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
    .select('*, service:services(*), client:profiles!client_id(*), provider:profiles!provider_id(*), sub_bookings(*)')
    .order('created_at', { ascending: false });
  if (!error) return data || [];

  console.warn('[getAllBookings] sub_bookings join failed, retrying:', error.message);
  const { data: fb, error: e2 } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:profiles!client_id(*), provider:profiles!provider_id(*)')
    .order('created_at', { ascending: false });
  if (e2) throw new Error(`Error cargando reservas: ${e2.message}`);
  return (fb || []).map(b => ({ ...b, sub_bookings: [] }));
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
  if (!error) return data || [];

  console.warn('[getAllServices] Join query failed, trying simple:', error.message);
  const { data: fb, error: e2 } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });
  if (e2) throw new Error(`Error cargando servicios: ${e2.message}`);
  return (fb || []).map(s => ({ ...s, extras: [], provider: null }));
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

  if (error) {
    // RPC function may not exist if migrations haven't been run yet
    // Default to "available" so bookings aren't blocked
    console.warn('[checkVendorAvailability] RPC failed (function may not exist yet):', error.message);
    return { available: true, overlapping_bookings: 0, max_concurrent: 1, has_calendar_block: false };
  }
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
  if (error) {
    // Table may not exist if migrations haven't been run
    console.warn('[getVendorCalendarBlocks] Query failed (table may not exist):', error.message);
    return [];
  }
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
  if (error) {
    console.error('[createVendorCalendarBlock] Failed:', error.message);
    throw new Error(`Error creando bloqueo: ${error.message}. La tabla puede no existir aun — ejecuta la migracion 00099.`);
  }
  return data;
}

export async function deleteVendorCalendarBlock(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('vendor_calendar_blocks').delete().eq('id', id);
  if (error) {
    console.warn('[deleteVendorCalendarBlock] Failed:', error.message);
  }
}

// ─── MAX CONCURRENT SERVICES ────────────────────────────────

export async function updateMaxConcurrentServices(profileId: string, maxConcurrent: number): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ max_concurrent_services: maxConcurrent }).eq('id', profileId);
  if (error) {
    console.warn('[updateMaxConcurrentServices] Column may not exist:', error.message);
    // Don't throw — column may not exist yet
  }
}

// ─── EXTRAS CRUD ────────────────────────────────────────────

export async function createExtra(extra: {
  service_id: string;
  name: string;
  price: number;
  price_type: 'fixed' | 'per_person' | 'per_hour';
  max_quantity: number;
  sku?: string;
  depends_on_guests?: boolean;
  depends_on_hours?: boolean;
}): Promise<Extra> {
  if (isMockMode()) {
    return {
      id: crypto.randomUUID(),
      ...extra,
      description: null,
      sku: extra.sku ?? null,
      depends_on_guests: extra.depends_on_guests ?? false,
      depends_on_hours: extra.depends_on_hours ?? false,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('extras')
    .insert(extra)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExtra(id: string, updates: {
  name?: string;
  price?: number;
  price_type?: 'fixed' | 'per_person' | 'per_hour';
  max_quantity?: number;
  sku?: string;
  depends_on_guests?: boolean;
  depends_on_hours?: boolean;
}): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('extras').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteExtra(id: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('extras').delete().eq('id', id);
  if (error) throw error;
}

// ─── SUB-BOOKINGS ───────────────────────────────────────────

export async function createSubBookings(bookingId: string, items: {
  extra_id?: string;
  sku?: string;
  name: string;
  quantity: number;
  unit_price: number;
  price_type: string;
  subtotal: number;
}[]): Promise<SubBooking[]> {
  if (isMockMode()) {
    return items.map(item => ({
      id: crypto.randomUUID(),
      booking_id: bookingId,
      extra_id: item.extra_id ?? null,
      sku: item.sku ?? null,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      price_type: item.price_type,
      subtotal: item.subtotal,
      created_at: new Date().toISOString(),
    }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('sub_bookings')
    .insert(items.map(item => ({ ...item, booking_id: bookingId })))
    .select();
  if (error) throw error;
  return data || [];
}

export async function getSubBookingsByBooking(bookingId: string): Promise<SubBooking[]> {
  if (isMockMode()) {
    const { mockSubBookings } = await import('@/data/mock-sub-bookings');
    return mockSubBookings.filter(sb => sb.booking_id === bookingId);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('sub_bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── PROVIDER BUFFER CONFIG ────────────────────────────────

export async function updateProviderBufferConfig(profileId: string, config: {
  apply_buffers_to_all: boolean;
  global_buffer_before_minutes: number;
  global_buffer_after_minutes: number;
}): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('profiles').update(config).eq('id', profileId);
  if (error) {
    console.warn('[updateProviderBufferConfig] Columns may not exist:', error.message);
    // Don't throw — columns may not exist yet
  }
}

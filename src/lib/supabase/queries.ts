import { createClient } from './client';
import type { Service, Booking, Profile, Extra, SubBooking, ServiceCategory, ServiceSubcategory, ServiceStatus, BookingStatus, BankingStatus, UserRole, VendorCalendarBlock, AvailabilityCheckResult, GoogleCalendarConnection, FeaturedPlacement, FeaturedSection, Campaign, CampaignStatus, CampaignSubscription, Notification, NotificationType, BlogPost, BlogStatus, FeaturedProvider, Review, ShowcaseItem, SiteBanner, Order, OrderStatus } from '@/types/database';

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
    const { mockUsers } = await import('@/data/mock-users');
    let results = mockServices.map(s => ({ ...s, provider: mockUsers.find(u => u.id === s.provider_id) || undefined }));
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
  // Try to fetch providers separately for each service
  const providerIds = Array.from(new Set((fallback || []).map(s => s.provider_id).filter(Boolean)));
  let providersMap: Record<string, Profile> = {};
  if (providerIds.length > 0) {
    try {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', providerIds);
      if (profiles) providersMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    } catch { /* ignore */ }
  }
  return (fallback || []).map((s) => ({ ...s, extras: [], provider: providersMap[s.provider_id] || null })) as unknown as Service[];
}

export async function getServiceById(id: string): Promise<Service | null> {
  if (isMockMode()) {
    const { mockServices } = await import('@/data/mock-services');
    const { mockUsers } = await import('@/data/mock-users');
    const s = mockServices.find(s => s.id === id);
    if (!s) return null;
    return { ...s, provider: mockUsers.find(u => u.id === s.provider_id) || undefined };
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
  if (!fallback) return null;
  // Try to fetch provider separately
  let provider = null;
  try {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', fallback.provider_id).single();
    if (p) provider = p;
  } catch { /* ignore */ }
  return { ...fallback, extras: [], provider } as unknown as Service;
}

export async function createService(
  service: {
    provider_id: string;
    title: string;
    description: string;
    category: ServiceCategory;
    subcategory?: ServiceSubcategory | null;
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
    category_details?: Record<string, unknown>;
  },
  extras: { name: string; price: number; price_type: 'fixed' | 'per_person' | 'per_hour'; max_quantity: number; sku?: string; depends_on_guests?: boolean; depends_on_hours?: boolean }[]
): Promise<Service> {
  if (isMockMode()) {
    const newService: Service = {
      id: crypto.randomUUID(),
      ...service,
      subcategory: service.subcategory ?? null,
      videos: service.videos ?? [],
      min_hours: service.min_hours ?? 1,
      max_hours: service.max_hours ?? 12,
      sku: service.sku ?? null,
      base_event_hours: service.base_event_hours ?? null,
      category_details: service.category_details ?? {},
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

  const insertData: Record<string, unknown> = {
    provider_id: service.provider_id,
    title: service.title,
    description: service.description || '',
    category: service.category,
    subcategory: service.subcategory || null,
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
  if (service.category_details && Object.keys(service.category_details).length > 0) phase2Updates.category_details = service.category_details;

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
    subcategory?: ServiceSubcategory | null;
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
    category_details?: Record<string, unknown>;
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
  if (updates.subcategory !== undefined) coreUpdates.subcategory = updates.subcategory;

  // Phase 2+ columns (may not exist if migrations not run)
  if (updates.min_hours !== undefined) phase2Updates.min_hours = updates.min_hours;
  if (updates.max_hours !== undefined) phase2Updates.max_hours = updates.max_hours;
  if (updates.videos !== undefined) phase2Updates.videos = updates.videos;
  if (updates.buffer_before_minutes !== undefined) phase2Updates.buffer_before_minutes = updates.buffer_before_minutes;
  if (updates.buffer_after_minutes !== undefined) phase2Updates.buffer_after_minutes = updates.buffer_after_minutes;
  if (updates.sku !== undefined) phase2Updates.sku = updates.sku;
  if (updates.base_event_hours !== undefined) phase2Updates.base_event_hours = updates.base_event_hours;
  if (updates.category_details !== undefined) phase2Updates.category_details = updates.category_details;

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
  event_name?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  effective_start?: string | null;
  effective_end?: string | null;
  billing_type_snapshot?: string | null;
  order_id?: string | null;
}): Promise<Booking> {
  if (isMockMode()) {
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      ...booking,
      event_name: booking.event_name ?? null,
      start_datetime: booking.start_datetime ?? null,
      end_datetime: booking.end_datetime ?? null,
      effective_start: booking.effective_start ?? null,
      effective_end: booking.effective_end ?? null,
      billing_type_snapshot: booking.billing_type_snapshot ?? null,
      order_id: booking.order_id ?? null,
      status: 'pending',
      stripe_payment_intent_id: null,
      google_calendar_event_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return newBooking;
  }

  const supabase = createClient();

  // Server-side availability check (prevents race conditions)
  if (booking.effective_start && booking.effective_end) {
    const availability = await checkVendorAvailability(booking.provider_id, booking.effective_start, booking.effective_end);
    if (!availability.available) {
      const reason = availability.has_calendar_block
        ? 'El proveedor tiene un bloqueo en ese horario.'
        : `El proveedor ya tiene ${availability.overlapping_bookings} reserva(s) en ese horario.`;
      throw new Error(reason);
    }
  }

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
    event_name: booking.event_name ?? null,
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

export async function getProfileById(id: string): Promise<Profile | null> {
  if (isMockMode()) {
    const { mockUsers } = await import('@/data/mock-users');
    return mockUsers.find(u => u.id === id) || null;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) {
    console.warn('[getProfileById] Failed:', error.message);
    return null;
  }
  return data;
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
  // Provider payout = total charged to client minus Vivelo's commission
  const totalProviderPayouts = confirmed.reduce((s, b) => s + b.total - b.commission, 0);
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
  // Provider revenue = total charged to client minus Vivelo's commission
  const revenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((s, b) => s + b.total - b.commission, 0);
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

// ─── CLIENT EVENT NAMES ─────────────────────────────────────

export async function getClientEventNames(clientId: string): Promise<string[]> {
  if (isMockMode()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('event_name')
    .eq('client_id', clientId)
    .not('event_name', 'is', null);
  if (error) {
    console.warn('[getClientEventNames] Query failed:', error.message);
    return [];
  }
  const names = Array.from(new Set((data || []).map(d => d.event_name).filter(Boolean) as string[]));
  return names;
}

// ─── REVIEWS ────────────────────────────────────────────────

export async function getReviewsByProvider(providerId: string): Promise<Review[]> {
  if (isMockMode()) {
    return [];
  }

  const supabase = createClient();

  // Get all service IDs for this provider
  const { data: services } = await supabase
    .from('services')
    .select('id')
    .eq('provider_id', providerId);

  if (!services || services.length === 0) return [];

  const serviceIds = services.map(s => s.id);
  const { data, error } = await supabase
    .from('reviews')
    .select('*, client:profiles!client_id(full_name, avatar_url)')
    .in('service_id', serviceIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[getReviewsByProvider] Query failed:', error.message);
    return [];
  }
  return data || [];
}

// ─── SERVICE BOOKING COUNT ───────────────────────────────────

export async function getServiceBookingCount(serviceId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  if (isMockMode()) {
    const { mockBookings } = await import('@/data/mock-bookings');
    return mockBookings.filter(b =>
      b.service_id === serviceId
      && (b.status === 'confirmed' || b.status === 'completed')
      && b.event_date < today
    ).length;
  }

  const supabase = createClient();
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)
    .in('status', ['confirmed', 'completed'])
    .lt('event_date', today);
  if (error) {
    console.warn('[getServiceBookingCount] Query failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

// ─── AVAILABILITY ───────────────────────────────────────────

export async function checkVendorAvailability(vendorId: string, startDatetime: string, endDatetime: string): Promise<AvailabilityCheckResult> {
  if (isMockMode()) {
    return { available: true, overlapping_bookings: 0, max_concurrent: 1, has_calendar_block: false };
  }

  const supabase = createClient();

  // Try RPC first (fastest, single round-trip)
  const { data, error } = await supabase.rpc('check_vendor_availability', {
    p_vendor_id: vendorId,
    p_start: startDatetime,
    p_end: endDatetime,
  });

  if (!error && data) {
    return data as AvailabilityCheckResult;
  }

  // Fallback: direct queries if RPC doesn't exist
  console.warn('[checkVendorAvailability] RPC failed, using direct queries:', error?.message);

  // Check overlapping bookings
  const { count: overlappingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', vendorId)
    .in('status', ['pending', 'confirmed'])
    .lt('effective_start', endDatetime)
    .gt('effective_end', startDatetime);

  // Check calendar blocks
  const { count: blockCount } = await supabase
    .from('vendor_calendar_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .lt('start_datetime', endDatetime)
    .gt('end_datetime', startDatetime);

  const overlapping = overlappingCount ?? 0;
  const hasBlock = (blockCount ?? 0) > 0;
  const maxConcurrent = 1;

  return {
    available: overlapping < maxConcurrent && !hasBlock,
    overlapping_bookings: overlapping,
    max_concurrent: maxConcurrent,
    has_calendar_block: hasBlock,
  };
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
      google_event_id: null,
      source: 'manual' as const,
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

// ─── PROFILE UPDATES ────────────────────────────────────────

export async function updateProfile(profileId: string, updates: {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  bio?: string | null;
}): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', profileId);
  if (error) {
    console.error('[updateProfile] Failed:', JSON.stringify(error));
    throw new Error(`Error actualizando perfil: ${error.message}`);
  }
}

export async function updateClientBilling(profileId: string, rfc: string | null): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({
    rfc,
    updated_at: new Date().toISOString(),
  }).eq('id', profileId);
  if (error) {
    console.warn('[updateClientBilling] Column may not exist:', error.message);
  }
}

export async function updateProviderBanking(profileId: string, updates: {
  clabe?: string;
  bank_document_url?: string;
}): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({
    ...updates,
    banking_status: 'pending_review' as BankingStatus,
    banking_rejection_reason: null,
    updated_at: new Date().toISOString(),
  }).eq('id', profileId);
  if (error) {
    console.warn('[updateProviderBanking] Columns may not exist:', error.message);
  }
}

// ─── GOOGLE CALENDAR ────────────────────────────────────────

export async function getGoogleCalendarConnection(providerId: string): Promise<GoogleCalendarConnection | null> {
  if (isMockMode()) {
    const { mockGoogleCalendarConnection } = await import('@/data/mock-google-calendar');
    return mockGoogleCalendarConnection.provider_id === providerId ? mockGoogleCalendarConnection : null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('provider_id', providerId)
    .single();
  if (error) {
    console.warn('[getGoogleCalendarConnection] Query failed:', error.message);
    return null;
  }
  return data;
}

export async function updateBankingStatus(profileId: string, status: BankingStatus, rejectionReason?: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const updates: Record<string, unknown> = {
    banking_status: status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'rejected' && rejectionReason) {
    updates.banking_rejection_reason = rejectionReason;
  } else if (status === 'verified') {
    updates.banking_rejection_reason = null;
  }
  const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
  if (error) {
    console.warn('[updateBankingStatus] Columns may not exist:', error.message);
  }
}

// ─── FEATURED PLACEMENTS ────────────────────────────────────

export async function getFeaturedPlacements(section?: FeaturedSection): Promise<FeaturedPlacement[]> {
  if (isMockMode()) {
    const { mockFeaturedPlacements } = await import('@/data/mock-marketing');
    const { mockServices } = await import('@/data/mock-services');
    const now = new Date().toISOString();
    let results = mockFeaturedPlacements.filter(p => p.start_date <= now && p.end_date >= now);
    if (section) results = results.filter(p => p.section === section);
    return results
      .sort((a, b) => a.position - b.position)
      .map(p => ({ ...p, service: mockServices.find(s => s.id === p.service_id) }));
  }

  const supabase = createClient();
  let query = supabase
    .from('featured_placements')
    .select('*, service:services(*, provider:profiles!provider_id(*))')
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .order('position', { ascending: true });
  if (section) query = query.eq('section', section);
  const { data, error } = await query;
  if (error) {
    console.warn('[getFeaturedPlacements] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getAllFeaturedPlacements(): Promise<FeaturedPlacement[]> {
  if (isMockMode()) {
    const { mockFeaturedPlacements } = await import('@/data/mock-marketing');
    const { mockServices } = await import('@/data/mock-services');
    return mockFeaturedPlacements
      .sort((a, b) => a.position - b.position)
      .map(p => ({ ...p, service: mockServices.find(s => s.id === p.service_id) }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('featured_placements')
    .select('*, service:services(*, provider:profiles!provider_id(*))')
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getAllFeaturedPlacements] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function createFeaturedPlacement(placement: {
  service_id: string;
  section: FeaturedSection;
  position: number;
  start_date: string;
  end_date: string;
}): Promise<FeaturedPlacement> {
  if (isMockMode()) {
    const { mockFeaturedPlacements } = await import('@/data/mock-marketing');
    const newPlacement: FeaturedPlacement = { id: crypto.randomUUID(), ...placement, created_at: new Date().toISOString() };
    mockFeaturedPlacements.push(newPlacement);
    return newPlacement;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('featured_placements').insert(placement).select().single();
  if (error) throw new Error(`Error creando destaque: ${error.message}`);
  return data;
}

export async function deleteFeaturedPlacement(id: string): Promise<void> {
  if (isMockMode()) {
    const { mockFeaturedPlacements } = await import('@/data/mock-marketing');
    const idx = mockFeaturedPlacements.findIndex(p => p.id === id);
    if (idx !== -1) mockFeaturedPlacements.splice(idx, 1);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('featured_placements').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando destaque: ${error.message}`);
}

// ─── CAMPAIGNS ──────────────────────────────────────────────

export async function getCampaigns(statusFilter?: CampaignStatus): Promise<Campaign[]> {
  if (isMockMode()) {
    const { mockCampaigns } = await import('@/data/mock-marketing');
    let results = [...mockCampaigns];
    if (statusFilter) results = results.filter(c => c.status === statusFilter);
    return results;
  }

  const supabase = createClient();
  let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);
  const { data, error } = await query;
  if (error) {
    console.warn('[getCampaigns] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function createCampaign(campaign: {
  internal_name: string;
  external_name: string;
  description?: string;
  discount_pct: number;
  commission_reduction_pct: number;
  vivelo_absorbs_pct: number;
  provider_absorbs_pct: number;
  start_date: string;
  end_date: string;
  exposure_channels: string[];
  status?: CampaignStatus;
}): Promise<Campaign> {
  if (isMockMode()) {
    const { mockCampaigns } = await import('@/data/mock-marketing');
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      ...campaign,
      description: campaign.description ?? null,
      status: campaign.status ?? 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockCampaigns.push(newCampaign);
    return newCampaign;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('campaigns').insert(campaign).select().single();
  if (error) throw new Error(`Error creando campana: ${error.message}`);
  return data;
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
  if (isMockMode()) {
    const { mockCampaigns } = await import('@/data/mock-marketing');
    const campaign = mockCampaigns.find(c => c.id === id);
    if (campaign) {
      campaign.status = status;
      campaign.updated_at = new Date().toISOString();
    }
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error actualizando campana: ${error.message}`);
}

export async function getActiveCampaignsWithServices(): Promise<(Campaign & { subscriptions: CampaignSubscription[] })[]> {
  if (isMockMode()) {
    const { mockCampaigns, mockCampaignSubscriptions } = await import('@/data/mock-marketing');
    const { mockServices } = await import('@/data/mock-services');
    return mockCampaigns
      .filter(c => c.status === 'active')
      .map(c => ({
        ...c,
        subscriptions: mockCampaignSubscriptions
          .filter(s => s.campaign_id === c.id && s.status === 'active')
          .map(s => ({ ...s, service: mockServices.find(sv => sv.id === s.service_id) })),
      }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, subscriptions:campaign_subscriptions(*, service:services(*, provider:profiles!provider_id(*)))')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getActiveCampaignsWithServices] Query failed:', error.message);
    return [];
  }
  return (data || []) as (Campaign & { subscriptions: CampaignSubscription[] })[];
}

export async function subscribeToCampaign(campaignId: string, serviceId: string, providerId: string): Promise<CampaignSubscription> {
  if (isMockMode()) {
    const { mockCampaignSubscriptions } = await import('@/data/mock-marketing');
    const newSub: CampaignSubscription = {
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      service_id: serviceId,
      provider_id: providerId,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    mockCampaignSubscriptions.push(newSub);
    return newSub;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('campaign_subscriptions')
    .insert({ campaign_id: campaignId, service_id: serviceId, provider_id: providerId })
    .select()
    .single();
  if (error) throw new Error(`Error inscribiendo servicio: ${error.message}`);
  return data;
}

export async function unsubscribeFromCampaign(subscriptionId: string): Promise<void> {
  if (isMockMode()) {
    const { mockCampaignSubscriptions } = await import('@/data/mock-marketing');
    const idx = mockCampaignSubscriptions.findIndex(s => s.id === subscriptionId);
    if (idx !== -1) mockCampaignSubscriptions.splice(idx, 1);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('campaign_subscriptions').delete().eq('id', subscriptionId);
  if (error) throw new Error(`Error retirando servicio: ${error.message}`);
}

export async function getProviderCampaignSubscriptions(providerId: string): Promise<CampaignSubscription[]> {
  if (isMockMode()) {
    const { mockCampaignSubscriptions, mockCampaigns } = await import('@/data/mock-marketing');
    const { mockServices } = await import('@/data/mock-services');
    return mockCampaignSubscriptions
      .filter(s => s.provider_id === providerId)
      .map(s => ({
        ...s,
        service: mockServices.find(sv => sv.id === s.service_id),
        campaign: mockCampaigns.find(c => c.id === s.campaign_id),
      }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('campaign_subscriptions')
    .select('*, service:services(*), campaign:campaigns(*)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getProviderCampaignSubscriptions] Query failed:', error.message);
    return [];
  }
  return data || [];
}

// ─── NOTIFICATIONS ──────────────────────────────────────────

export async function getNotifications(recipientId: string): Promise<Notification[]> {
  if (isMockMode()) {
    const { mockNotifications } = await import('@/data/mock-notifications');
    return mockNotifications
      .filter(n => n.recipient_id === recipientId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getNotifications] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getUnreadNotificationCount(recipientId: string): Promise<number> {
  if (isMockMode()) {
    const { mockNotifications } = await import('@/data/mock-notifications');
    return mockNotifications.filter(n => n.recipient_id === recipientId && !n.read).length;
  }

  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .eq('read', false);
  if (error) {
    console.warn('[getUnreadNotificationCount] Query failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isMockMode()) {
    const { mockNotifications } = await import('@/data/mock-notifications');
    const notif = mockNotifications.find(n => n.id === id);
    if (notif) notif.read = true;
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) console.warn('[markNotificationRead] Failed:', error.message);
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  if (isMockMode()) {
    const { mockNotifications } = await import('@/data/mock-notifications');
    mockNotifications.filter(n => n.recipient_id === recipientId && !n.read).forEach(n => { n.read = true; });
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('notifications').update({ read: true }).eq('recipient_id', recipientId).eq('read', false);
  if (error) console.warn('[markAllNotificationsRead] Failed:', error.message);
}

export async function createNotification(notification: {
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<Notification> {
  if (isMockMode()) {
    const { mockNotifications } = await import('@/data/mock-notifications');
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      ...notification,
      link: notification.link ?? null,
      read: false,
      created_at: new Date().toISOString(),
    };
    mockNotifications.push(newNotif);
    return newNotif;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('notifications').insert(notification).select().single();
  if (error) throw new Error(`Error creando notificacion: ${error.message}`);
  return data;
}

// ─── BLOG POSTS ─────────────────────────────────────────────

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  if (isMockMode()) {
    const { mockBlogPosts } = await import('@/data/mock-content');
    return mockBlogPosts
      .filter(p => p.status === 'published' && p.publish_date && p.publish_date <= new Date().toISOString())
      .sort((a, b) => (b.publish_date ?? '').localeCompare(a.publish_date ?? ''));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('publish_date', new Date().toISOString())
    .order('publish_date', { ascending: false });
  if (error) {
    console.warn('[getPublishedBlogPosts] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (isMockMode()) {
    const { mockBlogPosts } = await import('@/data/mock-content');
    return mockBlogPosts.find(p => p.slug === slug && p.status === 'published') ?? null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error) {
    console.warn('[getBlogPostBySlug] Query failed:', error.message);
    return null;
  }
  return data;
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  if (isMockMode()) {
    const { mockBlogPosts } = await import('@/data/mock-content');
    return mockBlogPosts;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getAllBlogPosts] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function createBlogPost(post: {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  media_type: 'text' | 'video' | 'audio';
  media_url?: string;
  status: BlogStatus;
  publish_date?: string;
}): Promise<BlogPost> {
  if (isMockMode()) {
    const { mockBlogPosts } = await import('@/data/mock-content');
    const newPost: BlogPost = {
      id: crypto.randomUUID(),
      ...post,
      excerpt: post.excerpt ?? null,
      cover_image: post.cover_image ?? null,
      media_url: post.media_url ?? null,
      publish_date: post.publish_date ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockBlogPosts.push(newPost);
    return newPost;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('blog_posts').insert(post).select().single();
  if (error) throw new Error(`Error creando blog post: ${error.message}`);
  return data;
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<void> {
  if (isMockMode()) {
    const { mockBlogPosts } = await import('@/data/mock-content');
    const post = mockBlogPosts.find(p => p.id === id);
    if (post) Object.assign(post, updates, { updated_at: new Date().toISOString() });
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('blog_posts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error actualizando blog post: ${error.message}`);
}

export async function deleteBlogPost(id: string): Promise<void> {
  if (isMockMode()) {
    const { mockBlogPosts } = await import('@/data/mock-content');
    const idx = mockBlogPosts.findIndex(p => p.id === id);
    if (idx !== -1) mockBlogPosts.splice(idx, 1);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando blog post: ${error.message}`);
}

// ─── FEATURED PROVIDERS ─────────────────────────────────────

export async function getActiveFeaturedProviders(): Promise<FeaturedProvider[]> {
  if (isMockMode()) {
    const { mockFeaturedProviders } = await import('@/data/mock-marketing');
    const { mockUsers } = await import('@/data/mock-users');
    const now = new Date().toISOString();
    return mockFeaturedProviders
      .filter(p => p.start_date <= now && p.end_date >= now)
      .sort((a, b) => a.position - b.position)
      .map(p => ({ ...p, provider: mockUsers.find(u => u.id === p.provider_id) }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('featured_providers')
    .select('*, provider:profiles(*)')
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getActiveFeaturedProviders] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getAllFeaturedProviders(): Promise<FeaturedProvider[]> {
  if (isMockMode()) {
    const { mockFeaturedProviders } = await import('@/data/mock-marketing');
    const { mockUsers } = await import('@/data/mock-users');
    return mockFeaturedProviders.map(p => ({ ...p, provider: mockUsers.find(u => u.id === p.provider_id) }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('featured_providers')
    .select('*, provider:profiles(*)')
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getAllFeaturedProviders] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function createFeaturedProvider(fp: {
  provider_id: string;
  position: number;
  start_date: string;
  end_date: string;
}): Promise<FeaturedProvider> {
  if (isMockMode()) {
    const { mockFeaturedProviders } = await import('@/data/mock-marketing');
    const newFp: FeaturedProvider = { id: crypto.randomUUID(), ...fp, created_at: new Date().toISOString() };
    mockFeaturedProviders.push(newFp);
    return newFp;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('featured_providers').insert(fp).select().single();
  if (error) throw new Error(`Error creando proveedor destacado: ${error.message}`);
  return data;
}

export async function deleteFeaturedProvider(id: string): Promise<void> {
  if (isMockMode()) {
    const { mockFeaturedProviders } = await import('@/data/mock-marketing');
    const idx = mockFeaturedProviders.findIndex(p => p.id === id);
    if (idx !== -1) mockFeaturedProviders.splice(idx, 1);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('featured_providers').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando proveedor destacado: ${error.message}`);
}

// ─── SHOWCASE ITEMS ─────────────────────────────────────────

export async function getActiveShowcaseItems(): Promise<ShowcaseItem[]> {
  if (isMockMode()) {
    const { mockShowcaseItems } = await import('@/data/mock-marketing');
    return mockShowcaseItems.filter(i => i.is_active).sort((a, b) => a.position - b.position);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('showcase_items')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getActiveShowcaseItems] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getAllShowcaseItems(): Promise<ShowcaseItem[]> {
  if (isMockMode()) {
    const { mockShowcaseItems } = await import('@/data/mock-marketing');
    return mockShowcaseItems.sort((a, b) => a.position - b.position);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('showcase_items')
    .select('*')
    .order('position', { ascending: true });
  if (error) {
    console.warn('[getAllShowcaseItems] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function createShowcaseItem(item: {
  label: string;
  description: string;
  subcategory: string;
  parent_category: string;
  gradient_color: string;
  position: number;
}): Promise<ShowcaseItem> {
  if (isMockMode()) {
    const { mockShowcaseItems } = await import('@/data/mock-marketing');
    const newItem: ShowcaseItem = {
      id: crypto.randomUUID(),
      ...item,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockShowcaseItems.push(newItem);
    return newItem;
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('showcase_items').insert(item).select().single();
  if (error) throw new Error(`Error creando showcase item: ${error.message}`);
  return data;
}

export async function updateShowcaseItem(id: string, updates: Partial<ShowcaseItem>): Promise<void> {
  if (isMockMode()) {
    const { mockShowcaseItems } = await import('@/data/mock-marketing');
    const item = mockShowcaseItems.find(i => i.id === id);
    if (item) Object.assign(item, updates, { updated_at: new Date().toISOString() });
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('showcase_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error actualizando showcase item: ${error.message}`);
}

export async function deleteShowcaseItem(id: string): Promise<void> {
  if (isMockMode()) {
    const { mockShowcaseItems } = await import('@/data/mock-marketing');
    const idx = mockShowcaseItems.findIndex(i => i.id === id);
    if (idx !== -1) mockShowcaseItems.splice(idx, 1);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.from('showcase_items').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando showcase item: ${error.message}`);
}

// ─── SITE BANNERS ───────────────────────────────────────────

export async function getActiveSiteBanners(): Promise<SiteBanner[]> {
  if (isMockMode()) {
    const { mockSiteBanners } = await import('@/data/mock-marketing');
    return mockSiteBanners.filter(b => b.is_active);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_banners')
    .select('*')
    .eq('is_active', true);
  if (error) {
    console.warn('[getActiveSiteBanners] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function getAllSiteBanners(): Promise<SiteBanner[]> {
  if (isMockMode()) {
    const { mockSiteBanners } = await import('@/data/mock-marketing');
    return mockSiteBanners;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_banners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[getAllSiteBanners] Query failed:', error.message);
    return [];
  }
  return data || [];
}

export async function updateSiteBanner(id: string, updates: Partial<SiteBanner>): Promise<void> {
  if (isMockMode()) {
    const { mockSiteBanners } = await import('@/data/mock-marketing');
    const banner = mockSiteBanners.find(b => b.id === id);
    if (banner) Object.assign(banner, updates, { updated_at: new Date().toISOString() });
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('site_banners')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error actualizando banner: ${error.message}`);
}

// ============================================================
// Orders
// ============================================================

export async function createOrder(data: {
  client_id: string;
  subtotal: number;
  platform_fee: number;
  total: number;
}): Promise<Order> {
  if (isMockMode()) {
    return {
      id: crypto.randomUUID(),
      client_id: data.client_id,
      stripe_payment_intent_id: null,
      subtotal: data.subtotal,
      platform_fee: data.platform_fee,
      stripe_fee: 0,
      total: data.total,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const supabase = createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`Error creando order: ${error.message}`);
  return order;
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (isMockMode()) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, bookings(*, service:services(title, category, images, provider:profiles!bookings_provider_id_fkey(full_name, company_name)))')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getOrdersByClient(clientId: string): Promise<Order[]> {
  if (isMockMode()) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, bookings(id, service_id, total, status, event_date, service:services(title))')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function updateOrderStatus(id: string, status: OrderStatus, stripePaymentIntentId?: string): Promise<void> {
  if (isMockMode()) return;

  const supabase = createClient();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (stripePaymentIntentId) updates.stripe_payment_intent_id = stripePaymentIntentId;
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Error actualizando order: ${error.message}`);
}

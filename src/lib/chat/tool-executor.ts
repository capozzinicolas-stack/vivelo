import { getServices, getServiceById, checkVendorAvailability } from '@/lib/supabase/queries';
import { resolveBuffers, calculateEffectiveTimes } from '@/lib/availability';
import type { ChatServiceCard } from '@/types/chat';

interface ToolResult {
  text: string;
  serviceCards?: ChatServiceCard[];
}

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case 'search_services':
      return searchServices(toolInput);
    case 'get_service_details':
      return getServiceDetails(toolInput);
    case 'check_availability':
      return checkAvailability(toolInput);
    case 'calculate_price':
      return calculatePrice(toolInput);
    default:
      return { text: JSON.stringify({ error: `Tool desconocido: ${toolName}` }) };
  }
}

async function searchServices(input: Record<string, unknown>): Promise<ToolResult> {
  const services = await getServices({
    category: input.category as string | undefined,
    zone: input.zone as string | undefined,
    minPrice: input.min_price as number | undefined,
    maxPrice: input.max_price as number | undefined,
    search: input.search as string | undefined,
  });

  const limited = services.slice(0, 10);

  const serviceCards: ChatServiceCard[] = limited.map((s) => ({
    id: s.id,
    title: s.title,
    base_price: s.base_price,
    price_unit: s.price_unit,
    category: s.category,
    avg_rating: s.avg_rating,
    review_count: s.review_count,
    zones: s.zones,
    image: s.images?.[0] ?? null,
    provider_name: s.provider?.full_name ?? s.provider?.company_name ?? null,
  }));

  const summary = limited.map((s) => ({
    id: s.id,
    title: s.title,
    base_price: s.base_price,
    price_unit: s.price_unit,
    category: s.category,
    avg_rating: s.avg_rating,
    review_count: s.review_count,
    zones: s.zones,
    min_guests: s.min_guests,
    max_guests: s.max_guests,
    provider_name: s.provider?.full_name ?? s.provider?.company_name ?? null,
  }));

  return {
    text: JSON.stringify({
      total_found: services.length,
      showing: limited.length,
      services: summary,
    }),
    serviceCards,
  };
}

async function getServiceDetails(input: Record<string, unknown>): Promise<ToolResult> {
  const service = await getServiceById(input.service_id as string);
  if (!service) {
    return { text: JSON.stringify({ error: 'Servicio no encontrado' }) };
  }

  const card: ChatServiceCard = {
    id: service.id,
    title: service.title,
    base_price: service.base_price,
    price_unit: service.price_unit,
    category: service.category,
    avg_rating: service.avg_rating,
    review_count: service.review_count,
    zones: service.zones,
    image: service.images?.[0] ?? null,
    provider_name: service.provider?.full_name ?? service.provider?.company_name ?? null,
  };

  return {
    text: JSON.stringify({
      id: service.id,
      title: service.title,
      description: service.description,
      base_price: service.base_price,
      price_unit: service.price_unit,
      category: service.category,
      min_guests: service.min_guests,
      max_guests: service.max_guests,
      min_hours: service.min_hours,
      max_hours: service.max_hours,
      zones: service.zones,
      avg_rating: service.avg_rating,
      review_count: service.review_count,
      provider_name: service.provider?.full_name ?? service.provider?.company_name ?? null,
      extras: (service.extras ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        price: e.price,
        price_type: e.price_type,
      })),
    }),
    serviceCards: [card],
  };
}

async function checkAvailability(input: Record<string, unknown>): Promise<ToolResult> {
  const serviceId = input.service_id as string;
  const date = input.date as string;
  const startTime = input.start_time as string;
  const endTime = input.end_time as string;

  const service = await getServiceById(serviceId);
  if (!service) {
    return { text: JSON.stringify({ error: 'Servicio no encontrado' }) };
  }

  const buffers = resolveBuffers(service, service.provider);
  const times = calculateEffectiveTimes({
    eventDate: date,
    startTime,
    endTime,
    bufferBeforeMinutes: buffers.bufferBeforeMinutes,
    bufferAfterMinutes: buffers.bufferAfterMinutes,
  });

  const result = await checkVendorAvailability(
    service.provider_id,
    times.effective_start,
    times.effective_end
  );

  return {
    text: JSON.stringify({
      service_title: service.title,
      date,
      start_time: startTime,
      end_time: endTime,
      available: result.available,
      reason: !result.available
        ? result.has_calendar_block
          ? 'El proveedor tiene un bloqueo en ese horario'
          : `El proveedor ya tiene ${result.overlapping_bookings} reserva(s) en ese horario`
        : null,
    }),
  };
}

async function calculatePrice(input: Record<string, unknown>): Promise<ToolResult> {
  const serviceId = input.service_id as string;
  const guestCount = (input.guest_count as number) || 0;
  const hours = (input.hours as number) || 0;

  const service = await getServiceById(serviceId);
  if (!service) {
    return { text: JSON.stringify({ error: 'Servicio no encontrado' }) };
  }

  let baseTotal = 0;
  switch (service.price_unit) {
    case 'por evento':
      baseTotal = service.base_price;
      break;
    case 'por persona':
      baseTotal = service.base_price * (guestCount || service.min_guests);
      break;
    case 'por hora':
      baseTotal = service.base_price * (hours || service.min_hours);
      break;
    default:
      baseTotal = service.base_price;
  }

  return {
    text: JSON.stringify({
      service_title: service.title,
      price_unit: service.price_unit,
      base_price: service.base_price,
      guest_count: guestCount || null,
      hours: hours || null,
      estimated_total: Math.round(baseTotal * 100) / 100,
      note: 'Este es un estimado base. Los extras se agregan desde la página del servicio.',
      extras_available: (service.extras ?? []).map((e) => ({
        name: e.name,
        price: e.price,
        price_type: e.price_type,
      })),
    }),
  };
}

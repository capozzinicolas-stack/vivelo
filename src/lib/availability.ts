export interface EffectiveTimesInput {
  eventDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
}

export interface EffectiveTimesResult {
  start_datetime: string;
  end_datetime: string;
  effective_start: string;
  effective_end: string;
}

export function calculateEffectiveTimes({
  eventDate,
  startTime,
  endTime,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
}: EffectiveTimesInput): EffectiveTimesResult {
  const start = new Date(`${eventDate}T${startTime}:00`);
  const end = new Date(`${eventDate}T${endTime}:00`);

  const effectiveStart = new Date(start.getTime() - bufferBeforeMinutes * 60 * 1000);
  const effectiveEnd = new Date(end.getTime() + bufferAfterMinutes * 60 * 1000);

  return {
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    effective_start: effectiveStart.toISOString(),
    effective_end: effectiveEnd.toISOString(),
  };
}

import type { Service, Profile } from '@/types/database';

export function resolveBuffers(
  service: Service,
  provider?: Profile
): { bufferBeforeMinutes: number; bufferAfterMinutes: number } {
  if (provider?.apply_buffers_to_all) {
    return {
      bufferBeforeMinutes: provider.global_buffer_before_minutes || 0,
      bufferAfterMinutes: provider.global_buffer_after_minutes || 0,
    };
  }
  return {
    bufferBeforeMinutes: service.buffer_before_minutes || 0,
    bufferAfterMinutes: service.buffer_after_minutes || 0,
  };
}

export function resolveEventHours(
  service: Service,
  startTime: string,
  endTime: string
): number {
  if (service.price_unit === 'por evento' && service.base_event_hours) {
    return service.base_event_hours;
  }
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(diff / 60, 0.5);
}

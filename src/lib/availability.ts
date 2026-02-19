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

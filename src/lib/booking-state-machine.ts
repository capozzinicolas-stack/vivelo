import type { BookingStatus } from '@/types/database';

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['in_review', 'completed', 'cancelled'],
  in_review: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(from: BookingStatus): BookingStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

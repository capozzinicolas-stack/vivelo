export const COMMISSION_RATE = 0.12;

export const ZONES = [
  'San Juan',
  'Bayamon',
  'Carolina',
  'Ponce',
  'Caguas',
  'Mayaguez',
  'Arecibo',
  'Guaynabo',
  'Toa Baja',
  'Trujillo Alto',
] as const;

export const CANCELLATION_POLICY = {
  FULL_REFUND_DAYS: 15,
  PARTIAL_30_DAYS: 14,
  PARTIAL_50_DAYS: 7,
  NO_REFUND_HOURS: 48,
} as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_review: 'En Revisión',
  completed: 'Completada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  in_review: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};

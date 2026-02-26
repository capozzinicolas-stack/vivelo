import type { CancellationPolicy } from '@/types/database';

export const mockCancellationPolicies: CancellationPolicy[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    name: 'Flexible',
    description: 'Politica flexible con reembolso completo hasta 48 horas antes del evento.',
    rules: [
      { min_hours: 48, max_hours: null, refund_percent: 100 },
      { min_hours: 0, max_hours: 48, refund_percent: 50 },
    ],
    is_default: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    name: 'Moderada',
    description: 'Politica moderada con reembolso parcial segun el tiempo de anticipacion.',
    rules: [
      { min_hours: 168, max_hours: null, refund_percent: 100 },
      { min_hours: 48, max_hours: 168, refund_percent: 50 },
      { min_hours: 0, max_hours: 48, refund_percent: 0 },
    ],
    is_default: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    name: 'Estricta',
    description: 'Politica estricta con ventanas de reembolso limitadas.',
    rules: [
      { min_hours: 360, max_hours: null, refund_percent: 100 },
      { min_hours: 168, max_hours: 360, refund_percent: 25 },
      { min_hours: 0, max_hours: 168, refund_percent: 0 },
    ],
    is_default: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

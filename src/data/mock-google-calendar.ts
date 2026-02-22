import type { GoogleCalendarConnection } from '@/types/database';

export const mockGoogleCalendarConnection: GoogleCalendarConnection = {
  id: '50000000-0000-0000-0000-000000000001',
  provider_id: '00000000-0000-0000-0000-000000000002',
  access_token_encrypted: 'mock-encrypted-token',
  refresh_token_encrypted: 'mock-encrypted-refresh',
  token_expiry: '2026-12-31T23:59:59Z',
  vivelo_calendar_id: 'mock-vivelo-calendar-id',
  google_email: 'carlos.rivera@gmail.com',
  last_sync_at: '2026-02-22T10:30:00Z',
  sync_status: 'active',
  sync_error: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-22T10:30:00Z',
};

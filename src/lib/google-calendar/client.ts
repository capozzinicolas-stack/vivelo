import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { encryptToken, decryptToken } from './encryption';
import { createClient } from '@supabase/supabase-js';

const isMockMode = () => !process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'placeholder';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function createOAuth2Client(): OAuth2Client | null {
  if (isMockMode()) return null;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
  );
}

export function getAuthUrl(state: string): string | null {
  const client = createOAuth2Client();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}

export async function exchangeCodeAndStore(code: string, providerId: string): Promise<{ email: string }> {
  const client = createOAuth2Client();
  if (!client) throw new Error('Google OAuth not configured');

  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Missing tokens from Google OAuth exchange');
  }

  // Get user email
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: userInfo } = await oauth2.userinfo.get();
  const email = userInfo.email || 'unknown';

  // Encrypt and store
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('google_calendar_connections').upsert({
    provider_id: providerId,
    access_token_encrypted: encryptToken(tokens.access_token),
    refresh_token_encrypted: encryptToken(tokens.refresh_token),
    token_expiry: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
    google_email: email,
    sync_status: 'active',
    sync_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'provider_id' });

  if (error) throw new Error(`Error storing connection: ${error.message}`);
  return { email };
}

export async function getCalendarClient(providerId: string): Promise<calendar_v3.Calendar | null> {
  if (isMockMode()) return null;

  const supabase = getSupabaseAdmin();
  const { data: conn, error } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('provider_id', providerId)
    .eq('sync_status', 'active')
    .single();

  if (error || !conn) return null;

  const client = createOAuth2Client();
  if (!client) return null;

  client.setCredentials({
    access_token: decryptToken(conn.access_token_encrypted),
    refresh_token: decryptToken(conn.refresh_token_encrypted),
    expiry_date: new Date(conn.token_expiry).getTime(),
  });

  // Listen for token refresh to persist new tokens
  client.on('tokens', async (tokens) => {
    const updates: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (tokens.access_token) {
      updates.access_token_encrypted = encryptToken(tokens.access_token);
    }
    if (tokens.refresh_token) {
      updates.refresh_token_encrypted = encryptToken(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updates.token_expiry = new Date(tokens.expiry_date).toISOString();
    }
    await supabase
      .from('google_calendar_connections')
      .update(updates)
      .eq('provider_id', providerId);
  });

  return google.calendar({ version: 'v3', auth: client });
}

export async function ensureViveloCalendar(providerId: string): Promise<string | null> {
  const calendar = await getCalendarClient(providerId);
  if (!calendar) return null;

  const supabase = getSupabaseAdmin();
  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('vivelo_calendar_id')
    .eq('provider_id', providerId)
    .single();

  // Check if calendar already exists
  if (conn?.vivelo_calendar_id) {
    try {
      await calendar.calendars.get({ calendarId: conn.vivelo_calendar_id });
      return conn.vivelo_calendar_id;
    } catch {
      // Calendar was deleted externally, create a new one
    }
  }

  // Create new calendar
  const { data: newCal } = await calendar.calendars.insert({
    requestBody: {
      summary: 'Vivelo - Mis Eventos',
      description: 'Reservas confirmadas de Vivelo',
      timeZone: 'America/Mexico_City',
    },
  });

  const calendarId = newCal?.id;
  if (calendarId) {
    await supabase
      .from('google_calendar_connections')
      .update({ vivelo_calendar_id: calendarId, updated_at: new Date().toISOString() })
      .eq('provider_id', providerId);
  }

  return calendarId || null;
}

export async function disconnectGoogle(providerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Delete google_sync blocks
  await supabase
    .from('vendor_calendar_blocks')
    .delete()
    .eq('vendor_id', providerId)
    .eq('source', 'google_sync');

  // Remove connection
  await supabase
    .from('google_calendar_connections')
    .delete()
    .eq('provider_id', providerId);
}

export async function getConnection(providerId: string) {
  if (isMockMode()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('provider_id', providerId)
    .single();

  if (error || !data) return null;
  return data;
}

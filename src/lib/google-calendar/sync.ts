import { getCalendarClient, ensureViveloCalendar, getConnection } from './client';
import { createClient } from '@supabase/supabase-js';
import type { Booking } from '@/types/database';

const isMockMode = () => !process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'placeholder';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Push a confirmed booking to the provider's "Vivelo" calendar in Google
 */
export async function pushBookingToGoogle(booking: Booking & { service?: { title?: string } }): Promise<string | null> {
  if (isMockMode()) return 'mock-event-id';

  const calendar = await getCalendarClient(booking.provider_id);
  if (!calendar) return null;

  const calendarId = await ensureViveloCalendar(booking.provider_id);
  if (!calendarId) return null;

  const summary = `Vivelo: ${booking.service?.title || 'Reserva'}`;
  const description = [
    `Reserva Vivelo #${booking.id.slice(0, 8)}`,
    booking.guest_count > 0 ? `Invitados: ${booking.guest_count}` : null,
    booking.notes ? `Notas: ${booking.notes}` : null,
  ].filter(Boolean).join('\n');

  const startDateTime = booking.start_datetime || `${booking.event_date}T${booking.start_time}:00`;
  const endDateTime = booking.end_datetime || `${booking.event_date}T${booking.end_time}:00`;

  try {
    // Check if event already exists (update case)
    if (booking.google_calendar_event_id) {
      const { data: updated } = await calendar.events.update({
        calendarId,
        eventId: booking.google_calendar_event_id,
        requestBody: {
          summary,
          description,
          start: { dateTime: startDateTime, timeZone: 'America/Mexico_City' },
          end: { dateTime: endDateTime, timeZone: 'America/Mexico_City' },
        },
      });
      return updated?.id || booking.google_calendar_event_id;
    }

    // Create new event
    const { data: event } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: 'America/Mexico_City' },
        end: { dateTime: endDateTime, timeZone: 'America/Mexico_City' },
      },
    });

    const eventId = event?.id;
    if (eventId) {
      // Store event ID on the booking
      const supabase = getSupabaseAdmin();
      await supabase
        .from('bookings')
        .update({ google_calendar_event_id: eventId })
        .eq('id', booking.id);
    }
    return eventId || null;
  } catch (err) {
    console.error('[pushBookingToGoogle] Failed:', err);
    return null;
  }
}

/**
 * Delete a booking's event from Google Calendar (on cancellation)
 */
export async function deleteBookingFromGoogle(booking: Booking): Promise<void> {
  if (isMockMode()) return;
  if (!booking.google_calendar_event_id) return;

  const calendar = await getCalendarClient(booking.provider_id);
  if (!calendar) return;

  const conn = await getConnection(booking.provider_id);
  if (!conn?.vivelo_calendar_id) return;

  try {
    await calendar.events.delete({
      calendarId: conn.vivelo_calendar_id,
      eventId: booking.google_calendar_event_id,
    });
  } catch (err) {
    console.error('[deleteBookingFromGoogle] Failed:', err);
  }
}

/**
 * Sync events from the provider's primary Google Calendar into Vivelo as blocks.
 * Reads 90 days of events, creates/updates/deletes blocks with source=google_sync.
 */
export async function syncGoogleEventsToVivelo(providerId: string): Promise<{ synced: number; deleted: number }> {
  if (isMockMode()) return { synced: 3, deleted: 0 };

  const calendar = await getCalendarClient(providerId);
  if (!calendar) return { synced: 0, deleted: 0 };

  const supabase = getSupabaseAdmin();

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch events from primary calendar
    const { data: eventList } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const googleEvents = eventList?.items || [];
    const googleEventIds = new Set<string>();

    let synced = 0;
    for (const event of googleEvents) {
      if (!event.id || !event.start || !event.end) continue;
      // Skip all-day events without dateTime
      const startDt = event.start.dateTime || event.start.date;
      const endDt = event.end.dateTime || event.end.date;
      if (!startDt || !endDt) continue;

      googleEventIds.add(event.id);

      // For all-day events, use full day timestamps
      const startIso = event.start.dateTime
        ? new Date(event.start.dateTime).toISOString()
        : new Date(`${event.start.date}T00:00:00`).toISOString();
      const endIso = event.end.dateTime
        ? new Date(event.end.dateTime).toISOString()
        : new Date(`${event.end.date}T23:59:59`).toISOString();

      // Check if block already exists for this google event
      const { data: existing } = await supabase
        .from('vendor_calendar_blocks')
        .select('id')
        .eq('vendor_id', providerId)
        .eq('google_event_id', event.id)
        .single();

      if (existing) {
        // Update existing block
        await supabase
          .from('vendor_calendar_blocks')
          .update({
            start_datetime: startIso,
            end_datetime: endIso,
            reason: event.summary || 'Google Calendar',
          })
          .eq('id', existing.id);
      } else {
        // Create new block
        await supabase
          .from('vendor_calendar_blocks')
          .insert({
            vendor_id: providerId,
            start_datetime: startIso,
            end_datetime: endIso,
            reason: event.summary || 'Google Calendar',
            google_event_id: event.id,
            source: 'google_sync',
          });
      }
      synced++;
    }

    // Delete blocks for events that no longer exist in Google
    const { data: existingBlocks } = await supabase
      .from('vendor_calendar_blocks')
      .select('id, google_event_id')
      .eq('vendor_id', providerId)
      .eq('source', 'google_sync');

    let deleted = 0;
    for (const block of (existingBlocks || [])) {
      if (block.google_event_id && !googleEventIds.has(block.google_event_id)) {
        await supabase.from('vendor_calendar_blocks').delete().eq('id', block.id);
        deleted++;
      }
    }

    // Update sync status
    await supabase
      .from('google_calendar_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'active',
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', providerId);

    return { synced, deleted };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[syncGoogleEventsToVivelo] Failed:', message);

    // Mark connection as error
    await supabase
      .from('google_calendar_connections')
      .update({
        sync_status: 'error',
        sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', providerId);

    return { synced: 0, deleted: 0 };
  }
}

import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendEventReminder } from '@/lib/email';
import { waClientEventReminder, waProviderEventReminder } from '@/lib/whatsapp';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  // Get tomorrow's date in Mexico City timezone
  const now = new Date();
  const mexicoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const tomorrow = new Date(mexicoDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`[SendEventReminders] Checking bookings for date: ${tomorrowStr}`);

  // Find confirmed bookings for tomorrow
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      client_id,
      provider_id,
      service_id,
      event_date,
      start_time,
      event_address,
      client:profiles!bookings_client_id_fkey(full_name, email, phone),
      service:services(title)
    `)
    .eq('event_date', tomorrowStr)
    .eq('status', 'confirmed');

  if (error) {
    console.error('[SendEventReminders] Error fetching bookings:', error);
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    console.log('[SendEventReminders] No bookings found for tomorrow');
    return NextResponse.json({ processed: 0 });
  }

  console.log(`[SendEventReminders] Found ${bookings.length} bookings to remind`);

  let processed = 0;
  for (const booking of bookings) {
    const client = booking.client as unknown as { full_name: string; email: string; phone: string | null } | null;
    const service = booking.service as unknown as { title: string } | null;

    if (!client) continue;

    const eventDateFormatted = new Date(booking.event_date).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Send email reminder
    if (client.email) {
      try {
        await sendEventReminder({
          clientName: client.full_name || 'Cliente',
          clientEmail: client.email,
          serviceTitle: service?.title || 'Servicio',
          eventDate: eventDateFormatted,
          startTime: booking.start_time || '',
          address: (booking as Record<string, unknown>).event_address as string || '',
        });
      } catch (err) {
        console.error(`[SendEventReminders] Email failed for booking ${booking.id}:`, err);
      }
    }

    // Send WhatsApp reminders (non-blocking)
    const serviceTitle = service?.title || 'Servicio';
    const address = (booking as Record<string, unknown>).event_address as string || 'Ver detalles en tu panel';

    try {
      waClientEventReminder({
        bookingId: booking.id,
        serviceId: booking.service_id,
        serviceTitle,
        clientId: booking.client_id,
        clientPhone: client.phone,
        clientName: client.full_name || 'Cliente',
        eventDate: eventDateFormatted,
        startTime: booking.start_time || '',
        address,
      });
    } catch (err) {
      console.error(`[SendEventReminders] Client WhatsApp failed for booking ${booking.id}:`, err);
    }

    // Provider reminder
    try {
      const { data: provider } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', (booking as Record<string, unknown>).provider_id as string)
        .single();

      if (provider?.phone) {
        waProviderEventReminder({
          providerId: (booking as Record<string, unknown>).provider_id as string,
          providerPhone: provider.phone,
          providerName: provider.full_name || 'Proveedor',
          serviceTitle,
          serviceId: booking.service_id,
          eventDate: eventDateFormatted,
          startTime: booking.start_time || '',
          address,
          bookingId: booking.id,
        });
      }
    } catch (err) {
      console.error(`[SendEventReminders] Provider WhatsApp failed for booking ${booking.id}:`, err);
    }

    processed++;
  }

  console.log(`[SendEventReminders] Processed ${processed} bookings`);
  return NextResponse.json({ processed });
}

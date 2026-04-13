import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendEventCodes } from '@/lib/email';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  // Get today's date in Mexico City timezone (UTC-6)
  const now = new Date();
  const mexicoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const today = mexicoDate.toISOString().split('T')[0];

  console.log(`[SendEventCodes] Checking bookings for date: ${today}`);

  // Find bookings for today that are confirmed and don't have codes yet
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, client_id, provider_id, service_id, event_date, service:services(title), client:profiles!bookings_client_id_fkey(full_name, email, phone)')
    .eq('event_date', today)
    .eq('status', 'confirmed')
    .is('start_code', null);

  if (error) {
    console.error('[SendEventCodes] Error fetching bookings:', error);
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    console.log('[SendEventCodes] No bookings found for today');
    return NextResponse.json({ processed: 0 });
  }

  console.log(`[SendEventCodes] Found ${bookings.length} bookings to process`);

  let processed = 0;
  for (const booking of bookings) {
    const startCode = generateCode();
    const endCode = generateCode();

    // Save codes to DB
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ start_code: startCode, end_code: endCode })
      .eq('id', booking.id);

    if (updateError) {
      console.error(`[SendEventCodes] Error updating booking ${booking.id}:`, updateError);
      continue;
    }

    // Send email to client
    const client = booking.client as unknown as { full_name: string; email: string; phone: string | null } | null;
    const service = booking.service as unknown as { title: string } | null;

    if (client?.email) {
      await sendEventCodes({
        clientName: client.full_name || 'Cliente',
        clientEmail: client.email,
        serviceTitle: service?.title || 'Servicio',
        eventDate: new Date(booking.event_date).toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        startCode,
        endCode,
      });
    }

    // Send WhatsApp with verification codes + provider start code (non-blocking)
    try {
      const { waClientVerificationCodes, waProviderStartCode } = await import('@/lib/whatsapp');
      const serviceTitle = service?.title || 'Servicio';

      waClientVerificationCodes({
        bookingId: booking.id,
        serviceId: booking.service_id,
        serviceTitle,
        clientId: booking.client_id,
        clientPhone: client?.phone || null,
        clientName: client?.full_name || 'Cliente',
        startCode,
        endCode,
      });

      // Notify provider with start code
      const { data: provider } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', (booking as Record<string, unknown>).provider_id as string)
        .single();

      if (provider?.phone) {
        waProviderStartCode({
          providerId: (booking as Record<string, unknown>).provider_id as string,
          providerPhone: provider.phone,
          providerName: provider.full_name || 'Proveedor',
          serviceTitle,
          serviceId: booking.service_id,
          startCode,
          bookingId: booking.id,
        });
      }
    } catch (waErr) {
      console.error(`[SendEventCodes] WhatsApp failed for booking ${booking.id}:`, waErr);
    }

    processed++;
  }

  console.log(`[SendEventCodes] Processed ${processed} bookings`);
  return NextResponse.json({ processed });
}

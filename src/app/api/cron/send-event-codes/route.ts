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
    .select('id, client_id, event_date, service:services(title), client:profiles!bookings_client_id_fkey(full_name, email)')
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
    const client = booking.client as unknown as { full_name: string; email: string } | null;
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

    processed++;
  }

  console.log(`[SendEventCodes] Processed ${processed} bookings`);
  return NextResponse.json({ processed });
}

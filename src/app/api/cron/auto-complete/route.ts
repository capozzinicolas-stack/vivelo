import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  console.log(`[AutoComplete] Checking for expired bookings at ${now}`);

  // Find in_progress bookings past their deadline
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, client_id, service:services(title)')
    .eq('status', 'in_progress')
    .lt('end_code_deadline', now);

  if (error) {
    console.error('[AutoComplete] Error fetching bookings:', error);
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    console.log('[AutoComplete] No expired bookings found');
    return NextResponse.json({ processed: 0 });
  }

  console.log(`[AutoComplete] Found ${bookings.length} bookings to auto-complete`);

  let processed = 0;
  for (const booking of bookings) {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        auto_completed: true,
        end_code_used_at: now,
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error(`[AutoComplete] Error updating booking ${booking.id}:`, updateError);
      continue;
    }

    // Create notification for client to leave review
    const service = booking.service as unknown as { title: string } | null;
    try {
      await supabase.from('notifications').insert({
        recipient_id: booking.client_id,
        type: 'system',
        title: 'Deja tu opinion!',
        message: `Tu servicio "${service?.title || 'Servicio'}" ha sido completado. Cuentanos como fue tu experiencia.`,
        link: '/dashboard/cliente/reservas',
      });
    } catch (err) {
      console.error(`[AutoComplete] Error creating notification for booking ${booking.id}:`, err);
    }

    processed++;
  }

  console.log(`[AutoComplete] Processed ${processed} bookings`);
  return NextResponse.json({ processed });
}

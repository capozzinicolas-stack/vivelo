import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushBookingToGoogle, deleteBookingFromGoogle } from '@/lib/google-calendar/sync';
import type { Booking } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, action } = await request.json() as {
      bookingId: string;
      action: 'confirmed' | 'cancelled';
    };

    if (!bookingId || !action) {
      return NextResponse.json({ error: 'bookingId and action required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, service:services(title)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (action === 'confirmed') {
      const eventId = await pushBookingToGoogle(booking as Booking);
      return NextResponse.json({ success: true, eventId });
    } else if (action === 'cancelled') {
      await deleteBookingFromGoogle(booking as Booking);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[onBookingUpdate] Error:', err);
    return NextResponse.json({ error: 'Error processing booking update' }, { status: 500 });
  }
}

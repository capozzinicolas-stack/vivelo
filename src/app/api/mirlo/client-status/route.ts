import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const MIRLO_WEBHOOK_SECRET = process.env.MIRLO_WEBHOOK_SECRET?.trim();

export async function GET(request: NextRequest) {
  // Auth via shared secret
  const secret = request.headers.get('X-Mirlo-Secret');
  if (!MIRLO_WEBHOOK_SECRET || secret !== MIRLO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ error: 'phone query param required' }, { status: 400 });
  }

  // Strip +52 prefix to match profiles.phone (10 digits)
  const digits = phone.replace(/\D/g, '');
  const phone10 = digits.startsWith('52') && digits.length === 12 ? digits.slice(2) : digits;

  const supabase = createAdminSupabaseClient();

  // Find client profile by phone
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at, phone')
    .eq('phone', phone10)
    .eq('role', 'client')
    .single();

  if (!profile) {
    return NextResponse.json({ found: false });
  }

  // Count bookings
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', profile.id);

  // Last booking date
  const { data: lastBooking } = await supabase
    .from('bookings')
    .select('created_at')
    .eq('client_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    found: true,
    client_id: profile.id,
    name: profile.full_name,
    has_bookings: (totalBookings ?? 0) > 0,
    total_bookings: totalBookings ?? 0,
    last_booking_date: lastBooking?.created_at ?? null,
    registration_date: profile.created_at,
  });
}

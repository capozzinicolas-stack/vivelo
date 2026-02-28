import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, CreateReviewSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { profile } = auth;

  if (profile.role !== 'client') {
    return NextResponse.json({ error: 'Solo clientes pueden dejar reviews' }, { status: 403 });
  }

  const { data, error } = await validateBody(request, CreateReviewSchema);
  if (error || !data) {
    return NextResponse.json({ error: error || 'Datos invalidos' }, { status: 400 });
  }

  const { bookingId, rating, comment, photos, videos } = data;
  const supabase = createAdminSupabaseClient();

  // Fetch booking and validate
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, client_id, service_id, status')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  if (booking.client_id !== profile.id) {
    return NextResponse.json({ error: 'Esta reserva no te pertenece' }, { status: 403 });
  }

  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'Solo puedes dejar review en reservas completadas' }, { status: 400 });
  }

  // Check if review already exists for this booking
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Ya dejaste una review para esta reserva' }, { status: 400 });
  }

  // Create review with pending status
  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      service_id: booking.service_id,
      client_id: profile.id,
      booking_id: bookingId,
      rating,
      comment: comment || null,
      status: 'pending',
      photos: photos || [],
      videos: videos || [],
      created_by_admin: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Reviews] Error creating review:', insertError);
    return NextResponse.json({ error: 'Error al crear la review' }, { status: 500 });
  }

  return NextResponse.json({ success: true, review });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isValidTransition } from '@/lib/booking-state-machine';
import type { BookingStatus } from '@/types/database';

const schema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'in_progress', 'in_review', 'rejected']),
});

export async function PATCH(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { bookingId, status: newStatus } = schema.parse(body);

    const supabase = createAdminSupabaseClient();

    // Fetch current status
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (!isValidTransition(booking.status as BookingStatus, newStatus as BookingStatus)) {
      return NextResponse.json(
        { error: `Transicion invalida: ${booking.status} -> ${newStatus}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Admin Bookings] Update error:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la reserva' }, { status: 500 });
    }

    // WhatsApp notifications for rejected bookings (non-blocking)
    if (newStatus === 'rejected') {
      try {
        const { waClientBookingRejected, waProviderBookingRejected } = await import('@/lib/whatsapp');

        const { data: fullBooking } = await supabase
          .from('bookings')
          .select('client_id, provider_id, service_id, service:services(title)')
          .eq('id', bookingId)
          .single();

        if (fullBooking) {
          const serviceTitle = (fullBooking.service as unknown as { title: string } | null)?.title || 'Servicio';

          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', fullBooking.client_id)
            .single();

          const { data: providerProfile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', fullBooking.provider_id)
            .single();

          if (clientProfile?.phone) {
            waClientBookingRejected({
              clientId: fullBooking.client_id,
              clientPhone: clientProfile.phone,
              clientName: clientProfile.full_name || 'Cliente',
              serviceTitle,
              serviceId: fullBooking.service_id,
              bookingId,
            });
          }

          if (providerProfile?.phone) {
            waProviderBookingRejected({
              providerId: fullBooking.provider_id,
              providerPhone: providerProfile.phone,
              providerName: providerProfile.full_name || 'Proveedor',
              serviceTitle,
              serviceId: fullBooking.service_id,
              clientName: clientProfile?.full_name || 'Cliente',
              bookingId,
            });
          }
        }
      } catch (waErr) {
        console.error('[Admin Bookings] WhatsApp rejected notification failed:', waErr);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 });
    }
    console.error('[Admin Bookings] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

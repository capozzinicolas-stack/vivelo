import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, VerifyCodeSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/supabase/queries';

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { profile } = auth;

  const { data, error } = await validateBody(request, VerifyCodeSchema);
  if (error || !data) {
    return NextResponse.json({ error: error || 'Datos invalidos' }, { status: 400 });
  }

  const { bookingId, code, type } = data;
  const supabaseAdmin = createAdminSupabaseClient();

  // Fetch booking
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('*, service:services(title), client:profiles!bookings_client_id_fkey(id, full_name)')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  if (type === 'start') {
    // Provider verifies start code
    if (booking.provider_id !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el proveedor puede verificar el codigo de inicio' }, { status: 403 });
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json({ error: 'La reserva debe estar confirmada para verificar el codigo de inicio' }, { status: 400 });
    }

    if (!booking.start_code) {
      return NextResponse.json({ error: 'Los codigos aun no han sido generados para esta reserva' }, { status: 400 });
    }

    if (code !== booking.start_code) {
      return NextResponse.json({ error: 'Codigo de inicio incorrecto' }, { status: 400 });
    }

    // Calculate deadline: event_date + 3 business days
    const eventDate = new Date(booking.event_date);
    const deadline = addBusinessDays(eventDate, 3);

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'in_progress',
        start_code_used_at: new Date().toISOString(),
        end_code_deadline: deadline.toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[VerifyCode] Error updating booking:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la reserva' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio iniciado correctamente',
      newStatus: 'in_progress',
    });
  }

  if (type === 'end') {
    // Client verifies end code
    if (booking.client_id !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el cliente puede verificar el codigo de cierre' }, { status: 403 });
    }

    if (booking.status !== 'in_progress') {
      return NextResponse.json({ error: 'La reserva debe estar en progreso para verificar el codigo de cierre' }, { status: 400 });
    }

    if (code !== booking.end_code) {
      return NextResponse.json({ error: 'Codigo de cierre incorrecto' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'completed',
        end_code_used_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[VerifyCode] Error updating booking:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la reserva' }, { status: 500 });
    }

    // Create notification for client to leave review
    try {
      await createNotification({
        recipient_id: booking.client_id,
        type: 'system',
        title: 'Deja tu opinion!',
        message: `Tu servicio "${booking.service?.title || 'Servicio'}" ha sido completado. Cuentanos como fue tu experiencia.`,
        link: '/dashboard/cliente/reservas',
      });
    } catch (err) {
      console.error('[VerifyCode] Error creating review notification:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio completado correctamente',
      newStatus: 'completed',
    });
  }

  return NextResponse.json({ error: 'Tipo de verificacion invalido' }, { status: 400 });
}

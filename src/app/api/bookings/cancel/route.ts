import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { calculateRefund } from '@/lib/cancellation';
import type { CancellationPolicy, CancellationRule } from '@/types/database';

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, cancelledBy } = await request.json();

    if (!bookingId || !cancelledBy) {
      return NextResponse.json(
        { error: 'bookingId y cancelledBy son requeridos' },
        { status: 400 },
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const isMock = !secretKey || secretKey === 'sk_test_placeholder';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isMockDb = !supabaseUrl || supabaseUrl.includes('placeholder');

    // 1. Load booking with service (including cancellation policy)
    let booking: Record<string, unknown>;

    if (isMockDb) {
      // Mock mode: import mock data
      const { mockBookings } = await import('@/data/mock-bookings');
      const { mockServices } = await import('@/data/mock-services');
      const found = mockBookings.find(b => b.id === bookingId);
      if (!found) {
        return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
      }
      const service = mockServices.find(s => s.id === found.service_id);
      booking = { ...found, service } as unknown as Record<string, unknown>;
    } else {
      const supabase = createAdminSupabase();
      const { data, error } = await supabase
        .from('bookings')
        .select('*, service:services(*, cancellation_policy:cancellation_policies(*))')
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
      }
      booking = data;
    }

    // 2. Validate booking can be cancelled
    const status = booking.status as string;
    if (status === 'cancelled') {
      return NextResponse.json({ error: 'La reserva ya esta cancelada' }, { status: 400 });
    }
    if (status === 'completed') {
      return NextResponse.json({ error: 'No se puede cancelar una reserva completada' }, { status: 400 });
    }

    // 3. Resolve cancellation policy (snapshot > service policy > default fallback)
    let policy: CancellationPolicy | { rules: CancellationRule[] } | null = null;

    // First: try the snapshot stored at booking time
    const snapshot = booking.cancellation_policy_snapshot as Record<string, unknown> | null;
    if (snapshot && Array.isArray(snapshot.rules)) {
      policy = snapshot as unknown as CancellationPolicy;
    }

    // Second: try the service's cancellation policy
    if (!policy) {
      const service = booking.service as Record<string, unknown> | undefined;
      if (service?.cancellation_policy) {
        policy = service.cancellation_policy as CancellationPolicy;
      } else if (service?.cancellation_policy_id && !isMockDb) {
        // Load the policy directly
        const supabase = createAdminSupabase();
        const { data: policyData } = await supabase
          .from('cancellation_policies')
          .select('*')
          .eq('id', service.cancellation_policy_id as string)
          .single();
        if (policyData) policy = policyData;
      }
    }

    // Third: if in mock mode and no policy found, load mock default
    if (!policy && isMockDb) {
      const { mockCancellationPolicies } = await import('@/data/mock-cancellation-policies');
      policy = mockCancellationPolicies.find(p => p.is_default) || mockCancellationPolicies[0];
    }

    // 4. Calculate refund
    const totalAmount = booking.total as number;
    const eventDate = (booking.start_datetime as string) || `${booking.event_date}T${booking.start_time || '00:00'}:00`;

    let refund_percent = 0;
    let refund_amount = 0;

    if (policy) {
      const result = calculateRefund(policy, eventDate, totalAmount);
      refund_percent = result.refund_percent;
      refund_amount = result.refund_amount;
    }

    // 5. Process Stripe refund if applicable
    const stripePI = booking.stripe_payment_intent_id as string | null;
    let stripeRefundId: string | null = null;

    if (refund_amount > 0 && stripePI && !isMock) {
      const stripe = new Stripe(secretKey!);
      const refund = await stripe.refunds.create({
        payment_intent: stripePI,
        amount: Math.round(refund_amount * 100), // centavos MXN
      });
      stripeRefundId = refund.id;
      console.log(`[Cancel] Stripe refund created: ${refund.id}, amount: ${refund_amount} MXN`);
    } else if (isMock && refund_amount > 0) {
      console.log(`[Cancel Mock] Simulated refund: ${refund_amount} MXN (${refund_percent}%)`);
    }

    // 6. Build the policy snapshot to store (if not already present)
    const policySnapshot = snapshot || (policy ? {
      name: (policy as CancellationPolicy).name || 'Politica aplicada',
      rules: policy.rules,
    } : null);

    // 7. Update booking in DB
    if (!isMockDb) {
      const supabase = createAdminSupabase();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          refund_amount,
          refund_percent,
          cancellation_policy_snapshot: policySnapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('[Cancel] DB update failed:', updateError);
        return NextResponse.json(
          { error: 'Error actualizando la reserva' },
          { status: 500 },
        );
      }
    }

    // 8. Delete Google Calendar event (non-blocking)
    if (booking.google_calendar_event_id) {
      try {
        const { deleteBookingFromGoogle } = await import('@/lib/google-calendar/sync');
        await deleteBookingFromGoogle(booking as unknown as import('@/types/database').Booking);
      } catch (err) {
        console.error('[Cancel] Google Calendar delete failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      refund_amount,
      refund_percent,
      stripe_refund_id: stripeRefundId,
    });
  } catch (error) {
    console.error('[Cancel] Error:', error);
    return NextResponse.json(
      { error: 'Error procesando la cancelacion' },
      { status: 500 },
    );
  }
}

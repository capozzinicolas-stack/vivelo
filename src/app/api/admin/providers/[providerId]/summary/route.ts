import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/providers/[providerId]/summary
 *
 * Returns aggregated metrics for a provider:
 * - profile: basic info (name, email, phone, bio, verified, commission_rate, dates)
 * - services: total + breakdown by status
 * - bookings: total + breakdown by status + financials (revenue, commission, refunds, last booking)
 * - reviews: count + average rating
 *
 * Read-only. Does NOT touch checkout, snapshots, commission, or state machine.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { providerId } = await params;
  const supabase = createAdminSupabaseClient();

  // 1. Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, full_name, company_name, email, phone, bio, verified, commission_rate, created_at, early_adopter_ends_at, role'
    )
    .eq('id', providerId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  }

  if ((profile as { role: string }).role !== 'provider') {
    return NextResponse.json({ error: 'El usuario no es proveedor' }, { status: 400 });
  }

  // 2. Services aggregated by status
  const { data: servicesData } = await supabase
    .from('services')
    .select('id, status')
    .eq('provider_id', providerId);

  const services = servicesData || [];
  const servicesByStatus: Record<string, number> = {};
  for (const s of services) {
    const st = (s as { status: string }).status;
    servicesByStatus[st] = (servicesByStatus[st] || 0) + 1;
  }

  // 3. Bookings aggregated by status + financials
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('id, status, total, commission, refund_amount, event_date, created_at')
    .eq('provider_id', providerId);

  const bookings = bookingsData || [];
  const bookingsByStatus: Record<string, number> = {};
  let totalRevenue = 0;
  let totalCommission = 0;
  let totalRefunded = 0;
  let lastBookingDate: string | null = null;

  type BookingRow = {
    status: string;
    total: number | null;
    commission: number | null;
    refund_amount: number | null;
    event_date: string | null;
  };

  for (const b of bookings as BookingRow[]) {
    bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;

    // Only count revenue from non-cancelled/non-rejected bookings
    if (b.status !== 'cancelled' && b.status !== 'rejected') {
      totalRevenue += Number(b.total || 0);
      totalCommission += Number(b.commission || 0);
    } else if (b.status === 'cancelled' && b.refund_amount != null) {
      // For cancelled with partial refund, count retained portion
      const retained = Number(b.total || 0) - Number(b.refund_amount || 0);
      if (retained > 0) {
        totalRevenue += retained;
        totalCommission += Number(b.commission || 0);
      }
    }

    if (b.refund_amount != null) {
      totalRefunded += Number(b.refund_amount || 0);
    }

    if (b.event_date) {
      if (!lastBookingDate || b.event_date > lastBookingDate) {
        lastBookingDate = b.event_date;
      }
    }
  }

  const netToProvider = Math.round((totalRevenue - totalCommission) * 100) / 100;

  // 4. Reviews (joined via services.provider_id)
  const serviceIds = services.map(s => (s as { id: string }).id);
  let reviews: Array<{ rating: number }> = [];
  if (serviceIds.length > 0) {
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('rating')
      .in('service_id', serviceIds)
      .eq('status', 'approved');
    reviews = (reviewsData || []) as Array<{ rating: number }>;
  }
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewCount
      : 0;

  return NextResponse.json({
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      company_name: profile.company_name,
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio,
      verified: profile.verified,
      commission_rate: profile.commission_rate,
      created_at: profile.created_at,
      early_adopter_ends_at: profile.early_adopter_ends_at,
    },
    services: {
      total: services.length,
      by_status: servicesByStatus,
    },
    bookings: {
      total: bookings.length,
      by_status: bookingsByStatus,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_commission: Math.round(totalCommission * 100) / 100,
      net_to_provider: netToProvider,
      total_refunded: Math.round(totalRefunded * 100) / 100,
      last_booking_date: lastBookingDate,
    },
    reviews: {
      count: reviewCount,
      avg_rating: Math.round(avgRating * 10) / 10,
    },
  });
}

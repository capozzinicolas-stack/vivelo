import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const supabase = createAdminSupabaseClient();

  // Default: last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = end || new Date().toISOString();

  // Fetch all events in range
  const { data: events } = await supabase
    .from('whatsapp_events')
    .select('event_type, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (!events) {
    return NextResponse.json({ byEventType: {}, byStatus: {}, total: 0 });
  }

  // Count by event_type
  const byEventType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const e of events) {
    byEventType[e.event_type] = (byEventType[e.event_type] || 0) + 1;
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
  }

  // Today stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayTotal } = await supabase
    .from('whatsapp_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  // This week stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: weekTotal } = await supabase
    .from('whatsapp_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString());

  // Delivery/read rates for the period
  const totalEvents = events.length;
  const delivered = events.filter(e => e.status === 'delivered' || e.status === 'read').length;
  const read = events.filter(e => e.status === 'read').length;

  return NextResponse.json({
    byEventType,
    byStatus,
    total: totalEvents,
    todayTotal: todayTotal ?? 0,
    weekTotal: weekTotal ?? 0,
    deliveryRate: totalEvents > 0 ? Math.round((delivered / totalEvents) * 100) : 0,
    readRate: totalEvents > 0 ? Math.round((read / totalEvents) * 100) : 0,
  });
}

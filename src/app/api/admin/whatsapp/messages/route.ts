import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const eventType = searchParams.get('event_type');
  const status = searchParams.get('status');
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  const offset = (page - 1) * limit;

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from('whatsapp_events')
    .select('*, profile:profiles!whatsapp_events_profile_id_fkey(full_name, email, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) query = query.eq('event_type', eventType);
  if (status) query = query.eq('status', status);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, count, error } = await query;

  if (error) {
    console.error('[WhatsApp API] Events query error:', error);
    return NextResponse.json({ error: 'Error obteniendo eventos' }, { status: 500 });
  }

  return NextResponse.json({
    events: data || [],
    total: count || 0,
    page,
    limit,
  });
}

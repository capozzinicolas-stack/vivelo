import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncGoogleEventsToVivelo } from '@/lib/google-calendar/sync';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all active connections
    const { data: connections, error } = await supabase
      .from('google_calendar_connections')
      .select('provider_id')
      .eq('sync_status', 'active');

    if (error) {
      console.error('[Cron Sync] Error fetching connections:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { providerId: string; synced: number; deleted: number }[] = [];

    for (const conn of (connections || [])) {
      const result = await syncGoogleEventsToVivelo(conn.provider_id);
      results.push({ providerId: conn.provider_id, ...result });
    }

    return NextResponse.json({
      success: true,
      syncedProviders: results.length,
      results,
    });
  } catch (err) {
    console.error('[Cron Sync] Error:', err);
    return NextResponse.json({ error: 'Cron sync failed' }, { status: 500 });
  }
}

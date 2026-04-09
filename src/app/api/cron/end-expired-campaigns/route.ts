import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * Auto-ends campaigns whose end_date has passed.
 * Transitions status from 'active' to 'ended'.
 * Runs daily via Vercel cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  console.log(`[EndExpiredCampaigns] Checking for expired campaigns at ${now}`);

  const { data: expired, error } = await supabase
    .from('campaigns')
    .select('id, internal_name, end_date')
    .eq('status', 'active')
    .lt('end_date', now);

  if (error) {
    console.error('[EndExpiredCampaigns] Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Error fetching campaigns' }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    console.log('[EndExpiredCampaigns] No expired campaigns found');
    return NextResponse.json({ processed: 0 });
  }

  console.log(`[EndExpiredCampaigns] Found ${expired.length} campaigns to end`);

  let processed = 0;
  for (const campaign of expired) {
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'ended', updated_at: now })
      .eq('id', campaign.id);

    if (updateError) {
      console.error(`[EndExpiredCampaigns] Error updating campaign ${campaign.id}:`, updateError);
      continue;
    }

    console.log(`[EndExpiredCampaigns] Ended campaign "${campaign.internal_name}" (ended ${campaign.end_date})`);
    processed++;
  }

  return NextResponse.json({ processed });
}

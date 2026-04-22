import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { waProviderNoServiceReminder } from '@/lib/whatsapp';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  // Providers registered >= 3 days ago
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Find providers registered more than 3 days ago
  const { data: providers, error: provError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .eq('role', 'provider')
    .lte('created_at', threeDaysAgo)
    .not('phone', 'is', null);

  if (provError) {
    console.error('[ProviderNoServiceReminder] Error fetching providers:', provError);
    return NextResponse.json({ error: 'Error fetching providers' }, { status: 500 });
  }

  if (!providers || providers.length === 0) {
    console.log('[ProviderNoServiceReminder] No eligible providers found');
    return NextResponse.json({ processed: 0 });
  }

  const providerIds = providers.map(p => p.id);

  // Find which of these providers have ANY service (any status)
  const { data: servicesData, error: svcError } = await supabase
    .from('services')
    .select('provider_id')
    .in('provider_id', providerIds);

  if (svcError) {
    console.error('[ProviderNoServiceReminder] Error fetching services:', svcError);
    return NextResponse.json({ error: 'Error fetching services' }, { status: 500 });
  }

  const providersWithServices = new Set((servicesData || []).map(s => s.provider_id));

  // Find which of these providers already received this reminder
  const { data: alreadySent, error: sentError } = await supabase
    .from('whatsapp_events')
    .select('profile_id')
    .eq('event_type', 'provider_no_service_reminder')
    .in('profile_id', providerIds);

  if (sentError) {
    console.error('[ProviderNoServiceReminder] Error checking sent events:', sentError);
    return NextResponse.json({ error: 'Error checking sent events' }, { status: 500 });
  }

  const alreadySentIds = new Set((alreadySent || []).map(e => e.profile_id));

  // Filter: no services AND no prior reminder
  const eligibleProviders = providers.filter(
    p => !providersWithServices.has(p.id) && !alreadySentIds.has(p.id)
  );

  console.log(`[ProviderNoServiceReminder] ${providers.length} providers checked, ${eligibleProviders.length} eligible`);

  let sent = 0;
  for (const provider of eligibleProviders) {
    try {
      waProviderNoServiceReminder({
        providerId: provider.id,
        providerPhone: provider.phone,
        providerName: provider.full_name || 'Proveedor',
      });
      sent++;
    } catch (err) {
      console.error(`[ProviderNoServiceReminder] Failed for ${provider.id}:`, err);
    }
  }

  console.log(`[ProviderNoServiceReminder] Sent ${sent} reminders`);
  return NextResponse.json({ processed: sent });
}

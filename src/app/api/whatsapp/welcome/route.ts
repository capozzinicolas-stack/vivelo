import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { validateBody, WelcomeWhatsAppSchema } from '@/lib/validations/api-schemas';
import { waProviderWelcome, waClientWelcome } from '@/lib/whatsapp';

export async function POST(request: Request) {
  const validated = await validateBody(request, WelcomeWhatsAppSchema);
  if (validated.error || !validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });

  const { profileId, phone, name, role } = validated.data;

  // Dedup: no enviar si ya hay evento *_welcome para este profile en las ultimas 24h
  const supabase = createAdminSupabaseClient();
  const eventType = role === 'provider' ? 'provider_welcome' : 'client_welcome';
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('whatsapp_events')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('event_type', eventType)
    .gte('created_at', since);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ success: true, skipped: true });
  }

  if (role === 'provider') {
    waProviderWelcome({ providerId: profileId, providerPhone: phone, providerName: name });
  } else {
    waClientWelcome({ clientId: profileId, clientPhone: phone, clientName: name });
  }

  return NextResponse.json({ success: true });
}

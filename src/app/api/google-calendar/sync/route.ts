import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleEventsToVivelo } from '@/lib/google-calendar/sync';

export async function POST(request: NextRequest) {
  try {
    const { providerId } = await request.json();
    if (!providerId) {
      return NextResponse.json({ error: 'providerId required' }, { status: 400 });
    }

    const result = await syncGoogleEventsToVivelo(providerId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[Google Sync] Error:', err);
    return NextResponse.json({ error: 'Error syncing' }, { status: 500 });
  }
}

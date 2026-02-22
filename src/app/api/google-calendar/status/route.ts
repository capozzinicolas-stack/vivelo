import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/google-calendar/client';

const isMockMode = () => !process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'placeholder';

export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get('providerId');
  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 });
  }

  if (isMockMode()) {
    return NextResponse.json({ connected: false, mock: true });
  }

  try {
    const conn = await getConnection(providerId);
    if (!conn) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: conn.google_email,
      lastSync: conn.last_sync_at,
      syncStatus: conn.sync_status,
      syncError: conn.sync_error,
    });
  } catch (err) {
    console.error('[Google Status] Error:', err);
    return NextResponse.json({ error: 'Error checking status' }, { status: 500 });
  }
}

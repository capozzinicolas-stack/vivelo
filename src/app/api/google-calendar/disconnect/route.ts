import { NextRequest, NextResponse } from 'next/server';
import { disconnectGoogle } from '@/lib/google-calendar/client';

export async function POST(request: NextRequest) {
  try {
    const { providerId } = await request.json();
    if (!providerId) {
      return NextResponse.json({ error: 'providerId required' }, { status: 400 });
    }

    await disconnectGoogle(providerId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Google Disconnect] Error:', err);
    return NextResponse.json({ error: 'Error desconectando' }, { status: 500 });
  }
}

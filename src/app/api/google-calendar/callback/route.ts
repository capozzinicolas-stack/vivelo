import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { exchangeCodeAndStore, ensureViveloCalendar } from '@/lib/google-calendar/client';
import { syncGoogleEventsToVivelo } from '@/lib/google-calendar/sync';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectBase = `${appUrl}/dashboard/proveedor/configuracion`;

  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      console.error('[Google Callback] OAuth error:', error);
      return NextResponse.redirect(`${redirectBase}?google=error`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${redirectBase}?google=error`);
    }

    // Verify state HMAC
    const secret = process.env.GOOGLE_CLIENT_SECRET || 'dev-secret';
    const decoded = Buffer.from(stateParam, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return NextResponse.redirect(`${redirectBase}?google=error`);
    }

    const [providerId, timestamp, receivedHmac] = parts;
    const expectedHmac = crypto.createHmac('sha256', secret).update(`${providerId}:${timestamp}`).digest('hex');
    if (receivedHmac !== expectedHmac) {
      console.error('[Google Callback] Invalid state HMAC');
      return NextResponse.redirect(`${redirectBase}?google=error`);
    }

    // Check timestamp is within 10 minutes
    if (Date.now() - parseInt(timestamp) > 10 * 60 * 1000) {
      console.error('[Google Callback] State expired');
      return NextResponse.redirect(`${redirectBase}?google=error`);
    }

    // Exchange code for tokens and store
    await exchangeCodeAndStore(code, providerId);

    // Create dedicated Vivelo calendar
    await ensureViveloCalendar(providerId);

    // Initial sync (non-blocking)
    syncGoogleEventsToVivelo(providerId).catch(err =>
      console.error('[Google Callback] Initial sync failed:', err)
    );

    return NextResponse.redirect(`${redirectBase}?google=connected`);
  } catch (err) {
    console.error('[Google Callback] Error:', err);
    return NextResponse.redirect(`${redirectBase}?google=error`);
  }
}

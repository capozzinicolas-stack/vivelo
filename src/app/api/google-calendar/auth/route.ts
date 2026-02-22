import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUrl } from '@/lib/google-calendar/client';

export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get('providerId');
  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 });
  }

  // Generate HMAC state to prevent CSRF
  const secret = process.env.GOOGLE_CLIENT_SECRET || 'dev-secret';
  const timestamp = Date.now().toString();
  const payload = `${providerId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const state = Buffer.from(`${payload}:${hmac}`).toString('base64url');

  const authUrl = getAuthUrl(state);
  if (!authUrl) {
    // Mock mode: redirect back as if connected
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/dashboard/proveedor/configuracion?google=connected`);
  }

  return NextResponse.redirect(authUrl);
}

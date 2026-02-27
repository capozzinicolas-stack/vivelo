import { NextRequest, NextResponse } from 'next/server';
import { disconnectGoogle } from '@/lib/google-calendar/client';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, GoogleSyncSchema } from '@/lib/validations/api-schemas';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const validation = await validateBody(request, GoogleSyncSchema);
    if (validation.error !== null) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { providerId } = validation.data!

    if (auth.profile.role !== 'admin' && auth.user.id !== providerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await disconnectGoogle(providerId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Google Disconnect] Error:', err);
    return NextResponse.json({ error: 'Error desconectando' }, { status: 500 });
  }
}

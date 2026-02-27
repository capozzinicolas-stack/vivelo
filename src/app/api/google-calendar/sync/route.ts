import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleEventsToVivelo } from '@/lib/google-calendar/sync';
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

    // Verify authorization: must be the provider themselves or admin
    if (auth.profile.role !== 'admin' && auth.user.id !== providerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await syncGoogleEventsToVivelo(providerId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[Google Sync] Error:', err);
    return NextResponse.json({ error: 'Error syncing' }, { status: 500 });
  }
}

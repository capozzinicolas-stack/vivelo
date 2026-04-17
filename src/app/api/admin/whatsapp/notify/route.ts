import { NextResponse } from 'next/server';
import { requireAdminLevel, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, AdminWhatsAppNotifySchema } from '@/lib/validations/api-schemas';
import { sendWhatsAppEvent, type WaEventType } from '@/lib/whatsapp';

export async function POST(request: Request) {
  const auth = await requireAdminLevel(['super_admin', 'marketing', 'support']);
  if (isAuthError(auth)) return auth;

  const validated = await validateBody(request, AdminWhatsAppNotifySchema);
  if (validated.error || !validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });

  const { eventType, recipientId, phone, name, variables, bookingId, serviceId } = validated.data;

  sendWhatsAppEvent({
    eventType: eventType as WaEventType,
    recipientId,
    recipientPhone: phone,
    recipientName: name,
    variables,
    bookingId,
    serviceId,
  }).catch(err => console.error('[WhatsApp] Admin notify error:', err));

  return NextResponse.json({ success: true });
}

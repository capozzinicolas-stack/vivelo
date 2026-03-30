import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { sendNewsletterWelcome } from '@/lib/email';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    // Try to add to Resend audience if configured
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey && audienceId) {
      try {
        const resend = new Resend(resendKey);
        await resend.contacts.create({
          email,
          audienceId,
        });
      } catch (err) {
        // Contact may already exist — not a blocking error
        console.warn('[Newsletter] Failed to add contact to audience:', err);
      }
    }

    // Send welcome email
    await sendNewsletterWelcome(email);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 });
    }
    console.error('[Newsletter] Error:', err);
    return NextResponse.json({ error: 'Error al suscribir' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { sendNewsletterWelcome } from '@/lib/email';

const schema = z.object({
  email: z.string().email(),
});

// Simple in-memory rate limiter: max 3 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 });
    }

    const body = await request.json();
    const { email } = schema.parse(body);

    // Try to add to Resend audience if configured
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const resendKey = process.env.RESEND_API_KEY;

    let contactAlreadyExists = false;

    if (resendKey && audienceId) {
      try {
        const resend = new Resend(resendKey);
        await resend.contacts.create({
          email,
          audienceId,
        });
      } catch (err: unknown) {
        // Contact already exists — skip welcome email
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          contactAlreadyExists = true;
        } else {
          console.warn('[Newsletter] Failed to add contact to audience:', err);
        }
      }
    }

    // Only send welcome email for new subscribers
    if (!contactAlreadyExists) {
      await sendNewsletterWelcome(email);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 });
    }
    console.error('[Newsletter] Error:', err);
    return NextResponse.json({ error: 'Error al suscribir' }, { status: 500 });
  }
}

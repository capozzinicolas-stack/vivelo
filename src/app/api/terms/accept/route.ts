import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  userId: z.string().uuid(),
  termsType: z.enum(['general', 'provider']),
  termsVersion: z.string().default('1.0'),
  fullName: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, termsType, termsVersion, fullName, email } = schema.parse(body);

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const supabase = createAdminSupabaseClient();

    const { error } = await supabase
      .from('terms_acceptances')
      .insert({
        user_id: userId,
        terms_type: termsType,
        terms_version: termsVersion,
        full_name: fullName,
        email,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (error) {
      console.error('[Terms Accept] Insert error:', error);
      return NextResponse.json({ error: 'Error al registrar aceptacion' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 });
    }
    console.error('[Terms Accept] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

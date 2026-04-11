import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const PatchSchema = z.object({
  salesConsumed: z.number().int().min(0).optional(),
  status: z.enum(['pending', 'active', 'consumed', 'expired']).optional(),
  adminNotes: z.string().max(500).nullable().optional(),
}).refine(
  d => d.salesConsumed !== undefined || d.status !== undefined || d.adminNotes !== undefined,
  { message: 'Se requiere al menos un campo a actualizar' }
);

/**
 * PATCH /api/admin/referrals/benefits/[benefitId]
 *
 * Admin updates a benefit:
 * - salesConsumed: increments manually after applying discount to a booking
 * - status: pending → active (Early Adopter ended), active → consumed, etc.
 * - adminNotes: internal notes
 *
 * NOTE: V1 does NOT automate consumption. Admin manually increments sales_consumed
 * when applying a benefit during liquidation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ benefitId: string }> }
) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { benefitId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { salesConsumed, status, adminNotes } = parsed.data;
  const supabase = createAdminSupabaseClient();

  // Fetch current benefit for validation
  const { data: current, error: fetchError } = await supabase
    .from('provider_referral_benefits')
    .select('*')
    .eq('id', benefitId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Beneficio no encontrado' }, { status: 404 });
  }

  const currentTyped = current as {
    total_sales_granted: number;
    sales_consumed: number;
    status: string;
  };

  const updates: Record<string, unknown> = {};

  if (salesConsumed !== undefined) {
    if (salesConsumed > currentTyped.total_sales_granted) {
      return NextResponse.json(
        { error: `No se puede consumir mas de ${currentTyped.total_sales_granted} (total otorgado)` },
        { status: 400 }
      );
    }
    updates.sales_consumed = salesConsumed;
    // Auto-transition to consumed when fully used
    if (salesConsumed >= currentTyped.total_sales_granted && currentTyped.status === 'active') {
      updates.status = 'consumed';
      updates.consumed_at = new Date().toISOString();
    }
  }

  if (status !== undefined) {
    updates.status = status;
    if (status === 'active' && currentTyped.status === 'pending') {
      updates.activated_at = new Date().toISOString();
    }
    if (status === 'consumed' && currentTyped.status !== 'consumed') {
      updates.consumed_at = new Date().toISOString();
    }
  }

  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes;
  }

  const { error: updateError } = await supabase
    .from('provider_referral_benefits')
    .update(updates)
    .eq('id', benefitId);

  if (updateError) {
    console.error('[Admin Referrals] Update benefit error:', updateError);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

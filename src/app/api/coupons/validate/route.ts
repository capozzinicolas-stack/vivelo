import { NextResponse } from 'next/server';
import { validateBody, ValidateCouponSchema } from '@/lib/validations/api-schemas';
import { validateCouponServer } from '@/lib/supabase/server-queries';

/**
 * POST /api/coupons/validate
 * Valida un cupon de proveedor contra un servicio.
 * Publico (no requiere auth) — clientes invitados pueden previsualizar.
 *
 * Body: { service_id: string, coupon_code: string, user_id?: string }
 *
 * Responde:
 *   { valid: true, campaign: Campaign, discount_amount_pct: number }
 *   { valid: false, error: string }
 *
 * Nota: El `discount_amount` en pesos se calcula client-side con el
 * total del item (base + extras). Aqui solo retornamos el porcentaje.
 */
export async function POST(request: Request) {
  const validation = await validateBody(request, ValidateCouponSchema);
  if (validation.error !== null) {
    return NextResponse.json({ valid: false, error: validation.error }, { status: 400 });
  }
  const { service_id, coupon_code } = validation.data!;

  const result = await validateCouponServer(service_id, coupon_code);

  if (!result.valid) {
    // 200 con valid:false para que el client pueda manejar el mensaje sin tratarlo como HTTP error
    return NextResponse.json({ valid: false, error: result.error });
  }

  return NextResponse.json({
    valid: true,
    campaign: result.campaign,
    discount_pct: result.campaign.discount_pct,
  });
}

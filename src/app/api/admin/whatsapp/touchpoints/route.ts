import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { mirloListTemplates, isMockMirlo } from '@/lib/mirlo';
import { TOUCHPOINT_CONFIG } from '@/lib/constants';

// TEMPLATE_MAP from whatsapp.ts — duplicated here to avoid importing client-side module
const TEMPLATE_MAP: Record<string, string> = {
  provider_welcome: 'seguimiento_programas_beneficios',
  provider_service_approved: 'vivelo_servicio_aprobado',
  provider_service_rejected: 'vivelo_servicio_rechazado',
  provider_service_needs_revision: 'vivelo_servicio_revision',
  provider_new_booking: 'vivelo_proveedor_nueva_reserva',
  provider_booking_cancelled: 'vivelo_proveedor_reserva_cancelada',
  provider_event_reminder: 'vivelo_proveedor_recordatorio',
  provider_start_code: 'vivelo_proveedor_codigo_inicio',
  provider_booking_completed: 'vivelo_proveedor_reserva_completada',
  provider_new_review: 'vivelo_proveedor_nueva_resena',
  provider_fiscal_approved: 'vivelo_proveedor_fiscal_aprobado',
  provider_fiscal_rejected: 'vivelo_proveedor_fiscal_rechazado',
  provider_banking_approved: 'vivelo_proveedor_banco_aprobado',
  provider_banking_rejected: 'vivelo_proveedor_banco_rechazado',
  provider_admin_comment: 'vivelo_proveedor_comentario_admin',
  provider_booking_rejected: 'vivelo_proveedor_reserva_rechazada',
  client_welcome: 'vivelo_cliente_bienvenida',
  client_booking_confirmed: 'vivelo_reserva_confirmada',
  client_booking_cancelled: 'vivelo_reserva_cancelada',
  client_event_reminder: 'vivelo_recordatorio_evento',
  client_verification_codes: 'vivelo_codigo_verificacion',
  client_booking_completed: 'vivelo_reserva_completada',
  client_event_started: 'vivelo_evento_iniciado',
  client_booking_rejected: 'vivelo_reserva_rechazada',
  client_payment_authorized: 'vivelo_pago_autorizado',
  provider_booking_accepted: 'vivelo_proveedor_reserva_aceptada',
  provider_no_service_reminder: 'vivelo_proveedor_recordatorio_servicio',
  admin_manual: 'vivelo_mensaje_admin',
};

export async function GET() {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  // 1. Get template status from Mirlo/Meta
  const templateStatusMap: Map<string, string> = new Map(); // name → status ('APPROVED', 'REJECTED', etc.)
  try {
    if (!isMockMirlo) {
      const { data: templates } = await mirloListTemplates();
      for (const t of templates) {
        templateStatusMap.set(t.name, t.status);
      }
    }
  } catch (err) {
    console.error('[Touchpoints API] Failed to fetch templates:', err);
  }

  // 2. Count events per type in last 30 days
  const supabase = createAdminSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eventCounts } = await supabase
    .from('whatsapp_events')
    .select('event_type')
    .gte('created_at', thirtyDaysAgo);

  const countByType: Record<string, number> = {};
  if (eventCounts) {
    for (const e of eventCounts) {
      countByType[e.event_type] = (countByType[e.event_type] || 0) + 1;
    }
  }

  // 3. Build response
  const touchpoints = TOUCHPOINT_CONFIG.map((tp) => {
    const templateName = TEMPLATE_MAP[tp.eventType] || null;
    const templateStatus = templateName ? templateStatusMap.get(templateName) || null : null;

    return {
      eventType: tp.eventType,
      label: tp.label,
      description: tp.description,
      recipient: tp.recipient,
      trigger: tp.trigger,
      channel: tp.channel,
      journey: tp.journey,
      phase: tp.phase,
      templateName,
      templateStatus, // 'APPROVED', 'REJECTED', null (not found)
      active: templateStatus === 'APPROVED',
      eventCount30d: countByType[tp.eventType] || 0,
    };
  });

  return NextResponse.json({ touchpoints });
}

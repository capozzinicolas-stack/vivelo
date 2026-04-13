/**
 * WhatsApp Notification Service — Fase 2 (Event-Driven via Mirlo)
 * 25 event types, cache-based template resolution, fire-and-forget convenience functions.
 */

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  isMockMirlo,
  mirloSendTemplate,
  getTemplateIdByName,
  type MirloTemplateComponent,
} from '@/lib/mirlo';

// ─── Types ────────────────────────────────────────────────────

export type WaEventType =
  | 'provider_welcome' | 'provider_service_approved' | 'provider_service_rejected'
  | 'provider_service_needs_revision' | 'provider_new_booking' | 'provider_booking_cancelled'
  | 'provider_event_reminder' | 'provider_start_code' | 'provider_booking_completed'
  | 'provider_new_review' | 'provider_fiscal_approved' | 'provider_fiscal_rejected'
  | 'provider_banking_approved' | 'provider_banking_rejected' | 'provider_admin_comment'
  | 'provider_booking_rejected' | 'client_welcome' | 'client_booking_confirmed'
  | 'client_booking_cancelled' | 'client_event_reminder' | 'client_verification_codes'
  | 'client_booking_completed' | 'client_event_started' | 'client_booking_rejected'
  | 'admin_manual';

// ─── Template name mapping ───────────────────────────────────

const TEMPLATE_MAP: Record<WaEventType, string> = {
  // TODO: Cambiar a 'vivelo_proveedor_bienvenida' cuando el template dedicado este aprobado en Meta
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
  admin_manual: 'vivelo_mensaje_admin',
};

// ─── Phone formatting ─────────────────────────────────────────

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('52') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}

// ─── Core send function ───────────────────────────────────────

export async function sendWhatsAppEvent(params: {
  eventType: WaEventType;
  recipientId: string | null;
  recipientPhone: string;
  recipientName: string;
  variables: Record<string, string>;
  headerVariables?: Record<string, string>;
  bookingId?: string;
  serviceId?: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const { eventType, recipientId, recipientPhone, recipientName, variables, headerVariables, bookingId, serviceId } = params;

  const templateName = TEMPLATE_MAP[eventType];

  if (isMockMirlo) {
    console.log(`[WhatsApp Mock] ${eventType} to ${recipientName} (${recipientPhone})`, variables);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  // Resolve meta_template_id via cache
  const metaTemplateId = await getTemplateIdByName(templateName);
  if (!metaTemplateId) {
    console.log(`[WhatsApp] Template "${templateName}" not found in Mirlo for ${eventType}, skipping`);
    return { success: false };
  }

  const phone = formatPhoneE164(recipientPhone);

  // Build template components
  const components: MirloTemplateComponent[] = [];
  if (headerVariables && Object.keys(headerVariables).length > 0) {
    components.push({
      type: 'header',
      parameters: Object.entries(headerVariables).map(([key, value]) => ({
        type: 'text' as const, parameter_name: key, text: value,
      })),
    });
  }
  const bodyParams = Object.entries(variables).map(([key, value]) => ({
    type: 'text' as const,
    parameter_name: key,
    text: value,
  }));
  if (bodyParams.length > 0) {
    components.push({ type: 'body', parameters: bodyParams });
  }

  const supabase = createAdminSupabaseClient();

  try {
    const result = await mirloSendTemplate(phone, metaTemplateId, components);

    // Log success
    await supabase.from('whatsapp_events').insert({
      event_type: eventType,
      profile_id: recipientId,
      phone,
      template_name: templateName,
      variables,
      mirlo_message_id: result.id,
      status: 'accepted',
      booking_id: bookingId || null,
      service_id: serviceId || null,
    });

    console.log(`[WhatsApp] ${eventType} sent to ${recipientName} (${phone}), mirlo_id=${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error(`[WhatsApp] Failed to send ${eventType} to ${phone}:`, error);

    // Log failure
    await supabase.from('whatsapp_events').insert({
      event_type: eventType,
      profile_id: recipientId,
      phone,
      template_name: templateName,
      variables,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      booking_id: bookingId || null,
      service_id: serviceId || null,
    }).then(() => {}, () => {});

    return { success: false };
  }
}

// ─── Convenience functions (non-blocking, fire-and-forget) ────

// Provider events

export function waProviderWelcome(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_welcome',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    // TODO: Cuando vivelo_proveedor_bienvenida este aprobado, mover nombre a variables y quitar headerVariables
    variables: {},
    headerVariables: {
      nombre: data.providerName,
    },
  }).catch(err => console.error('[WhatsApp] provider_welcome error:', err));
}

export function waProviderServiceApproved(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_service_approved',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      link: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_service_approved error:', err));
}

export function waProviderServiceRejected(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  reason: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_service_rejected',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      motivo: data.reason,
      link: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_service_rejected error:', err));
}

export function waProviderServiceNeedsRevision(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  notes: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_service_needs_revision',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      notas: data.notes,
      link: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_service_needs_revision error:', err));
}

export function waProviderNewBooking(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  clientName: string;
  eventDate: string;
  bookingId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_new_booking',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      cliente: data.clientName,
      fecha: data.eventDate,
      link: 'https://solovivelo.com/dashboard/proveedor/reservas',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_new_booking error:', err));
}

export function waProviderBookingCancelled(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  clientName: string;
  eventDate: string;
  bookingId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_booking_cancelled',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      cliente: data.clientName,
      fecha: data.eventDate,
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_booking_cancelled error:', err));
}

export function waProviderEventReminder(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  eventDate: string;
  startTime: string;
  address: string;
  bookingId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_event_reminder',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      fecha: data.eventDate,
      hora: data.startTime,
      direccion: data.address || 'Ver detalles en tu panel',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_event_reminder error:', err));
}

export function waProviderStartCode(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  startCode: string;
  bookingId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_start_code',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      codigo: data.startCode,
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_start_code error:', err));
}

export function waProviderBookingCompleted(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  clientName: string;
  bookingId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_booking_completed',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      cliente: data.clientName,
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_booking_completed error:', err));
}

export function waProviderNewReview(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  rating: number;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_new_review',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      rating: String(data.rating),
      link: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_new_review error:', err));
}

export function waProviderFiscalApproved(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_fiscal_approved',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
    },
  }).catch(err => console.error('[WhatsApp] provider_fiscal_approved error:', err));
}

export function waProviderFiscalRejected(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  reason: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_fiscal_rejected',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      motivo: data.reason,
    },
  }).catch(err => console.error('[WhatsApp] provider_fiscal_rejected error:', err));
}

export function waProviderBankingApproved(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_banking_approved',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
    },
  }).catch(err => console.error('[WhatsApp] provider_banking_approved error:', err));
}

export function waProviderBankingRejected(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  reason: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_banking_rejected',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      motivo: data.reason,
    },
  }).catch(err => console.error('[WhatsApp] provider_banking_rejected error:', err));
}

export function waProviderAdminComment(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  category: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_admin_comment',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      categoria: data.category,
      link: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_admin_comment error:', err));
}

export function waProviderBookingRejected(data: {
  providerId: string;
  providerPhone: string | null;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  clientName: string;
  bookingId: string;
}) {
  if (!data.providerPhone) return;
  sendWhatsAppEvent({
    eventType: 'provider_booking_rejected',
    recipientId: data.providerId,
    recipientPhone: data.providerPhone,
    recipientName: data.providerName,
    variables: {
      nombre: data.providerName,
      servicio: data.serviceTitle,
      cliente: data.clientName,
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] provider_booking_rejected error:', err));
}

// Client events

export function waClientWelcome(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_welcome',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      link: 'https://solovivelo.com',
    },
  }).catch(err => console.error('[WhatsApp] client_welcome error:', err));
}

export function waClientBookingConfirmed(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  eventDate: string;
  startTime: string;
  total: number;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_booking_confirmed',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
      fecha: data.eventDate,
      horario: data.startTime,
      monto: `$${data.total.toLocaleString()} MXN`,
      link: 'https://solovivelo.com/dashboard/cliente/reservas',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_booking_confirmed error:', err));
}

export function waClientBookingCancelled(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  refundAmount: number;
  refundPercent: number;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_booking_cancelled',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
      monto_reembolso: `$${data.refundAmount.toLocaleString()} MXN`,
      porcentaje: String(data.refundPercent),
      link: 'https://solovivelo.com/dashboard/cliente/reservas',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_booking_cancelled error:', err));
}

export function waClientEventReminder(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  eventDate: string;
  startTime: string;
  address: string;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_event_reminder',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
      fecha: data.eventDate,
      hora: data.startTime,
      direccion: data.address || 'Ver detalles en tu panel',
      link: 'https://solovivelo.com/dashboard/cliente/reservas',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_event_reminder error:', err));
}

export function waClientVerificationCodes(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  startCode: string;
  endCode: string;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_verification_codes',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
      codigo_inicio: data.startCode,
      codigo_fin: data.endCode,
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_verification_codes error:', err));
}

export function waClientBookingCompleted(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_booking_completed',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
      link: 'https://solovivelo.com/dashboard/cliente/reservas',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_booking_completed error:', err));
}

export function waClientEventStarted(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_event_started',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_event_started error:', err));
}

export function waClientBookingRejected(data: {
  clientId: string;
  clientPhone: string | null;
  clientName: string;
  serviceTitle: string;
  serviceId: string;
  bookingId: string;
}) {
  if (!data.clientPhone) return;
  sendWhatsAppEvent({
    eventType: 'client_booking_rejected',
    recipientId: data.clientId,
    recipientPhone: data.clientPhone,
    recipientName: data.clientName,
    variables: {
      nombre: data.clientName,
      servicio: data.serviceTitle,
      link: 'https://solovivelo.com/dashboard/cliente/reservas',
    },
    bookingId: data.bookingId,
    serviceId: data.serviceId,
  }).catch(err => console.error('[WhatsApp] client_booking_rejected error:', err));
}

// Admin events

export function waAdminManual(data: {
  recipientId: string;
  phone: string;
  name: string;
  message: string;
  link?: string;
}) {
  sendWhatsAppEvent({
    eventType: 'admin_manual',
    recipientId: data.recipientId,
    recipientPhone: data.phone,
    recipientName: data.name,
    variables: {
      nombre: data.name,
      mensaje: data.message,
      link: data.link || 'https://solovivelo.com',
    },
  }).catch(err => console.error('[WhatsApp] admin_manual error:', err));
}

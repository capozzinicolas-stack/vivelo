import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'Vivelo <noreply@solovivelo.com>';

interface BookingEmailData {
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  providerName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  total: number;
  bookingId: string;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping booking confirmation email');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.clientEmail,
      subject: `Confirmacion de reserva - ${data.serviceTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">Reserva confirmada!</h1>
          <p>Hola ${data.clientName},</p>
          <p>Tu reserva ha sido confirmada exitosamente.</p>
          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.serviceTitle}</h3>
            <p><strong>Proveedor:</strong> ${data.providerName}</p>
            <p><strong>Fecha:</strong> ${data.eventDate}</p>
            <p><strong>Horario:</strong> ${data.startTime} - ${data.endTime}</p>
            <p><strong>Invitados:</strong> ${data.guestCount}</p>
            <p><strong>Total:</strong> $${data.total.toLocaleString()} MXN</p>
          </div>
          <p>Puedes ver los detalles de tu reserva en tu <a href="https://solovivelo.com/dashboard/cliente" style="color: #43276c;">panel de cliente</a>.</p>
          <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Booking confirmation sent to', data.clientEmail);
  } catch (error) {
    console.error('[Email] Failed to send booking confirmation:', error);
  }
}

interface CancellationEmailData {
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  eventDate: string;
  refundAmount: number;
  refundPercent: number;
  bookingId: string;
}

export async function sendCancellationNotice(data: CancellationEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping cancellation email');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.clientEmail,
      subject: `Cancelacion de reserva - ${data.serviceTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">Reserva cancelada</h1>
          <p>Hola ${data.clientName},</p>
          <p>Tu reserva ha sido cancelada.</p>
          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.serviceTitle}</h3>
            <p><strong>Fecha del evento:</strong> ${data.eventDate}</p>
            ${data.refundAmount > 0 ? `
              <p><strong>Reembolso:</strong> $${data.refundAmount.toLocaleString()} MXN (${data.refundPercent}%)</p>
              <p style="font-size: 14px; color: #666;">El reembolso sera procesado en los proximos 5-10 dias habiles.</p>
            ` : '<p>No aplica reembolso segun la politica de cancelacion.</p>'}
          </div>
          <p>Si tienes preguntas sobre la cancelacion, contactanos.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Cancellation notice sent to', data.clientEmail);
  } catch (error) {
    console.error('[Email] Failed to send cancellation notice:', error);
  }
}

interface EventCodesEmailData {
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  eventDate: string;
  startCode: string;
  endCode: string;
}

export async function sendEventCodes(data: EventCodesEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping event codes email');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.clientEmail,
      subject: `Codigos de verificacion para tu evento — ${data.serviceTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">Codigos de verificacion</h1>
          <p>Hola ${data.clientName},</p>
          <p>Hoy es el dia de tu evento! Aqui tienes tus codigos de verificacion para <strong>${data.serviceTitle}</strong> (${data.eventDate}).</p>

          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #43276c;">Codigo de inicio</h3>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #43276c; margin: 16px 0;">${data.startCode}</p>
            <p style="font-size: 14px; color: #666;">Entrega este codigo al proveedor cuando llegue para confirmar el inicio del servicio.</p>
          </div>

          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #43276c;">Codigo de cierre</h3>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #43276c; margin: 16px 0;">${data.endCode}</p>
            <p style="font-size: 14px; color: #666;">Ingresa este codigo en tu panel de cliente al finalizar el servicio para confirmar que se completo correctamente.</p>
          </div>

          <p style="color: #666; font-size: 14px;"><strong>Importante:</strong> Si no ingresas el codigo de cierre en los proximos 3 dias habiles despues del evento, el servicio se marcara como completado automaticamente.</p>
          <p>Puedes ingresar los codigos desde tu <a href="https://solovivelo.com/dashboard/cliente/reservas" style="color: #43276c;">panel de reservas</a>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Event codes sent to', data.clientEmail);
  } catch (error) {
    console.error('[Email] Failed to send event codes:', error);
  }
}

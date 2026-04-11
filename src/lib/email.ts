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

interface TemporaryPasswordEmailData {
  userName: string;
  userEmail: string;
  temporaryPassword: string;
  loginUrl?: string;
}

export async function sendTemporaryPassword(data: TemporaryPasswordEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping temporary password email');
    return;
  }

  const loginUrl = data.loginUrl || 'admin.solovivelo.com';
  const isAdmin = loginUrl.includes('admin');
  const subject = isAdmin ? 'Tu contrasena temporal — Vivelo Admin' : 'Tu contrasena temporal — Vivelo';
  const accountDesc = isAdmin ? 'tu cuenta de administrador en Vivelo' : 'tu cuenta en Vivelo';

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.userEmail,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">Contrasena temporal</h1>
          <p>Hola ${data.userName},</p>
          <p>Se solicito una recuperacion de contrasena para ${accountDesc}.</p>
          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #666; margin-bottom: 8px;">Tu contrasena temporal es:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #43276c; margin: 16px 0; font-family: monospace;">${data.temporaryPassword}</p>
          </div>
          <p>Ingresa a <a href="https://${loginUrl}" style="color: #43276c;">${loginUrl}</a> con esta contrasena. Se te pedira cambiarla al iniciar sesion.</p>
          <p style="color: #666; font-size: 14px;"><strong>Importante:</strong> Si tu no solicitaste este cambio, ignora este correo.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Temporary password sent to', data.userEmail);
  } catch (error) {
    console.error('[Email] Failed to send temporary password:', error);
  }
}

export async function sendNewsletterWelcome(email: string) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping newsletter welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Bienvenido a Vivelo — Ofertas exclusivas para ti',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">Bienvenido a Vivelo!</h1>
          <p>Gracias por suscribirte a nuestro newsletter.</p>
          <p>Recibiras las mejores ofertas y novedades en servicios para eventos directamente en tu bandeja de entrada.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://solovivelo.com/servicios" style="background: #43276c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Explorar Servicios</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Newsletter welcome sent to', email);
  } catch (error) {
    console.error('[Email] Failed to send newsletter welcome:', error);
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

interface ServiceStatusEmailData {
  providerName: string;
  providerEmail: string;
  serviceTitle: string;
  status: 'approved' | 'rejected' | 'needs_revision';
  notes?: string;
}

export async function sendServiceStatusEmail(data: ServiceStatusEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping service status email');
    return;
  }

  const config = {
    approved: {
      subject: `Tu servicio fue aprobado — ${data.serviceTitle}`,
      heading: 'Servicio aprobado!',
      message: `Tu servicio <strong>"${data.serviceTitle}"</strong> ha sido aprobado y ya esta visible para los clientes.`,
      ctaText: 'Ver mis servicios',
      ctaUrl: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    rejected: {
      subject: `Tu servicio no fue aprobado — ${data.serviceTitle}`,
      heading: 'Servicio no aprobado',
      message: `Tu servicio <strong>"${data.serviceTitle}"</strong> no fue aprobado.`,
      ctaText: 'Ver mis servicios',
      ctaUrl: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
    needs_revision: {
      subject: `Tu servicio necesita ajustes — ${data.serviceTitle}`,
      heading: 'Ajustes requeridos',
      message: `Tu servicio <strong>"${data.serviceTitle}"</strong> necesita algunos ajustes antes de poder ser publicado.`,
      ctaText: 'Editar servicio',
      ctaUrl: 'https://solovivelo.com/dashboard/proveedor/servicios',
    },
  };

  const c = config[data.status];

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.providerEmail,
      subject: c.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">${c.heading}</h1>
          <p>Hola ${data.providerName},</p>
          <p>${c.message}</p>
          ${data.notes ? `
          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 14px; color: #666; margin-bottom: 4px;"><strong>Notas del equipo:</strong></p>
            <p style="margin: 0;">${data.notes}</p>
          </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${c.ctaUrl}" style="background: #43276c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">${c.ctaText}</a>
          </div>
          <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Service status email sent to', data.providerEmail);
  } catch (error) {
    console.error('[Email] Failed to send service status email:', error);
  }
}

interface ServiceCommentEmailData {
  providerName: string;
  providerEmail: string;
  serviceTitle: string;
  category: 'sugerencia' | 'reconocimiento' | 'aviso' | 'oportunidad' | 'recordatorio';
  comment: string;
}

export async function sendServiceCommentNotification(data: ServiceCommentEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping service comment notification');
    return;
  }

  const categoryConfig = {
    sugerencia: { label: 'Sugerencia', emoji: '💡', accent: '#43276c' },
    reconocimiento: { label: 'Reconocimiento', emoji: '🏆', accent: '#16a34a' },
    aviso: { label: 'Aviso importante', emoji: '⚠️', accent: '#d97706' },
    oportunidad: { label: 'Oportunidad', emoji: '✨', accent: '#ecbe38' },
    recordatorio: { label: 'Recordatorio', emoji: '🔔', accent: '#2563eb' },
  };

  const c = categoryConfig[data.category];
  const safeComment = data.comment.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.providerEmail,
      subject: `${c.emoji} ${c.label} sobre tu servicio "${data.serviceTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #43276c;">Nuevo comentario del equipo Vivelo</h1>
          <p>Hola ${data.providerName},</p>
          <p>El equipo de Vivelo dejo un comentario sobre tu servicio <strong>"${data.serviceTitle}"</strong>.</p>
          <div style="background: #f9f7f4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${c.accent};">
            <p style="font-size: 14px; color: #666; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
              ${c.emoji} ${c.label}
            </p>
            <p style="margin: 0; color: #333; line-height: 1.6;">${safeComment}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://solovivelo.com/dashboard/proveedor/servicios" style="background: #43276c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver mis servicios</a>
          </div>
          <p style="color: #666; font-size: 14px;">Puedes responder marcando el comentario como leido o resuelto desde tu panel.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Vivelo - Servicios para Eventos en Mexico</p>
        </div>
      `,
    });
    console.log('[Email] Service comment notification sent to', data.providerEmail);
  } catch (error) {
    console.error('[Email] Failed to send service comment notification:', error);
  }
}

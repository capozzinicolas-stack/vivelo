import { z } from 'zod';

export const CancelBookingSchema = z.object({
  bookingId: z.string().uuid('bookingId debe ser un UUID valido'),
  cancelledBy: z.string().min(1, 'cancelledBy es requerido'),
});

export const CreatePaymentIntentSchema = z.object({
  bookingId: z.string().uuid('bookingId debe ser un UUID valido').optional(),
  orderId: z.string().uuid('orderId debe ser un UUID valido').optional(),
  amount: z.number().positive('El monto debe ser positivo'),
  metadata: z.record(z.string(), z.string()).optional(),
}).refine(
  (data) => data.bookingId || data.orderId,
  { message: 'Se requiere bookingId o orderId' }
);

export const GoogleSyncSchema = z.object({
  providerId: z.string().uuid('providerId debe ser un UUID valido'),
});

export const UpdateProviderCommissionSchema = z.object({
  providerId: z.string().uuid('providerId debe ser un UUID valido'),
  commissionRate: z.number()
    .min(0, 'La comision no puede ser negativa')
    .max(1, 'La comision no puede ser mayor a 100%'),
});

export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return { data: null, error: message };
    }
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Body JSON invalido' };
  }
}

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

// ─── Verification Code Schemas ────────────────────────────────
export const VerifyCodeSchema = z.object({
  bookingId: z.string().uuid('bookingId debe ser un UUID valido'),
  code: z.string().length(6, 'El codigo debe tener 6 digitos'),
  type: z.enum(['start', 'end'], { message: 'type debe ser "start" o "end"' }),
});

// ─── Review Schemas ─────────────────────────────────────────
export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid('bookingId debe ser un UUID valido'),
  rating: z.number().int().min(1, 'Rating minimo es 1').max(5, 'Rating maximo es 5'),
  comment: z.string().max(2000, 'Comentario muy largo').optional(),
  photos: z.array(z.string()).max(5, 'Maximo 5 fotos').optional(),
  videos: z.array(z.string()).max(2, 'Maximo 2 videos').optional(),
});

export const AdminCreateReviewSchema = z.object({
  serviceId: z.string().uuid('serviceId debe ser un UUID valido'),
  rating: z.number().int().min(1, 'Rating minimo es 1').max(5, 'Rating maximo es 5'),
  comment: z.string().max(2000, 'Comentario muy largo').optional(),
  clientName: z.string().min(1, 'Nombre del cliente es requerido').optional(),
});

export const ModerateReviewSchema = z.object({
  reviewId: z.string().uuid('reviewId debe ser un UUID valido'),
  action: z.enum(['approve', 'reject'], { message: 'action debe ser "approve" o "reject"' }),
  adminNotes: z.string().max(500).optional(),
});

// ─── Catalog Schemas ────────────────────────────────────────

export const CreateCategorySchema = z.object({
  slug: z.string().min(1, 'slug es requerido').regex(/^[A-Z0-9_]+$/, 'slug debe ser UPPER_SNAKE_CASE'),
  label: z.string().min(1, 'label es requerido'),
  description: z.string().default(''),
  icon: z.string().default('Tag'),
  color: z.string().default('bg-gray-100 text-gray-600'),
  sku_prefix: z.string().length(2, 'sku_prefix debe tener 2 caracteres').regex(/^[A-Z]+$/, 'sku_prefix debe ser letras mayusculas'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const UpdateCategorySchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sku_prefix: z.string().length(2).regex(/^[A-Z]+$/).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const CreateSubcategorySchema = z.object({
  slug: z.string().min(1, 'slug es requerido').regex(/^[A-Z0-9_]+$/, 'slug debe ser UPPER_SNAKE_CASE'),
  category_slug: z.string().min(1, 'category_slug es requerido'),
  label: z.string().min(1, 'label es requerido'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const UpdateSubcategorySchema = z.object({
  category_slug: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const CreateZoneSchema = z.object({
  slug: z.string().min(1, 'slug es requerido').regex(/^[a-z0-9-]+$/, 'slug debe ser kebab-case'),
  label: z.string().min(1, 'label es requerido'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const UpdateZoneSchema = z.object({
  label: z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
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

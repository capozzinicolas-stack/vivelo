import { z } from 'zod';
import { PROVIDER_PROMO_LIMITS, SERVICE_COMMENT_LIMITS } from '@/lib/constants';

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
  commission_rate: z.number().min(0, 'La comision no puede ser negativa').max(1, 'La comision no puede ser mayor a 100%').default(0.12),
  image_url: z.string().url().nullable().optional(),
});

export const UpdateCategorySchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sku_prefix: z.string().length(2).regex(/^[A-Z]+$/).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  commission_rate: z.number().min(0, 'La comision no puede ser negativa').max(1, 'La comision no puede ser mayor a 100%').optional(),
  image_url: z.string().url().nullable().optional(),
});

export const CreateSubcategorySchema = z.object({
  slug: z.string().min(1, 'slug es requerido').regex(/^[A-Z0-9_]+$/, 'slug debe ser UPPER_SNAKE_CASE'),
  category_slug: z.string().min(1, 'category_slug es requerido'),
  label: z.string().min(1, 'label es requerido'),
  icon: z.string().default('Tag'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const UpdateSubcategorySchema = z.object({
  category_slug: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  icon: z.string().optional(),
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

export const CreateTagSchema = z.object({
  slug: z.string().min(1, 'slug es requerido').regex(/^[a-z0-9-]+$/, 'slug debe ser kebab-case'),
  category_slug: z.string().min(1, 'category_slug es requerido'),
  label: z.string().min(1, 'label es requerido'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const UpdateTagSchema = z.object({
  label: z.string().min(1).optional(),
  category_slug: z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

// ─── Fiscal Data Schemas ──────────────────────────────────

const REGIMENES_VALIDOS = ['601', '603', '605', '606', '607', '608', '610', '611', '612', '614', '615', '616', '620', '621', '622', '623', '624', '625', '626'] as const;

const DireccionFiscalSchema = z.object({
  calle: z.string().min(1, 'Calle es requerida'),
  numero_exterior: z.string().min(1, 'Numero exterior es requerido'),
  numero_interior: z.string().optional(),
  colonia: z.string().min(1, 'Colonia es requerida'),
  codigo_postal: z.string().regex(/^\d{5}$/, 'Codigo postal debe tener 5 digitos'),
  municipio: z.string().min(1, 'Municipio es requerido'),
  estado: z.string().min(1, 'Estado es requerido'),
  pais: z.string().default('Mexico'),
});

export const CreateFiscalDataSchema = z.object({
  rfc: z.string().min(12, 'RFC debe tener al menos 12 caracteres').max(13, 'RFC debe tener maximo 13 caracteres'),
  razon_social: z.string().min(1, 'Razon social es requerida').max(300, 'Razon social muy larga'),
  tipo_persona: z.enum(['fisica', 'moral'], { message: 'Tipo de persona debe ser "fisica" o "moral"' }),
  regimen_fiscal: z.enum(REGIMENES_VALIDOS, { message: 'Regimen fiscal invalido' }),
  uso_cfdi: z.string().min(1, 'Uso de CFDI es requerido').default('G03'),
  direccion_fiscal: DireccionFiscalSchema,
  clabe: z.string().regex(/^\d{18}$/, 'CLABE debe tener 18 digitos').optional().nullable(),
  banco: z.string().max(100).optional().nullable(),
});

export const UpdateFiscalDataSchema = z.object({
  rfc: z.string().min(12).max(13).optional(),
  razon_social: z.string().min(1).max(300).optional(),
  tipo_persona: z.enum(['fisica', 'moral']).optional(),
  regimen_fiscal: z.enum(REGIMENES_VALIDOS).optional(),
  uso_cfdi: z.string().min(1).optional(),
  direccion_fiscal: DireccionFiscalSchema.optional(),
  clabe: z.string().regex(/^\d{18}$/, 'CLABE debe tener 18 digitos').optional().nullable(),
  banco: z.string().max(100).optional().nullable(),
});

export const UpdateFiscalStatusSchema = z.object({
  fiscal_status: z.enum(['pending_review', 'approved', 'rejected'], { message: 'Estado fiscal invalido' }),
  admin_notes: z.string().max(1000, 'Notas muy largas').optional().nullable(),
});

// ─── Category Field Definition Schemas ───────────────────

const FIELD_TYPES = ['text_long','text_short','number','currency','multi_select','dropdown','switch','switch_number','matrix_select'] as const;

export const CreateFieldDefinitionSchema = z.object({
  category_slug: z.string().min(1, 'category_slug es requerido'),
  key: z.string().min(1, 'key es requerido').regex(/^[a-z_][a-z0-9_]*$/, 'key debe ser snake_case'),
  label: z.string().min(1, 'label es requerido'),
  type: z.enum(FIELD_TYPES, { message: 'type invalido' }),
  instruction: z.string().default(''),
  options: z.array(z.string()).default([]),
  unit: z.string().nullable().default(null),
  switch_label: z.string().nullable().default(null),
  number_label: z.string().nullable().default(null),
  columns: z.array(z.string()).default([]),
  column_label: z.string().nullable().default(null),
  rows: z.array(z.string()).default([]),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const UpdateFieldDefinitionSchema = z.object({
  label: z.string().min(1).optional(),
  type: z.enum(FIELD_TYPES).optional(),
  instruction: z.string().optional(),
  options: z.array(z.string()).optional(),
  unit: z.string().nullable().optional(),
  switch_label: z.string().nullable().optional(),
  number_label: z.string().nullable().optional(),
  columns: z.array(z.string()).optional(),
  column_label: z.string().nullable().optional(),
  rows: z.array(z.string()).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

// ─── Landing Banner Schemas ──────────────────────────────

export const CreateLandingBannerSchema = z.object({
  title: z.string().min(1, 'Titulo es requerido').max(200),
  subtitle: z.string().max(500).nullable().optional(),
  cta_text: z.string().min(1).max(100).default('Ver mas'),
  cta_url: z.string().min(1, 'URL del CTA es requerida'),
  image_url: z.string().url().nullable().optional(),
  background_color: z.string().max(50).default('#43276c'),
  position: z.enum(['hero', 'mid_feed', 'bottom'], { message: 'Posicion invalida' }),
  target_category: z.string().nullable().optional(),
  target_zone: z.string().nullable().optional(),
  target_event_type: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  priority: z.number().int().min(0).default(0),
  provider_id: z.string().uuid().nullable().optional(),
});

export const UpdateLandingBannerSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).nullable().optional(),
  cta_text: z.string().min(1).max(100).optional(),
  cta_url: z.string().min(1).optional(),
  image_url: z.string().url().nullable().optional(),
  background_color: z.string().max(50).optional(),
  position: z.enum(['hero', 'mid_feed', 'bottom']).optional(),
  target_category: z.string().nullable().optional(),
  target_zone: z.string().nullable().optional(),
  target_event_type: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  priority: z.number().int().min(0).optional(),
  provider_id: z.string().uuid().nullable().optional(),
});

// ─── Provider Promotions (Coupons) ────────────────────────

const CouponCodeSchema = z.string()
  .min(PROVIDER_PROMO_LIMITS.COUPON_CODE_MIN_LENGTH, `El codigo debe tener al menos ${PROVIDER_PROMO_LIMITS.COUPON_CODE_MIN_LENGTH} caracteres`)
  .max(PROVIDER_PROMO_LIMITS.COUPON_CODE_MAX_LENGTH, `El codigo no puede exceder ${PROVIDER_PROMO_LIMITS.COUPON_CODE_MAX_LENGTH} caracteres`)
  .regex(PROVIDER_PROMO_LIMITS.COUPON_CODE_REGEX, 'El codigo solo puede contener mayusculas y numeros');

export const CreateProviderPromotionSchema = z.object({
  internal_name: z.string().min(1, 'Nombre interno requerido').max(200),
  external_name: z.string().min(1, 'Nombre publico requerido').max(200),
  description: z.string().max(1000).optional().nullable(),
  discount_pct: z.number()
    .min(PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT, `Descuento minimo ${PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT}%`)
    .max(PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT, `Descuento maximo ${PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT}%`),
  start_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().min(1, 'Fecha de fin requerida'),
  coupon_code: CouponCodeSchema,
  usage_limit: z.number().int().positive().nullable().optional(),
  max_uses_per_user: z.number().int().positive().nullable().optional(),
  service_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos un servicio'),
  status: z.enum(['draft', 'active']).default('active'),
}).refine(
  (data) => new Date(data.start_date) < new Date(data.end_date),
  { message: 'La fecha de inicio debe ser anterior a la fecha de fin', path: ['end_date'] }
).refine(
  (data) => {
    const days = (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24);
    return days >= PROVIDER_PROMO_LIMITS.MIN_DAYS_DURATION && days <= PROVIDER_PROMO_LIMITS.MAX_DAYS_DURATION;
  },
  { message: `La duracion debe ser entre ${PROVIDER_PROMO_LIMITS.MIN_DAYS_DURATION} y ${PROVIDER_PROMO_LIMITS.MAX_DAYS_DURATION} dias`, path: ['end_date'] }
);

export const UpdateProviderPromotionSchema = z.object({
  external_name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  discount_pct: z.number()
    .min(PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT)
    .max(PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT)
    .optional(),
  end_date: z.string().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  max_uses_per_user: z.number().int().positive().nullable().optional(),
  service_ids: z.array(z.string().uuid()).min(1).optional(),
  status: z.enum(['active', 'cancelled', 'draft']).optional(),
});

export const ValidateCouponSchema = z.object({
  service_id: z.string().uuid('service_id debe ser un UUID valido'),
  coupon_code: z.string().min(1, 'Codigo requerido').max(32),
  user_id: z.string().uuid().optional(),
});

// ─── Service Admin Comments Schemas ──────────────────────────
const SERVICE_COMMENT_CATEGORY_VALUES = [
  'sugerencia',
  'reconocimiento',
  'aviso',
  'oportunidad',
  'recordatorio',
] as const;

export const CreateServiceCommentSchema = z.object({
  category: z.enum(SERVICE_COMMENT_CATEGORY_VALUES, { message: 'Categoria invalida' }),
  comment: z.string()
    .min(SERVICE_COMMENT_LIMITS.MIN_LENGTH, 'El comentario no puede estar vacio')
    .max(SERVICE_COMMENT_LIMITS.MAX_LENGTH, `Maximo ${SERVICE_COMMENT_LIMITS.MAX_LENGTH} caracteres`),
});

export const UpdateServiceCommentSchema = z.object({
  category: z.enum(SERVICE_COMMENT_CATEGORY_VALUES, { message: 'Categoria invalida' }).optional(),
  comment: z.string()
    .min(SERVICE_COMMENT_LIMITS.MIN_LENGTH, 'El comentario no puede estar vacio')
    .max(SERVICE_COMMENT_LIMITS.MAX_LENGTH, `Maximo ${SERVICE_COMMENT_LIMITS.MAX_LENGTH} caracteres`)
    .optional(),
});

export const UpdateCommentReadStateSchema = z.object({
  is_read: z.boolean().optional(),
  resolved: z.boolean().optional(),
}).refine(d => d.is_read !== undefined || d.resolved !== undefined, {
  message: 'Se requiere is_read o resolved',
});

// ─── Referrals V2 (Provider) ────────────────────────────────
export const ApplyReferralCodeSchema = z.object({
  code: z.string().min(1, 'code es requerido').max(64, 'code muy largo'),
  referredUserId: z.string().uuid('referredUserId debe ser un UUID valido'),
});

export const AssignReferralManualSchema = z.object({
  referrerId: z.string().uuid('referrerId debe ser un UUID valido'),
  referredId: z.string().uuid('referredId debe ser un UUID valido'),
  activate: z.boolean().default(false),
  adminNotes: z.string().max(500).optional(),
}).refine(d => d.referrerId !== d.referredId, {
  message: 'referrerId y referredId no pueden ser iguales',
});

export const UpdateRewardStatusSchema = z.object({
  rewardId: z.string().uuid('rewardId debe ser un UUID valido'),
  status: z.enum(['pending_signup', 'active_sale', 'expired', 'revoked']),
  adminNotes: z.string().max(500).optional(),
});

export const UpdateBenefitSchema = z.object({
  benefitId: z.string().uuid('benefitId debe ser un UUID valido'),
  salesConsumed: z.number().int().min(0).optional(),
  status: z.enum(['pending', 'active', 'consumed', 'expired']).optional(),
  adminNotes: z.string().max(500).optional(),
}).refine(
  d => d.salesConsumed !== undefined || d.status !== undefined || d.adminNotes !== undefined,
  { message: 'Se requiere al menos un campo a actualizar' }
);

export const SetEarlyAdopterSchema = z.object({
  providerId: z.string().uuid('providerId debe ser un UUID valido'),
  earlyAdopterEndsAt: z.string().datetime({ message: 'Fecha ISO invalida' }).nullable(),
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

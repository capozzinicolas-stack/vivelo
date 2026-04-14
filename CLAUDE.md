# CLAUDE.md

Guia completa para trabajar con el codigo de Vivelo. Este archivo documenta toda la arquitectura, reglas de negocio, matematica financiera y convenciones del proyecto.

## Descripcion del Proyecto

Vivelo es un marketplace mexicano de servicios para eventos que conecta clientes con proveedores (catering, audio, decoracion, foto/video, staff, belleza, mobiliario) en 9 zonas. Stack: Next.js 14 App Router, Supabase (auth + DB + storage), Stripe (pagos en MXN), Google Calendar (sync del proveedor), Anthropic Claude (asistente Vivi). Desplegado en Vercel: `solovivelo.com` (consumidor) y `admin.solovivelo.com` (admin).

## Comandos

```bash
npm run dev      # Servidor de desarrollo en localhost:3000
npm run build    # Build de produccion
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
npm start        # Servidor de produccion
```

---

## Arquitectura

### Enrutamiento Dual-Domain

Middleware (`src/middleware.ts`) detecta hostname `admin.*` y reescribe rutas a `/admin-portal/*`, con header `x-admin-portal: 1`. El layout raiz usa este header para ocultar navbar/footer/chat del consumidor. Acceso directo a `/admin-portal/*` desde el dominio principal esta bloqueado en produccion. `/dashboard/admin/*` redirige al subdominio admin.

### Modo Mock / Produccion

Toda integracion verifica env vars placeholder y retorna datos mock cuando no estan configuradas. Check principal: `process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')`. Stripe, Google Calendar y Anthropic tienen sus propios checks. Esto permite desarrollo completo sin credenciales.

### Providers (orden en root layout)

`AuthProvider` → `CatalogProvider` → `CartProvider` → `ChatProvider` → `ToastProvider`

- **AuthProvider**: Sesion + perfil de `profiles` (no auth.users). Roles: `'client' | 'provider' | 'admin'`
- **CatalogProvider**: Categorias/subcategorias/zonas desde `/api/admin/catalog` con fallback a `src/data/categories.ts`
- **CartProvider**: Carrito persistido en localStorage key `'vivelo-cart'`
- **ChatProvider**: Estado del chat con Vivi (mensajes, streaming)

### Flujo de Datos

Paginas publicas principales (`/`, `/servicios`, `/blog`, detalle de servicio, blog post, proveedor) usan Server Components que pre-cargan datos via `server-queries.ts` y los pasan como props a client components para interactividad (filtros, busqueda). Paginas de dashboard son `'use client'` y cargan datos via `useEffect` con queries client-side (`src/lib/supabase/queries.ts`). Las funciones de query verifican `isMockMode()` y retornan datos mock de `src/data/` cuando Supabase no esta configurado.

---

## Autenticacion y Seguridad

### Tres Clientes Supabase

| Cliente | Archivo | Uso | Permisos |
|---------|---------|-----|----------|
| Browser | `src/lib/supabase/client.ts` | Componentes client-side | Sujeto a RLS |
| Server | `src/lib/supabase/server.ts` | Server components, API routes | Sujeto a RLS (usuario autenticado) |
| Admin | `src/lib/supabase/admin.ts` | Webhooks, operaciones admin, crons | **Bypass RLS** completo |

### Patron de Auth en API Routes

```ts
const auth = await requireAuth();          // o requireRole(['admin'])
if (isAuthError(auth)) return auth;        // retorna 401/403
const { user, profile, supabase } = auth;
```

Client-side: `<AuthGuard allowedRoles={['provider']}>` protege paginas.

### Roles y Permisos

| Rol | Puede hacer | Donde se valida |
|-----|-------------|-----------------|
| `client` | Buscar servicios, crear reservas, dejar resenas, gestionar ordenes propias | RLS + API auth |
| `provider` | CRUD servicios, ver reservas propias, configurar disponibilidad, sync Google Calendar | RLS + API auth |
| `admin` | Ver todo, moderar resenas, gestionar catalogo, cambiar roles, finanzas | `requireRole(['admin'])` + service-role |

### RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. Politicas clave:
- **profiles**: Lectura solo autenticados, escritura solo owner
- **services**: Lectura publica si `status='active'`, CRUD solo el provider owner
- **bookings**: Lectura/escritura solo `client_id` o `provider_id` (admins via service-role)
- **orders**: Lectura solo `client_id`, admins via service-role
- **extras**: Hereda ownership del servicio padre
- **reviews**: Lectura publica, creacion solo clientes

### Rutas Publicas (sin auth)

`/`, `/login`, `/register`, `/servicios`, `/carrito`, `/blog`, `GET /api/admin/catalog`, `POST /api/stripe/webhook` (validado por firma HMAC)

---

## Matematica de Precios

### Tipos de Precio (`price_unit`)

| Tipo | Formula `base_total` | Ejemplo |
|------|---------------------|---------|
| `por evento` | `base_price` | $1,000 fijo |
| `por persona` | `base_price × guest_count` | $200 × 50 = $10,000 |
| `por hora` | `base_price × event_hours` | $500 × 4h = $2,000 |

**Clasificacion en codigo** (`service-detail-client.tsx:96-98`):
```
isPerHour  = price_unit === 'por hora'
isPerEvento = price_unit === 'por evento'
isPerUnit  = !isPerHour && !isPerEvento  // por persona
```

### Horas del Evento

```
Si hasBaseEventHours (duracion fija, no es 'por hora'):
  eventHours = service.base_event_hours

Si no:
  eventHours = calcHours(startTime, endTime)
  calcHours = Math.max((endMinutes - startMinutes) / 60, 0.5)  // minimo 0.5h
```

`hasBaseEventHours = !!service.base_event_hours && (isPerEvento || isPerUnit)`

### Extras

```
extras_total = Σ(extra.price × quantity)  para todos los extras seleccionados
```

Extras con `depends_on_guests` ajustan `quantity` automaticamente al cambiar invitados. Extras con `depends_on_hours` ajustan al cambiar duracion.

### Total del Item

```
total = base_total + extras_total
```

### Descuento de Campana

```
discount_amount = Math.round(total × (discount_pct / 100))
final_total = total - discount_amount
```

La campana se obtiene via `getActiveCampaignForService(serviceId)` (client-side) o `getActiveCampaignForServiceServer(serviceId)` (server-side, usada en el detalle de servicio SSR) que verifican `campaign_subscriptions` + estado activo + rango de fechas (`start_date <= now <= end_date`).

**IMPORTANTE**: Toda query de campanas activas debe filtrar por `status='active'` **Y** por rango de fechas. Funciones afectadas: `getActiveCampaignForService`, `getActiveCampaignForServiceServer`, `getActiveCampaignsWithServices`, `getActiveCampaignsWithServicesServer`. La query admin `getCampaigns()` SI muestra todas (por diseno) para que admin vea draft/ended/cancelled.

Cron `/api/cron/end-expired-campaigns` (diario 00:15 UTC) transiciona campanas vencidas de `active` → `ended` para mantener la DB consistente.

### Comision

```
COMMISSION_RATE = 0.12  (12% default, en src/lib/constants.ts)

Jerarquia de tasa:
  1. Tasa por categoria (service_categories.commission_rate)
  2. Fallback: COMMISSION_RATE (0.12)

Formula:
  commission = Math.round(total × rate × 100) / 100

Con campana (commission_reduction_pct):
  adjustedRate = Math.max(0, categoryRate - (commission_reduction_pct / 100))
  commission = Math.round(total × adjustedRate × 100) / 100
```

### Conversion a Stripe (centavos MXN)

```
amountInCents = Math.round(amount_en_pesos × 100)
currency: 'mxn'
```

### Redondeo

Toda la matematica financiera usa: `Math.round(valor × 100) / 100` (redondeo a 2 decimales, centavos MXN).

---

## Flujo de Checkout Completo

### Paso 1: Carrito → Checkout
- Usuario hace click en "Proceder al Checkout" desde `/carrito`
- Si no autenticado: redirect a `/login?redirect=/checkout`

### Paso 2: Verificacion de Disponibilidad
- Para cada item del carrito: fetch servicio → resolver buffers → calcular tiempos efectivos → `checkVendorAvailability()`
- Si algun item no disponible: boton de pago deshabilitado

### Paso 3: Crear Orden
```
createOrder({
  client_id, subtotal: cartTotal, platform_fee: commission,
  total: finalTotal, discount_total, original_total
})
→ Order con status 'pending'
```

### Paso 4: Crear PaymentIntent
```
POST /api/stripe/create-payment-intent
  { orderId, amount: finalTotal }
→ Stripe PaymentIntent en centavos MXN
→ Retorna clientSecret
```

El servidor valida: orden existe, pertenece al usuario, campanas siguen activas.

### Paso 5: Pago con Stripe Elements
- `stripe.confirmPayment()` con redirect `'if_required'` (3D Secure)
- Si mock mode: salta Stripe, crea bookings directo

### Paso 6: Post-Pago (client-side)
- `createBookingsForOrder()` crea un Booking + SubBookings por cada item del carrito
- Cada booking incluye snapshots: `commission_rate_snapshot`, `cancellation_policy_snapshot`, `billing_type_snapshot`, `effective_start/end`
- Limpia carrito, redirect a `/checkout/confirmacion/[orderId]`

### Paso 7: Webhook de Stripe (server-side, paralelo)
- `payment_intent.succeeded`: Order → `status='paid'`, todos los bookings → `status='confirmed'`
- Push cada booking a Google Calendar del proveedor
- Idempotencia via tabla `stripe_webhook_events`

### Relacion de datos
```
Order (1) → (N) Bookings → (N) SubBookings
Order.stripe_payment_intent_id = compartido por todos los bookings
Booking.order_id = referencia a la orden
```

---

## Maquina de Estados de Booking

```
pending ──→ confirmed ──→ in_progress ──→ completed (terminal)
  │              │              │
  ├──→ cancelled ├──→ cancelled ├──→ cancelled (terminal)
  │              │
  └──→ rejected  └──→ in_review ──→ completed
       (terminal)                     (terminal)
```

| Transicion | Disparador | Quien |
|------------|-----------|-------|
| pending → confirmed | Webhook `payment_intent.succeeded` | Sistema (Stripe) |
| pending → cancelled | Cancelacion manual | Cliente, proveedor o admin |
| pending → rejected | Rechazo manual | Proveedor o admin |
| confirmed → in_progress | Verificacion de `start_code` | Proveedor |
| confirmed → cancelled | Cancelacion con politica de reembolso | Cliente, proveedor o admin |
| confirmed → completed | Manual o auto-complete | Admin o cron |
| in_progress → completed | Verificacion de `end_code` o auto-complete | Cliente o cron |
| in_progress → cancelled | Cancelacion | Cliente, proveedor o admin |

**Codigos de Verificacion:**
- Cron diario genera `start_code` y `end_code` (6 digitos) para bookings confirmados del dia
- Proveedor verifica `start_code` → booking pasa a `in_progress`
- Cliente verifica `end_code` → booking pasa a `completed`
- `end_code_deadline` = fecha_evento + 3 dias habiles. Si pasa, cron auto-completa.

---

## Cancelacion y Reembolsos

### Calculo de Reembolso (`src/lib/cancellation.ts`)

```
1. hoursUntilEvent = (fechaEvento - ahora) / (1000 × 60 × 60)
2. Ordenar reglas de la politica por min_hours DESC
3. Primera regla donde hoursUntilEvent >= rule.min_hours:
   refund_percent = rule.refund_percent
   refund_amount = Math.round(totalAmount × refund_percent) / 100
4. Si ninguna regla aplica: refund = 0
```

### Flujo de Cancelacion (`/api/bookings/cancel`)

1. **Auth**: Cliente, proveedor o admin pueden cancelar
2. **Validacion**: No se puede cancelar si ya esta `cancelled`, `completed` o `rejected`
3. **Bookings pending**: Se cancelan directo, sin politica de reembolso
4. **Bookings confirmed+**: Se aplica politica de cancelacion
5. **Stripe refund**: Se busca `stripe_payment_intent_id` primero en la orden (via `booking.order_id`), fallback al booking directo (legacy)
6. **Recalculo de comision**:
   ```
   retainedAmount = booking.total - refund_amount
   newCommission = Math.round(retainedAmount × commission_rate_snapshot × 100) / 100
   ```
7. **DB update**: `status='cancelled'`, `refund_amount`, `refund_percent`, `commission` recalculada
8. **Side effects** (no-blocking): eliminar evento de Google Calendar, enviar email de cancelacion

### Dashboards Post-Cancelacion

Para bookings cancelados con reembolso, todos los dashboards muestran valores efectivos:
```
effective_total = booking.total - booking.refund_amount
```

---

## Sistema de Disponibilidad

### Buffers

| Campo | Nivel | Descripcion |
|-------|-------|-------------|
| `buffer_before_minutes` | Servicio | Minutos de preparacion antes |
| `buffer_after_minutes` | Servicio | Minutos de limpieza despues |
| `global_buffer_before_minutes` | Proveedor | Override global si `apply_buffers_to_all=true` |
| `global_buffer_after_minutes` | Proveedor | Override global si `apply_buffers_to_all=true` |

**Precedencia** (`resolveBuffers()` en `availability.ts`):
1. Si `provider.apply_buffers_to_all = true` → usar buffers globales del proveedor
2. Si no → usar buffers del servicio
3. Default: 0 minutos

### Tiempos Efectivos

```
effective_start = start_datetime - bufferBeforeMinutes (en ms)
effective_end = end_datetime + bufferAfterMinutes (en ms)
```

Los tiempos efectivos se guardan en el booking y se usan para verificar conflictos.

### Verificacion de Disponibilidad (3 capas)

| Capa | Donde | Proposito | Bloquea booking? |
|------|-------|-----------|------------------|
| **Client-side** | `service-detail-client.tsx` useEffect | Feedback visual en tiempo real | No (advisory) |
| **Checkout** | `checkout/page.tsx` al cargar | Re-verificacion pre-pago | No (deshabilita boton) |
| **Server-side** | `createBooking()` en `queries.ts` | Guard final contra race conditions | **Si** (throw error) |

### RPC `check_vendor_availability` (PostgreSQL)

```sql
-- Cuenta bookings con overlap (pending o confirmed)
-- Formula de overlap: effective_start < p_end AND effective_end > p_start
-- Verifica calendar blocks (manuales + Google Calendar sync)
-- Compara contra max_concurrent_services del proveedor
-- available = (overlapping < max_concurrent) AND NOT has_block
```

### Concurrencia

`profiles.max_concurrent_services` (default 1): cuantos servicios puede tener el proveedor al mismo tiempo. Configurable en `/dashboard/proveedor/configuracion`.

### Eventos que Cruzan Medianoche

Para servicios con `base_event_hours`, el calculo usa `Date` math (no strings):
```ts
const endDate = new Date(startDate.getTime() + base_event_hours * 60 * 60 * 1000);
// Maneja correctamente 18:00 + 8h = 02:00 del dia siguiente
```

La validacion de "hora fin despues de hora inicio" se salta cuando `eventSpansMidnight = true`.

---

## Patron de Snapshots

Datos financieros se capturan al momento de crear el booking para inmutabilidad historica:

| Snapshot | Que guarda | Por que |
|----------|-----------|---------|
| `commission_rate_snapshot` | Tasa de comision por categoria | Las tasas pueden cambiar |
| `cancellation_policy_snapshot` | Politica completa (nombre + reglas) | Las politicas pueden cambiar |
| `billing_type_snapshot` | `price_unit` del servicio | El tipo de precio puede cambiar |
| `effective_start/end` | Tiempos con buffers incluidos | Los buffers pueden cambiar |
| `discount_amount/pct` | Descuento de campana aplicado | La campana puede terminar |

---

## Integraciones

### Stripe
- **Moneda**: MXN, montos en pesos (centavos para la API)
- **Webhook**: `POST /api/stripe/webhook` con firma HMAC. Tabla `stripe_webhook_events` para idempotencia
- **Eventos**: `payment_intent.succeeded` (confirma order+bookings), `payment_intent.payment_failed` (log), `charge.refunded` (log de confirmacion)
- **Refund**: Se busca PI desde `orders.stripe_payment_intent_id` via `booking.order_id`, con fallback a `booking.stripe_payment_intent_id` (legacy)

### Google Calendar ⚠️ NO INTEGRAR POR AHORA
El codigo existe pero **no se esta usando en produccion**. No desarrollar ni expandir esta integracion hasta nuevo aviso. El codigo puede quedar como referencia pero no debe activarse.
- OAuth con HMAC-signed state, tokens encriptados con AES-256-GCM
- Sync Google → Vivelo crea `vendor_calendar_blocks`
- Push de bookings al calendario del proveedor

### Anthropic (Chat Vivi) — ESTABLE
- **Modelo**: `claude-sonnet-4-20250514`, streaming SSE desde `/api/chat`
- **Tools**: `search_services`, `get_service_details`, `check_availability`, `calculate_price`
- **Loop agentico**: Max 5 rondas de tool-use
- **Estado**: Funciona en produccion, no hay planes de cambio

### WhatsApp via Mirlo — Fase 2 (Event-Driven)
- **Arquitectura**: Vivelo dispara eventos a Mirlo (`send-template`), Mirlo gestiona templates/flows/broadcasts. Vivelo solo logea y expone APIs read-only
- **API**: `https://api.mirlo.com/v1`, auth via header `X-API-Key`
- **Env vars**: `MIRLO_API_KEY`, `MIRLO_ORGANIZATION_ID`, `MIRLO_ORGANIZATION_ADDRESS`, `MIRLO_WEBHOOK_SECRET` (para APIs de Mirlo)
- **Mock mode**: Si `MIRLO_API_KEY` falta o es `'mirlo_placeholder'` → todo se logea pero no se envia
- **Cliente Mirlo**: `src/lib/mirlo.ts` — fetch wrapper, `getTemplateIdByName()` con cache por cold start, sin funciones de broadcast
- **Servicio WA**: `src/lib/whatsapp.ts` — 25 event types, `sendWhatsAppEvent()` + 25 funciones de conveniencia fire-and-forget. Template name resuelto via `TEMPLATE_MAP` + cache de Mirlo
- **Telefono**: `profiles.phone` guarda 10 digitos (ej: `5512345678`), se convierte a E.164 (`+525512345678`). Si `phone` es null → skip silencioso
- **DB**: 1 tabla `whatsapp_events` + 2 enums (`wa_event_type` con 25 valores, `wa_log_status`), migracion `00117` (reemplaza 00116)
- **25 event types**: provider_welcome, provider_service_approved/rejected/needs_revision, provider_new_booking, provider_booking_cancelled/rejected/completed, provider_event_reminder, provider_start_code, provider_new_review, provider_fiscal_approved/rejected, provider_banking_approved/rejected, provider_admin_comment, client_welcome, client_booking_confirmed/cancelled/rejected/completed, client_event_reminder, client_verification_codes, client_event_started, admin_manual
- **Hooks non-blocking (11 archivos)**: Stripe webhook (confirmed + provider new booking), cancel (client + provider), send-event-codes (client codes + provider start_code), service-status-email (approved + rejected + needs_revision), send-event-reminders (client + provider), register-form (welcome), auto-complete (client + provider), verify-code (event started + completed), fiscal status (approved/rejected), admin comments, admin bookings status (rejected)
- **APIs Mirlo**: `GET /api/mirlo/provider-status?phone=X` y `GET /api/mirlo/client-status?phone=X` — read-only, auth via `X-Mirlo-Secret` header
- **Welcome endpoint**: `POST /api/whatsapp/welcome` — publico con dedup 24h, llamado desde register-form
- **Admin notify**: `POST /api/admin/whatsapp/notify` — admin-only, para hooks client-side
- **Admin dashboard**: `/admin-portal/dashboard/whatsapp` — metricas only (stats cards, distribucion por tipo, tabla de eventos recientes con filtros). Sin gestion de templates ni envios manuales
- **Admin APIs**: `GET /api/admin/whatsapp/messages` (lista events con filtros), `GET /api/admin/whatsapp/stats` (aggregates)
- **Types**: `WaEventType`, `WaLogStatus`, `WhatsAppEvent` en `database.ts`. Schemas: `WelcomeWhatsAppSchema`, `AdminWhatsAppNotifySchema` en `api-schemas.ts`
- **NO se toca**: commission.ts, cancellation.ts, booking-state-machine.ts, patron de snapshots, checkout flow

---

## Convenciones

- **Path alias**: `@/*` → `./src/*`
- **UI**: shadcn/ui (estilo new-york), Radix UI + CVA, iconos de lucide-react
- **Forms**: React Hook Form + Zod. API: `validateBody(request, Schema)` desde `src/lib/validations/api-schemas.ts`
- **Estilos**: Tailwind con CSS variables. Colores de marca: `gold (#ecbe38)`, `deep-purple (#43276c)`, `off-white (#fcf7f4)`. Font: Helvetica Now Display
- **Idioma**: Todo el UI, errores y muchos comentarios en espanol mexicano. Logs: `[Modulo] Mensaje`
- **Safelist**: Clases Tailwind dinamicas de la DB estan safelisteadas en `tailwind.config.ts`

---

## Cosas que NO se Deben Tocar sin Cuidado

| Area | Razon |
|------|-------|
| Migraciones SQL ya desplegadas (`supabase/migrations/`) | Modificarlas no tiene efecto; crear nuevas migraciones en su lugar |
| `src/app/api/stripe/webhook/route.ts` | Idempotencia, firma HMAC, flujo de confirmacion — cambios pueden perder pagos |
| Tabla `stripe_webhook_events` | Base de la idempotencia de webhooks |
| `src/lib/supabase/admin.ts` | Bypass de RLS — nunca exponer service-role key al cliente |
| `src/middleware.ts` | Controla routing de admin, sesion, y seguridad de dominios |
| Patron de snapshots en checkout | Eliminar snapshots rompe la inmutabilidad financiera e historica |
| Formula de comision (`src/lib/commission.ts`) | Afecta pago a proveedores — cualquier cambio debe ser verificado |

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── (rutas publicas)        /, /login, /register, /servicios, /carrito, /blog
│   ├── checkout/               Flujo de pago + confirmacion
│   ├── dashboard/
│   │   ├── cliente/            Reservas, perfil, referidos
│   │   └── proveedor/          Servicios CRUD, calendario, campanas, configuracion
│   ├── admin-portal/           Dashboard admin (admin.solovivelo.com)
│   └── api/
│       ├── stripe/             create-payment-intent, webhook
│       ├── bookings/           cancel, verify-code
│       ├── google-calendar/    auth, callback, sync, cron-sync, status, disconnect
│       ├── cron/               auto-complete, send-event-codes, end-expired-campaigns
│       ├── admin/              catalog, users, reviews, providers/commission
│       ├── chat                Vivi AI (SSE streaming)
│       ├── reviews             CRUD resenas
│       └── referrals/apply     Sistema de referidos
├── components/
│   ├── ui/                     shadcn/ui base (button, card, dialog, select, etc.)
│   ├── layout/                 navbar, footer, mobile-bottom-nav, category-mega-menu
│   ├── homepage/               Secciones del home (featured, top-rated, campaigns, blog)
│   ├── services/               service-detail-client, service-card, extras-selector, filters
│   ├── checkout/               payment-form, stripe-payment-form, booking-summary
│   ├── chat/                   chat-bubble, chat-panel, chat-message
│   ├── auth/                   auth-guard, login-form, register-form
│   ├── dashboard/              sidebar, stats-card, create-review-dialog
│   ├── admin/                  admin-sidebar, admin-login-form, period-filter
│   ├── marketing/              promo-banner
│   └── (sueltos)               booking-detail-dialog, media-upload, home-search-bar
├── providers/                  auth, catalog, cart, chat, stripe, toast
├── hooks/                      use-auth, use-toast, use-utm-capture, use-impression-tracker
├── lib/
│   ├── supabase/               client, server, admin, queries, server-queries, storage, middleware
│   ├── chat/                   system-prompt, tools, tool-executor
│   ├── google-calendar/        client, encryption, sync
│   ├── auth/                   api-auth (requireAuth, requireRole)
│   ├── validations/            api-schemas (Zod)
│   ├── availability.ts         resolveBuffers, calculateEffectiveTimes
│   ├── cancellation.ts         calculateRefund
│   ├── commission.ts           calculateCommission, getCategoryCommissionRate
│   ├── booking-state-machine.ts  Transiciones validas
│   ├── constants.ts            COMMISSION_RATE, PRICE_UNITS, TIME_SLOTS, zonas
│   ├── analytics.ts            Tracking de impresiones
│   ├── email.ts                Emails transaccionales
│   ├── stripe.ts               Init de Stripe
│   ├── sku.ts                  Generacion de SKUs
│   └── icon-registry.ts       Mapeo iconos Lucide
├── data/                       Mock data + categories estaticas + category-fields-config
└── types/
    ├── database.ts             Todos los tipos: Service, Booking, Order, Profile, Campaign...
    └── chat.ts                 Tipos del chat

supabase/migrations/            43 migraciones SQL secuenciales
agentes-de-ia/                  Definiciones de agentes AI + auditorias
```

---

## Base de Datos

Supabase con RLS en todas las tablas.

### Tablas Principales

| Tabla | Proposito |
|-------|-----------|
| `profiles` | Usuarios (client/provider/admin), datos bancarios, buffers, comision |
| `services` | Servicios de proveedores con pricing, category_details, base_event_hours |
| `extras` | Add-ons opcionales por servicio |
| `bookings` | Reservas con snapshots financieros y tiempos efectivos |
| `sub_bookings` | Items individuales (extras) dentro de un booking |
| `orders` | Ordenes de compra (1 order : N bookings) |
| `order_items` | Items de la orden |
| `vendor_calendar_blocks` | Bloques de disponibilidad (manuales + Google sync) |
| `google_calendar_connections` | Tokens OAuth encriptados del proveedor |
| `cancellation_policies` / `cancellation_rules` | Politicas de cancelacion con reglas escalonadas |
| `service_categories` / `service_subcategories` / `service_zones` | Catalogo dinamico |
| `campaigns` / `campaign_subscriptions` | Campanas de descuento |
| `featured_placements` | Servicios destacados (pagados) |
| `reviews` | Resenas con moderacion (pending → approved/rejected) |
| `notifications` | Notificaciones in-app |
| `blog_posts` | Articulos del blog con SEO (meta_title, meta_description, focus_keyword, tags, og_image, author_id) |
| `blog_post_links` | Asociacion blog↔servicios/proveedores (FK cascade) |
| `showcase_items` / `site_banners` | Contenido de marketing |
| `stripe_webhook_events` | Idempotencia de webhooks |
| `landing_page_banners` | Banners contextuales para landing pages (hero, mid_feed, bottom) |

Admin usa service-role key para bypass de RLS en todas las operaciones administrativas.

---

## Estado de Modulos

| Modulo | Estado | Notas |
|--------|--------|-------|
| Alta de servicios (proveedor) | ✅ Terminado | CRUD completo con extras, precios, categorias. Flujo: Creacion → pending_review → (admin aprueba) → active ↔ paused / (admin solicita ajustes) → needs_revision → (proveedor corrige y reenvia) → pending_review / (admin rechaza) → archived. Admin puede dejar notas en `admin_notes` al solicitar ajustes o rechazar. Proveedor ve las notas en lista y al editar, con boton "Guardar y Reenviar a Revision". |
| Onboarding proveedor | ✅ Terminado | Banner persistente en dashboard hasta completar: datos de empresa (company_name, bio) + datos bancarios (RFC, CLABE, documento). Secciones en `/configuracion`. Helper: `getProviderOnboardingStatus()` |
| Extras por servicio | ✅ Terminado | Logica de min/max, depends_on_guests/hours, imagen y descripcion (150 chars) |
| Calculo de precios (detalle) | ✅ Terminado | Todos los price_unit, extras, descuentos |
| Carrito | ✅ Terminado | Edicion, recalculo, persistencia localStorage, agrupacion por evento, direccion con Google Places + validacion de zona |
| Zonas geograficas | ✅ Terminado | 9 zonas, Google Places Autocomplete, fallback manual, validacion de cobertura en carrito |
| Campanas (admin) y Promociones (proveedor) | ✅ Terminado | Admin crea campanas, proveedores inscriben servicios, descuento se aplica en detalle + checkout. Todas las queries de campanas activas validan `status='active'` + `start_date <= now <= end_date`. Cron `end-expired-campaigns` transiciona vencidas a `ended` diariamente. Proveedores pueden crear sus propias promociones con cupones compartibles (absorben 100% del descuento, comision Vivelo intacta). Ver seccion "Promociones del Proveedor". |
| Admin Portal | ✅ Terminado | KPIs, moderacion, finanzas, catalogo, usuarios, gestion de usuarios (invitar/pausar/borrar), recuperacion de contrasena, contrasena temporal, perfil admin. Booking status updates usan API route con service-role (bypass RLS) |
| Chat Vivi (AI) | ✅ Terminado | Estable, sin planes de cambio |
| Checkout + Stripe | ✅ Terminado | Pago + rollback compensatorio (C1 resuelto). Si `createBookingsForOrder` falla mid-loop, el cliente llama `/api/checkout/rollback-order` que refunda el PI completo + cancela bookings parciales + marca orden cancelled (idempotente via 409). |
| Cancelacion + reembolsos | ✅ Terminado | Flujo de cancelacion estable con calculo de refund, recalculo de comision, limpieza de Google Calendar y emails. |
| Reviews/resenas | 🔲 Sin uso real | Codigo existe, moderacion implementada, sin resenas reales |
| Google Calendar | 🚫 No integrar | Codigo existe pero NO se usa — no tocar |
| Codigos de verificacion | 🔲 Implementado | Cron + endpoints existen, sin pruebas reales en produccion |
| WhatsApp via Mirlo (Fase 2) | ✅ Terminado | Event-driven: 25 event types, Mirlo gestiona templates/flows/broadcasts, Vivelo solo dispara eventos y logea. 11 hooks en flujos existentes (stripe, cancel, codes, reminders, service-status, register, auto-complete, verify-code, fiscal, comments, bookings-status). APIs read-only para Mirlo. Dashboard admin metricas-only. Mock mode sin env vars. |
| Mis Eventos (cliente) | ✅ Terminado | Agrupacion de servicios por `event_name` con gasto total y desglose |
| SEO Slugs (servicios) | ✅ Terminado | URLs publicas usan `/servicios/{slug}` en vez de UUID. UUIDs redirigen 301. |
| SEO Slugs (proveedores) | ✅ Terminado | URLs publicas usan `/proveedores/{slug}` en vez de UUID. UUIDs redirigen 301. Trigger SQL auto-genera slug al crear perfil. |
| SEO Canonicals | ✅ Terminado | Canonical URLs en servicios, proveedores y blog. Zone metadata corregido a 9 zonas reales. |
| Blog CMS Completo | ✅ Terminado | Editor WYSIWYG Tiptap (HTML), campos SEO, upload de imagenes, links a servicios/proveedores, tags con filtrado. Dual renderer: HTML (nuevo) + markdown (fallback legacy) |
| Blog SEO Engine | ✅ Terminado | TOC auto-generado, tiempo de lectura, posts relacionados por tags, busqueda en lista, RSS feed (/blog/feed.xml), YouTube embeds |
| SSR Paginas Publicas | ✅ Terminado | `/servicios` y `/blog` renderizan server-side para indexacion de Google. Datos se pasan como props a client components. JSON-LD ItemList en servicios, Article en blog posts |
| Share Buttons | ✅ Terminado | Componente `ShareButton` reutilizable (`src/components/ui/share-button.tsx`). Native share en mobile, dropdown (WhatsApp, Facebook, X, copiar link) en desktop. En servicios, blog y proveedores |
| Landing Pages SEO | ✅ Terminado | Paginas de aterrizaje SSR para zonas, categorias, categorias+zonas y tipos de evento. Cada pagina tiene JSON-LD ItemList + BreadcrumbList, canonical URL, contenido SEO unico, internal linking cruzado. Navegacion conectada: navbar, mega menu, homepage categories, mobile category bar y subcategory showcase apuntan a `/servicios/categoria/[slug]` (no query params). Zone badges en service cards son links a `/servicios/zona/[slug]`. Footer tiene secciones Zonas y Eventos. Homepage tiene seccion "Que estas celebrando?". UX: `LandingPageClient` con sidebar de filtros desktop + Sheet mobile (patron identico a `/servicios`), sort selector (5 opciones), smart empty states con sugerencias, stats bar, CollapsibleSection para links internos (desktop siempre visible, mobile collapsible), Button CTAs. `ServiceFilters` acepta `hideCategory`/`hideZone` para ocultar filtros ya fijados por la pagina. Categoria pages leen `?subcategoria=` de searchParams. |
| Paginas de Zona | ✅ Terminado | `/servicios/zona/[zona]` — 9 zonas con SSR, servicios filtrados por zona, contenido descriptivo, links a categorias en la zona y otras zonas. Antes solo redirigian a `/servicios?zona=x`. |
| Paginas de Categoria | ✅ Terminado | `/servicios/categoria/[categoria]` — 6 categorias con SSR, servicios filtrados por categoria, contenido descriptivo, links a zona+categoria y otras categorias. Dinamicas desde DB (admin agrega categoria → pagina se genera). |
| Paginas Categoria+Zona | ✅ Terminado | `/servicios/categoria/[categoria]/[zona]` — Combinaciones categoria×zona con SSR. Dinamicas. Sitemap solo incluye combos con servicios activos. |
| Paginas Tipo de Evento | ✅ Terminado | `/eventos/[tipo]` — 14 tipos de evento (bodas, xv-anos, baby-shower, corporativos, etc.). Definiciones en `src/data/event-types.ts`. Todos los servicios, ordenados por categorias relevantes al tipo de evento. |
| Banners Contextuales Landing | ✅ Terminado | Sistema de banners editable desde admin (`/dashboard/banners`). Tabla `landing_page_banners` con 3 posiciones (hero, mid_feed, bottom), segmentacion por categoria/zona/tipo de evento, prioridad por especificidad. Query `getLandingBannersServer()` en server-queries.ts con matching contextual. Componentes: `LandingHeroBanner`, `LandingMidFeedBanner`, `LandingBottomBanner` en `src/components/landing/landing-banner.tsx`. Mid-feed se inyecta en grid despues de card #6 via `LandingPageClient`. API CRUD: `GET/POST /api/admin/banners`, `PATCH/DELETE /api/admin/banners/[id]`. Si no hay banners activos, las paginas renderizan normalmente (null graceful). |
| Newsletter + Email Capture | ✅ Terminado | Seccion en homepage + exit-intent popup. API `POST /api/newsletter/subscribe` con rate limiting (3/min por IP), dedup de emails via Resend audience, welcome email. Hook compartido `useNewsletterSubscribe` en `src/hooks/use-newsletter-subscribe.ts`. localStorage key `vivelo-newsletter-subscribed` para no mostrar si ya suscrito. |
| Testimonios Homepage | ✅ Terminado | Server component `testimonials-section.tsx` con reviews reales (rating >= 4, aprobadas). Query `getTopRatedReviewsServer()` en server-queries.ts. |
| Servicios Relacionados | ✅ Terminado | Seccion "Servicios similares" en detalle de servicio (`/servicios/[id]`). Query `getRelatedServicesServer()` por misma categoria, 4 cards. |
| JSON-LD Reviews | ✅ Terminado | Schema.org Review array en JSON-LD de detalle de servicio. Hasta 5 reviews con rating, author, datePublished. |
| Checkout Progress Bar | ✅ Terminado | Componente `checkout-progress.tsx` con 3 pasos visuales (Resumen → Pago → Confirmacion). |
| Indicadores de Urgencia | ✅ Terminado | Badge amber en detalle de servicio cuando `bookingCount >= 5`. Usa datos reales de reservas (all-time). |
| next/image Migration | ✅ Terminado | service-card, media-gallery, extras-selector migrados de `<img>` a `next/image` con `fill` + `sizes`. Hero image convertido a WebP. |
| Dynamic Imports | ✅ Terminado | Tiptap RichTextEditor carga via `next/dynamic` con `ssr: false` + skeleton loading. |
| Image Optimization Config | ✅ Terminado | AVIF+WebP formats, 30-day minimumCacheTTL, optimized deviceSizes/imageSizes en `next.config.mjs`. Cache headers para `/_next/static` (immutable), `/_next/image` (30d), `hero-bg.webp` (immutable). |
| Accessibility (aria-labels) | ✅ Terminado | Todos los icon-only buttons tienen `aria-label`. ~35 buttons en ~20 archivos. ToolbarButton de Tiptap usa `aria-label={title}` para cubrir todos los toolbar buttons. |
| Contrast WCAG AA | ✅ Terminado | `text-white/80` → `text-white/90`, `text-white/70` → `text-white/90`, `text-white/50` → `text-white/70`, `placeholder:text-white/50` → `placeholder:text-white/70` en homepage, promo-banner, quien-somos, nuevos-proveedores. |
| Terminos y Condiciones | ✅ Terminado | Pagina `/terminos-y-condiciones` con tabs (General + Proveedores). Checkbox obligatorio al registrar proveedor con dialog overlay de resumen. Tabla `terms_acceptances` registra user_id, terms_type, version, full_name, email, ip, user_agent, timestamp. API `POST /api/terms/accept`. Footer link actualizado. |
| Pagina de Proveedor Mejorada | ✅ Terminado | Perfil con stats (eventos realizados, miembro desde), badges de categorias, resenas destacadas (top 5 del proveedor), filtros por zona/categoria/subcategoria + ordenar por precio/rating (solo si 4+ servicios). Client component `provider-services-grid.tsx`. Queries: `getProviderBookingCountServer`, `getProviderReviewsServer`. |
| Datos Fiscales Proveedores (Backend) | ✅ Terminado | Tabla `provider_fiscal_data` aislada (no toca profiles/bookings/snapshots). Modulo `src/lib/fiscal.ts` con validacion RFC, CLABE, regimenes SAT y calculo de retenciones ISR/IVA (solo visualizacion, NO en flujo de pago). API routes: `GET/POST /api/provider/fiscal`, `POST /api/provider/fiscal/documents` (upload a bucket privado `fiscal-documents`), `GET /api/admin/fiscal/[providerId]` (con URLs firmadas), `PATCH /api/admin/fiscal/[providerId]/status`. Zod schemas en api-schemas.ts. Tipos en database.ts. RLS: proveedor lee/escribe propio, admin via service-role. Datos aprobados son inmutables. |
| Datos Fiscales Proveedores (UI Proveedor) | ✅ Terminado | Pagina `/dashboard/proveedor/datos-fiscales` con formulario completo: tipo persona, RFC (validacion por tipo), razon social, regimen fiscal (filtrado por tipo persona), uso CFDI, direccion fiscal (calle, numeros, colonia, CP, municipio, estado), datos bancarios (banco, CLABE), upload de constancia y estado de cuenta. Badge de estado fiscal. Datos aprobados son inmutables (formulario deshabilitado). Link "Datos Fiscales" con icono Receipt en sidebar del proveedor. |
| Datos Fiscales Proveedores (UI Admin) | ✅ Terminado | Pagina `/admin-portal/dashboard/fiscal` con tabla de todos los proveedores con datos fiscales, filtro por estado, busqueda por nombre/email/RFC. Dialog de detalle con toda la info fiscal, direccion, banco, documentos (URLs firmadas). Botones aprobar/rechazar con notas de admin. API `GET /api/admin/fiscal/list` para listar todos. Link "Fiscal" con icono Receipt en admin sidebar. |
| Datos Fiscales (Retenciones en Finanzas) | ✅ Terminado | Card "Liquidacion con Retenciones" en `/admin-portal/dashboard/finanzas`. Muestra por proveedor: pago neto, ISR, IVA, neto tras retenciones, regimen fiscal y estado. Usa `calculateRetentions()` de `fiscal.ts`. Si proveedor no tiene datos fiscales → "Sin datos fiscales". Fetch read-only a `/api/admin/fiscal/list`. NO modifica ningun calculo financiero existente. |
| Import/Export Masivo de Servicios | ✅ Terminado | Proveedores pueden importar hasta 50 servicios via Excel (.xlsx) con plantillas por categoria. Plantillas con dropdowns reales (fflate XML injection). Validacion client-side + server-side. Descarga async de imagenes desde URLs. Servicios creados como `pending_review`. Export de servicios existentes a formato plantilla. Archivos: `src/lib/service-import-export.ts`, `src/app/api/provider/services/import/route.ts`, `src/app/api/provider/services/download-images/route.ts`, `src/components/dashboard/service-import-dialog.tsx`. |
| Categoria BEAUTY | ✅ Terminado | Categoria de belleza (maquillaje, peinado, uñas, spa, barberia). Campos especificos en `category-fields-config.ts`: tipo_servicio, productos_marcas, incluye_prueba, tiempo_por_persona, que_incluye, requerimientos_sitio, not_included. Iconos beauty en icon-registry (Eye, Droplets, Flower). Subcategorias y tags se gestionan desde admin panel (DB-driven). |
| Comentarios Admin→Proveedor (servicios) | ✅ Terminado | Sistema de comentarios one-way donde admins envian notas categorizadas a proveedores sobre sus servicios activos. 5 categorias (sugerencia, reconocimiento, aviso, oportunidad, recordatorio). Tabla aislada `service_admin_comments` (no toca services.admin_notes). Admin puede editar/eliminar propios. Proveedor puede marcar como leido y resuelto. Notificacion in-app + email al crear. Ver seccion "Comentarios Admin → Proveedor". |
| Referidos V1 (proveedor→proveedor) | ✅ Terminado V1 | Sistema de referidos con tiers automaticos segun T&C Seccion 2.4 (Nivel 1: 3 ventas 50% off; Nivel 2: +3 ventas 75% off; Nivel 3: +3 ventas 75% off + 3 meses priority cada 8 referidos). Solo proveedores refieren proveedores — los referidos cliente estan ocultos en V1 (codigo preservado en git). Aplicacion de beneficios es **MANUAL** desde admin (admin revisa y aplica las reducciones de comision en liquidacion). Admin puede asignar referidos manualmente, cambiar status (active/revoked), ajustar sales_consumed, marcar Early Adopter (beneficios en estado `pending` hasta que vence). Ver seccion "Referidos V1 — Proveedor→Proveedor". |

---

## Datos Fiscales — Arquitectura

### Reglas Inquebrantables

1. **NO se toca** `commission.ts`, checkout flow, state machine, ni booking snapshots
2. Tabla `provider_fiscal_data` es 100% aislada — no modifica `profiles`, `bookings`, ni `booking_snapshots`
3. Retenciones ISR/IVA se calculan en `src/lib/fiscal.ts` **solo para visualizacion** en reportes de liquidacion
4. Documentos fiscales van en bucket privado `fiscal-documents` con URLs firmadas (no publicas)
5. Datos aprobados (`fiscal_status = 'approved'`) son inmutables — el proveedor no puede editarlos

### Archivos

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/00107_provider_fiscal_data.sql` | Tabla, enums, RLS, trigger updated_at |
| `src/lib/fiscal.ts` | Validacion RFC/CLABE, regimenes SAT, calculo retenciones, catalogo bancos/CFDI |
| `src/types/database.ts` | Tipos `ProviderFiscalData`, `DireccionFiscal`, `FiscalStatus`, `PersonaType`, `RegimenFiscal` |
| `src/lib/validations/api-schemas.ts` | `CreateFiscalDataSchema`, `UpdateFiscalDataSchema`, `UpdateFiscalStatusSchema` |
| `src/app/api/provider/fiscal/route.ts` | GET (leer propio) + POST (crear/actualizar) |
| `src/app/api/provider/fiscal/documents/route.ts` | POST (upload constancia/estado_cuenta) |
| `src/app/api/admin/fiscal/list/route.ts` | GET (admin lista todos con join a profiles) |
| `src/app/api/admin/fiscal/[providerId]/route.ts` | GET (admin lee datos + URLs firmadas) |
| `src/app/api/admin/fiscal/[providerId]/status/route.ts` | PATCH (admin aprueba/rechaza) |
| `src/app/dashboard/proveedor/datos-fiscales/page.tsx` | UI proveedor: formulario fiscal completo |
| `src/app/admin-portal/dashboard/fiscal/page.tsx` | UI admin: tabla, detalle, aprobar/rechazar |

### Retenciones (solo lectura)

```
netAmount = bookingTotal - commission  (calculado externamente, NO en fiscal.ts)
calculateRetentions(netAmount, regimen, tipoPersona) → { isr_amount, iva_amount, net_after_retentions }
```

Tasas varian por regimen: RESICO (626) = 1.25% ISR, Plataformas (625) = 1% ISR + 8% IVA, PFAE (612) = 10% ISR. Redondeo: `Math.round(valor × 100) / 100`.

---

## Promociones del Proveedor (Cupones)

Sistema donde proveedores crean promociones propias con codigos de cupon compartibles. **El proveedor absorbe el 100% del descuento**; la comision de Vivelo no cambia.

### Decision arquitectonica clave

Reutiliza la tabla `campaigns` (no crea tabla nueva). Solo se extiende con: `source` ('admin'|'provider'), `owner_provider_id`, `coupon_code`, `usage_limit`, `used_count`, `max_uses_per_user`. Esto permite reutilizar el 80% del codigo de checkout existente sin cambios.

### Reglas inquebrantables

1. **NO se toca** `commission.ts`, `cancellation.ts`, ni el patron de snapshots
2. **NO se toca** la matematica de checkout — solo cambia _que_ campana se fetchea, no _como_ se aplica el descuento
3. **NO hay stacking**: una reserva tiene 1 sola `campaign_id` (admin O proveedor, nunca ambas)
4. **`used_count` se incrementa solo despues de pago confirmado** en webhook (idempotente via `stripe_webhook_events` + RPC `increment_campaign_usage`)
5. CHECK constraint en DB obliga: `source='provider'` ⇒ `provider_absorbs_pct=100`, `vivelo_absorbs_pct=0`, `commission_reduction_pct=0`

### Limites anti-abuso (`PROVIDER_PROMO_LIMITS` en `src/lib/constants.ts`)

- Max 5 promos activas por proveedor
- Descuento 5-50%
- Duracion 1-90 dias
- Coupon code 4-16 chars `[A-Z0-9]+`, unico global (case-insensitive)

### Diferencia financiera vs admin campaigns

| Caso | total | discount | client paga | commission | provider neto | vivelo neto |
|------|-------|----------|-------------|------------|---------------|-------------|
| Sin promo | 1000 | 0 | 1000 | 120 (12%) | 880 | 120 |
| Admin campaign 10% off + commission_reduction 5% | 1000 | 100 | 900 | 63 (7% sobre 900) | 837 | 63 |
| **Provider promo 10% off** | **1000** | **100** | **900** | **120 (12% sobre 1000)** | **780** | **120** |

En caso 3 el proveedor absorbe los 100 del descuento completo (880 - 780 = 100), y la comision Vivelo permanece en 120 (calculada sobre `item.total` original, NO sobre `bookingTotal`). Esto sucede automaticamente porque `commission_reduction_pct=0` hace que el bloque `if (campaign.commission_reduction_pct > 0)` en `checkout/page.tsx` no se ejecute.

### Flujo completo

1. **Crear promo**: Proveedor en `/dashboard/proveedor/promociones` → click "Crear" → llena form (nombre, descuento, codigo, fechas, servicios) → POST `/api/provider/promotions` → valida ownership de servicios + limites + unicidad de coupon_code
2. **Compartir**: Proveedor copia link `solovivelo.com/servicios/{slug}?coupon=XYZ` y lo difunde
3. **Cliente con URL**: `servicios/[id]/page.tsx` (Server Component) lee `searchParams.coupon`, valida via `getActiveCampaignForServiceWithCouponServer()`, pasa al detail client
4. **Cliente sin URL**: En `/carrito` ingresa codigo via `<CouponInput>`, valida via `/api/coupons/validate`, actualiza el cart item con `campaign_id`/`discount_pct`/`discount_amount`/`original_total`/`coupon_code`
5. **Checkout** (`createBookingsForOrder`): si item tiene `campaign_id`, fetch by id + revalidar via `isCampaignStillValid()`. Si no, auto-discovery legacy admin-only (`getActiveCampaignForService` filtra `source='admin'`)
6. **Validacion server-side** en `/api/stripe/create-payment-intent`: re-fetch cada campana por id, verificar status/dates/usage_limit/subscription/coupon_code match
7. **Webhook** `payment_intent.succeeded`: tras confirmar bookings, llama RPC `increment_campaign_usage` por cada campaign_id unico
8. **Snapshot**: `bookings.coupon_code` se guarda inmutable junto a `campaign_id`/`discount_amount`/`discount_pct`

### Conflicto admin vs. proveedor

Un servicio que ya tiene una campana de admin activa **rechaza** cupones de proveedor (mensaje: _"Este servicio ya tiene un descuento activo y no es compatible con cupones."_). Validado en `validateCouponServer()`.

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/00112_provider_promotions_and_coupons.sql` | Tabla extension + CHECK constraint + RLS + RPC `increment_campaign_usage` |
| `src/types/database.ts` | `Campaign` extendida con 6 campos + `Booking.coupon_code` + `CartItem.coupon_code` |
| `src/lib/constants.ts` | `PROVIDER_PROMO_LIMITS` |
| `src/lib/validations/api-schemas.ts` | `CreateProviderPromotionSchema`, `UpdateProviderPromotionSchema`, `ValidateCouponSchema` |
| `src/lib/supabase/queries.ts` | `getCampaignById`, `isCampaignStillValid`, `validateCouponClient`, `createProviderPromotion`, `getProviderPromotions`, etc. `getActiveCampaignForService` filtra `source='admin'` |
| `src/lib/supabase/server-queries.ts` | `validateCouponServer`, `getActiveCampaignForServiceWithCouponServer` |
| `src/app/api/provider/promotions/route.ts` | GET (lista propias) + POST (crear) |
| `src/app/api/provider/promotions/[id]/route.ts` | PATCH + DELETE (con soft-cancel si used_count > 0) |
| `src/app/api/coupons/validate/route.ts` | POST publico (sin auth) — clientes invitados pueden previsualizar |
| `src/app/dashboard/proveedor/promociones/page.tsx` | UI proveedor: lista, crear, editar, pausar, eliminar, copiar link |
| `src/components/dashboard/promotion-form-dialog.tsx` | Dialog reutilizable (create/edit, content-locked si used_count > 0) |
| `src/components/cart/coupon-input.tsx` | Input de cupon en carrito por item sin descuento |
| `src/app/checkout/page.tsx` | Logica modificada en `createBookingsForOrder`: si `item.campaign_id` → fetch by id + revalidate, sino → auto-discovery admin-only |
| `src/app/api/stripe/create-payment-intent/route.ts` | Validacion server-side: fetch by id, verifica status/dates/usage/subscription/coupon match |
| `src/app/api/stripe/webhook/route.ts` | Tras confirmar bookings de la orden, llama `increment_campaign_usage` por cada campaign_id unico (try/catch per-RPC, no bloqueante) |
| `src/app/admin-portal/dashboard/marketing/page.tsx` | Tab Campanas con filtro source (todas/admin/proveedor), columnas Origen/Cupon/Usos/Owner, accion "Pausar" para provider campaigns activas |
| `src/components/dashboard/sidebar.tsx` | Link "Mis Promociones" con icono Tag entre "Campanas" y "Notificaciones" |

### NO se toca

- `src/lib/commission.ts` (formula intacta)
- `src/lib/cancellation.ts` (refunds intactos)
- `src/lib/booking-state-machine.ts`
- Snapshot pattern en checkout (solo se agrega `coupon_code` al snapshot)
- `getActiveCampaignsWithServices` (sigue retornando solo activas con dates validas)
- `/api/cron/end-expired-campaigns` (cubre tanto admin como provider campaigns por fecha)

---

## Comentarios Admin → Proveedor (servicios)

Sistema one-way donde admins envian notas categorizadas a proveedores sobre sus servicios activos. Independiente del flujo de moderacion (`services.admin_notes` / `needs_revision`). No impacta finanzas, checkout, state machine, ni snapshots.

### Reglas inquebrantables

1. **Tabla aislada** `service_admin_comments` — no modifica `services`, `bookings`, ni snapshots
2. **One-way**: proveedor no responde. Solo marca como leido / resuelto
3. **Autoria**: solo el autor del comentario puede editar o eliminar
4. **Email best-effort**: fallo de notificacion/email no bloquea la creacion del comentario
5. **Edit resetea `is_read=false`**: al editar un comentario, el proveedor recibe el cambio como no leido

### Modelo de datos (migracion `00113_service_admin_comments.sql`)

```
enum service_comment_category: sugerencia | reconocimiento | aviso | oportunidad | recordatorio

service_admin_comments:
  id (uuid, pk)
  service_id (uuid, fk → services, cascade)
  provider_id (uuid, fk → profiles, cascade)  — denormalizado para RLS/badge
  admin_id (uuid, fk → profiles, set null)
  category (service_comment_category)
  comment (text)
  is_read (boolean, default false)
  resolved_at (timestamptz, nullable)
  created_at, updated_at

Indexes:
  idx_sac_service_id, idx_sac_provider_id, idx_sac_admin_id
  idx_sac_provider_unread (partial: WHERE is_read=false AND resolved_at IS NULL)

RLS:
  Admin manage all (via profiles.role='admin')
  Provider SELECT own (provider_id = auth.uid())
  Provider UPDATE own (is_read, resolved_at)
```

### Categorias (`SERVICE_COMMENT_CATEGORIES` en `src/lib/constants.ts`)

| value | label | severity | icon |
|-------|-------|----------|------|
| sugerencia | Sugerencia | 2 | Lightbulb |
| reconocimiento | Reconocimiento | 0 | Award |
| aviso | Aviso importante | 4 | AlertTriangle |
| oportunidad | Oportunidad | 1 | Sparkles |
| recordatorio | Recordatorio | 3 | Bell |

Severity se reserva para orden futuro de badges (mayor severidad primero).

### Flujo completo

1. **Admin crea comentario**: en `/admin-portal/dashboard/servicios` click icono MessageSquare → dialog `ServiceCommentDialog` → selecciona categoria + escribe texto → `POST /api/admin/services/[id]/comments` → inserta + notifica in-app + envia email via `sendServiceCommentNotification` (best-effort)
2. **Admin edita/elimina**: en el mismo dialog, lista comentarios con botones de edit/delete (solo visibles en comentarios propios via `admin_id === currentUser.id`). PATCH resetea `is_read=false` para renotificar
3. **Proveedor abre panel**: en `/dashboard/proveedor/servicios` ve badge rojo con count de no leidos en cada servicio. Click icono MessageSquare → `ServiceCommentsPanel` (tabs Activos/Resueltos) → auto-marca todos como leidos al abrir (PATCH sin body → markAll)
4. **Proveedor resuelve**: boton "Marcar resuelto" → PATCH con `{commentId, resolved: true}` → setea `resolved_at = now()` y `is_read = true` → comentario pasa al tab "Resueltos"
5. **Proveedor reabre**: desde tab Resueltos boton "Reabrir" → PATCH con `{commentId, resolved: false}` → setea `resolved_at = null`
6. **Desde editor de servicio**: `/dashboard/proveedor/servicios/[id]/editar` tiene boton "Comentarios del equipo" en el header que abre el mismo panel

### Email notification (`sendServiceCommentNotification`)

Template con brand color `#43276c`, borde izquierdo con accent color por categoria, CTA a `/dashboard/proveedor/servicios`. HTML-escape del comentario para seguridad.

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/00113_service_admin_comments.sql` | Enum, tabla, indices, trigger updated_at, RLS |
| `src/types/database.ts` | `ServiceCommentCategory`, `ServiceAdminComment`, registrado en `Database.public.Tables` |
| `src/lib/constants.ts` | `SERVICE_COMMENT_CATEGORIES`, `SERVICE_COMMENT_CATEGORY_MAP`, `SERVICE_COMMENT_LIMITS` (min 1, max 2000 chars) |
| `src/lib/validations/api-schemas.ts` | `CreateServiceCommentSchema`, `UpdateServiceCommentSchema`, `UpdateCommentReadStateSchema` |
| `src/lib/supabase/queries.ts` | `getServiceCommentsByService`, `getServiceCommentsByProvider`, `getUnreadCommentsCountByProvider`, `getUnreadCommentsCountByService`, `markServiceCommentRead`, `markAllServiceCommentsReadByProvider`, `resolveServiceComment`, `unresolveServiceComment` |
| `src/lib/email.ts` | `sendServiceCommentNotification` con template por categoria |
| `src/app/api/admin/services/[id]/comments/route.ts` | GET (lista) + POST (crea + notifica + email) |
| `src/app/api/admin/services/[id]/comments/[commentId]/route.ts` | PATCH (edita, solo autor) + DELETE (solo autor) |
| `src/app/api/provider/services/[id]/comments/route.ts` | GET (lista con ownership) + PATCH (markAll o update single via commentId) |
| `src/components/admin/service-comment-dialog.tsx` | Dialog admin: crear, listar, editar, eliminar |
| `src/components/dashboard/service-comments-panel.tsx` | Panel proveedor: tabs activos/resueltos, marcar resuelto, reabrir |
| `src/app/admin-portal/dashboard/servicios/page.tsx` | Boton MessageSquare en tabla → abre dialog admin |
| `src/app/dashboard/proveedor/servicios/page.tsx` | Boton MessageSquare por servicio con badge rojo de no leidos |
| `src/app/dashboard/proveedor/servicios/[id]/editar/page.tsx` | Boton "Comentarios del equipo" en header del editor |

### NO se toca

- `services.admin_notes` (sigue siendo para `needs_revision`, independiente)
- `src/lib/booking-state-machine.ts`
- `src/lib/commission.ts`
- `notifications` (solo se agrega un row de tipo `'system'` al crear comentario)

---

## Referidos V1 — Proveedor→Proveedor

Sistema scoped-down basado en los T&C de `nuevosproveedores.solovivelo.com` (Seccion 2.4). Solo proveedores refieren proveedores. Los referidos cliente estan ocultos en V1 (codigo preservado en git).

### Reglas inquebrantables

1. **NO se toca** `commission.ts`, `cancellation.ts`, checkout flow, ni el patron de snapshots
2. **Aplicacion de beneficios es MANUAL** — V1 NO automatiza la reduccion de comision. Admin revisa y ajusta `sales_consumed` manualmente en liquidacion
3. **Solo proveedores**: tanto referrer como referred deben ser `role='provider'`. Validado en `register-form` y APIs de admin
4. **Activacion automatica**: primer booking confirmado del referido dispara `status: 'pending_signup' → 'active_sale'` via webhook Stripe (idempotente via `stripe_webhook_events`)
5. **Generacion de beneficios idempotente**: unique index `(provider_id, benefit_type, triggered_by_referral_count)` + funcion pura `diffBenefitsToInsert()` que calcula delta
6. **Early Adopter**: beneficios generados durante el periodo quedan en `status='pending'` (se activan cuando vence `early_adopter_ends_at`). Marcado manual desde admin
7. **Eventos side-effect NO bloqueantes** en webhook: try/catch por bloque, no fallan la confirmacion del pago
8. **NO rollback automatico**: al revocar un reward, los beneficios asociados NO se eliminan automaticamente. Admin debe ajustar manualmente (prevencion de perdida de datos)

### Tiers (definidos en `src/lib/constants.ts`)

```ts
REFERRAL_TIERS = {
  LEVEL_1: { min: 1, max: 3, commission_50_off_sales: 3 },        // 1-3 referidos activos: 3 ventas 50% off
  LEVEL_2: { min: 4, max: 7, commission_75_off_sales: 3 },        // 4-7: +3 ventas 75% off
  LEVEL_3_EVERY: 8,                                               // cada 8: +3 ventas 75% off + 3 meses priority
}
```

`getCurrentTier(activeCount)` retorna 0/1/2/3 segun el count activo. `computeExpectedBenefits(activeCount)` retorna el array esperado de beneficios para ese count.

### Estado de referidos y beneficios

```
referral_rewards.status:
  pending_signup   → referido registrado pero sin booking confirmado
  active_sale      → primer booking confirmado (disparado por webhook)
  expired          → (no usado en V1)
  revoked          → admin revoca por fraude/abuso

provider_referral_benefits.status:
  pending   → generado durante Early Adopter, aun no activo
  active    → disponible para consumir
  consumed  → sales_consumed >= total_sales_granted
  expired   → (reservado para logica futura de expiracion)
```

### Flujo completo

1. **Proveedor se registra con `?ref=VIVELO-XXXXXX`**: `register-form.tsx` captura el codigo, llama `POST /api/referrals/apply` con el `referredId` (uuid del nuevo proveedor) → crea row en `referral_rewards` con `status='pending_signup'`. Solo acepta si referrer y referred son ambos providers
2. **Primer booking confirmado**: webhook Stripe `payment_intent.succeeded` confirma bookings → busca rewards pendientes del cliente `auth_user_id` → actualiza a `active_sale` + `activated_at` + `first_booking_id` → recomputa beneficios para el referrer via `computeExpectedBenefits` + `diffBenefitsToInsert`
3. **Early Adopter check**: al insertar beneficios, `initialBenefitStatus(early_adopter_ends_at)` retorna `'pending'` si Early Adopter activo, sino `'active'`
4. **Proveedor ve su dashboard**: `/dashboard/proveedor/referidos` muestra tier actual, progreso al siguiente, beneficios (50% off / 75% off / priority) con desglose `granted/consumed/remaining`, lista de referidos con status, disclaimer de aplicacion manual
5. **Admin revisa**: `/admin-portal/dashboard/referidos` lista proveedores con referidos, stats globales, busqueda + filtro por tier
6. **Admin aplica reduccion manualmente en liquidacion**: al liquidar un proveedor, revisa beneficios activos → decide aplicar 50% o 75% off de comision en una venta especifica → incrementa `sales_consumed` via PATCH `/api/admin/referrals/benefits/[benefitId]`. Auto-transiciona a `consumed` cuando se completa
7. **Admin puede asignar manualmente** (retroactivo): POST `/api/admin/referrals/assign` con `{referrerId, referredId, activate}` → idempotente, recomputa beneficios si `activate=true`
8. **Admin marca Early Adopter**: POST `/api/admin/referrals/early-adopter` con `{providerId, earlyAdopterEndsAt}` → beneficios nuevos se crean como `pending`

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/00114_provider_referrals_v2.sql` | Extiende `referral_rewards` (activated_at, first_booking_id, admin_notes); crea tabla `provider_referral_benefits`; agrega `profiles.early_adopter_ends_at`; unique index idempotencia |
| `src/types/database.ts` | `ReferralRewardStatus`, `ReferralReward`, `ProviderReferralBenefit`, `ReferralTierSummary`, `ReferralBenefitStatus` |
| `src/lib/constants.ts` | `REFERRAL_TIERS`, `REFERRAL_BENEFIT_LABELS`, `REFERRAL_BENEFIT_COLORS`, `REFERRAL_REWARD_STATUS_LABELS` |
| `src/lib/referrals.ts` | Funciones puras: `getCurrentTier`, `computeExpectedBenefits`, `diffBenefitsToInsert`, `initialBenefitStatus`, `buildTierSummary` |
| `src/lib/validations/api-schemas.ts` | `AssignReferralManualSchema`, `UpdateRewardStatusSchema`, `UpdateBenefitSchema`, `SetEarlyAdopterSchema` |
| `src/app/api/referrals/apply/route.ts` | POST publico — crea `pending_signup` al registrarse. Valida que referrer y referred sean providers |
| `src/app/api/stripe/webhook/route.ts` | Handler `payment_intent.succeeded` — activa rewards pending tras primer booking confirmado, recomputa beneficios (try/catch NO bloqueante) |
| `src/app/api/admin/referrals/route.ts` | GET lista de proveedores con stats (activos/pending/tier/benefits) |
| `src/app/api/admin/referrals/[providerId]/route.ts` | GET detalle: profile + code + rewards (con referred_provider info via two-query join) + benefits + summary |
| `src/app/api/admin/referrals/assign/route.ts` | POST — crea reward manual, idempotente, recomputa beneficios si activate=true |
| `src/app/api/admin/referrals/rewards/[rewardId]/route.ts` | PATCH status/adminNotes — recomputa beneficios al transicionar a `active_sale` (NO rollback al revocar) |
| `src/app/api/admin/referrals/benefits/[benefitId]/route.ts` | PATCH sales_consumed/status/adminNotes — valida `<= total_sales_granted`, auto-transiciona a `consumed` |
| `src/app/api/admin/referrals/early-adopter/route.ts` | POST — setea `profiles.early_adopter_ends_at`, null para limpiar |
| `src/app/dashboard/proveedor/referidos/page.tsx` | UI proveedor: tier card, progreso, benefits breakdown, lista de referidos, disclaimer manual |
| `src/app/admin-portal/dashboard/referidos/page.tsx` | UI admin: stats, tabla con filtros, dialog detalle (benefits editable + rewards activate/revoke), dialog asignar, dialog Early Adopter |
| `src/components/admin/admin-sidebar.tsx` | Link "Referidos" con icono Gift |
| `src/components/auth/register-form.tsx` | Captura `?ref=VIVELO-XXX`, llama apply con uuid del nuevo user, solo providers |

### Oculto en V1 (codigo preservado)

- `src/app/dashboard/cliente/referidos/page.tsx` — reemplazado por redirect a `/dashboard/cliente`
- Referral code card en `src/app/dashboard/cliente/perfil/page.tsx` — removido
- Link "Referidos" en `src/components/dashboard/sidebar.tsx` (cliente nav) — comentado

### NO se toca

- `src/lib/commission.ts` (formula intacta — beneficios son manuales)
- `src/lib/cancellation.ts`
- `src/lib/booking-state-machine.ts`
- Snapshot pattern en checkout
- `orders`, `bookings`, `sub_bookings` (no se agregan columnas)

---

## Bugs Conocidos

### ✅ RESUELTO (C1): Bookings perdidos en ordenes multi-servicio — Rollback compensatorio
**Antes**: Si el booking #2 fallaba mid-loop, #1 quedaba huerfano y #3 nunca se creaba. Stripe ya habia cobrado.
**Solucion**: `handlePaymentSuccess` (real mode) y mock mode envuelven `createBookingsForOrder` en try/catch. Si falla, llaman `POST /api/checkout/rollback-order` que: (1) refunda el PI completo, (2) cancela bookings parciales (filtro `.neq('status','cancelled')`), (3) marca orden cancelled. Idempotente (409 on retry). En exito de rollback: muestra error + orderId al cliente, resetea vista para reintentar. En fallo de rollback: muestra error critico + CTA soporte.
**Archivos**: `src/app/checkout/page.tsx` (`handlePaymentSuccess` + mock path), `src/app/api/checkout/rollback-order/route.ts`.
**NO se toca**: `commission.ts`, snapshots, webhook, state machine, cancellation flow.

### ✅ RESUELTO (C2): Race condition webhook vs booking creation
**Antes**: El webhook `payment_intent.succeeded` podia llegar antes de que `createBookingsForOrder()` terminara. El webhook marcaba la orden como `paid` pero no encontraba bookings que confirmar. Los bookings quedaban en `pending` para siempre.
**Solucion**: Despues de crear bookings, el cliente llama `POST /api/checkout/confirm-bookings`. Si la orden ya es `paid` (webhook ya paso), confirma los bookings pendientes + incrementa campaign usage. Si la orden aun es `pending`, no hace nada (el webhook lo hara). Idempotente via `WHERE status='pending'`.
**Archivos**: `src/app/checkout/page.tsx` (`handlePaymentSuccess`), `src/app/api/checkout/confirm-bookings/route.ts`.
**NO se toca**: webhook, commission.ts, state machine.

### ✅ RESUELTO (C3): Order.status no se actualiza en cancelaciones/refunds
**Antes**: Al cancelar bookings via `/api/bookings/cancel`, el status de la orden padre quedaba como `'paid'` para siempre, aunque todos los bookings estuvieran cancelados y reembolsados.
**Solucion**: Despues de cancelar un booking, se consultan todos los bookings de la misma orden. Si todos estan cancelados → orden pasa a `'refunded'`. Si solo algunos → `'partially_refunded'`. Non-blocking (try/catch). Nuevo status `'partially_refunded'` agregado al enum `order_status` via migracion `00115`.
**Archivos**: `src/app/api/bookings/cancel/route.ts` (step 8), `supabase/migrations/00115_order_partially_refunded.sql`, `src/types/database.ts` (`OrderStatus`).
**NO se toca**: commission.ts, cancellation.ts, webhook, state machine, snapshots.

### ✅ RESUELTO (C4): IDOR en editor de servicios del proveedor
**Antes**: Un proveedor podia manipular el UUID en la URL `/dashboard/proveedor/servicios/[id]/editar` para ver (y potencialmente editar) servicios de otro proveedor. `getServiceById(id)` no verificaba ownership.
**Solucion**: Despues de cargar el servicio, se verifica `s.provider_id !== user.id`. Si no coincide, muestra toast "No autorizado" y redirige a la lista de servicios. No se modifica `getServiceById` (otros callers como checkout y admin lo necesitan sin filtro).
**Archivos**: `src/app/dashboard/proveedor/servicios/[id]/editar/page.tsx` (ownership check post-fetch).
**NO se toca**: queries.ts, commission.ts, checkout, state machine.

### ✅ RESUELTO (C5): Admin sidebar con active state roto
**Antes**: En `admin.solovivelo.com`, el middleware reescribe `/dashboard/*` → `/admin-portal/dashboard/*` internamente. `usePathname()` retorna el path reescrito, pero los hrefs del sidebar usan `/dashboard/*`. La comparacion `pathname === item.href` siempre era false — ningun link se mostraba como activo.
**Solucion**: Normalizar el pathname quitando el prefijo `/admin-portal` antes de comparar con los hrefs. Los hrefs NO se cambian (causaria doble-rewrite por el middleware).
**Archivos**: `src/components/admin/admin-sidebar.tsx` (normalizedPathname en NavLinks).
**NO se toca**: middleware, rutas de admin pages, hrefs de sidebar.

### ✅ RESUELTO (C6): Pagina de notificaciones admin con datos mock hardcodeados
**Antes**: `/admin-portal/dashboard/notificaciones` siempre mostraba notificaciones mock importadas directamente de `@/data/mock-notifications`, ignorando la tabla `notifications` en Supabase. Las notificaciones creadas via `createNotification()` se guardaban en DB pero nunca se mostraban al recargar la pagina.
**Solucion**: Agregar funcion `getAllNotifications()` en `queries.ts` (sin filtro de recipient — vista admin) con soporte mock mode. Reemplazar la importacion directa de `mockNotifications` en la pagina por la llamada a `getAllNotifications()`. RLS ya tenia policy `"Admins manage notifications" FOR ALL`.
**Archivos**: `src/lib/supabase/queries.ts` (`getAllNotifications`), `src/app/admin-portal/dashboard/notificaciones/page.tsx` (reemplazar mock por query real).
**NO se toca**: commission.ts, checkout, state machine, snapshots, otras queries de notificaciones.

---

## Funcionalidades Planeadas

Estas features no existen en el codigo pero estan en el roadmap. Al desarrollar cualquier modulo, considerar compatibilidad con estas:

| Feature | Descripcion | Impacto en arquitectura |
|---------|-------------|------------------------|
| **App movil nativa** | iOS/Android | API routes deben funcionar como backend headless |
| ~~**Agrupacion por evento**~~ | ✅ Implementado en `/dashboard/cliente/eventos` | Agrupa bookings + cart items por `event_name`, muestra gasto total y desglose |
| **Favoritos** | Cliente puede guardar servicios como favoritos | Tabla nueva `favorites` (client_id, service_id) |
| **Calendario visual de disponibilidad** | Al seleccionar fecha en el detalle del servicio, mostrar dias en rojo (no disponible) o verde (disponible) | Necesita endpoint que retorne disponibilidad por rango de dias, no solo un slot |

---

## Mis Eventos — Dashboard del Cliente

### Ruta y Navegacion

- **Pagina**: `src/app/dashboard/cliente/eventos/page.tsx`
- **Sidebar**: "Mis Eventos" con icono `FolderOpen` (entre Resumen y Mis Reservas)
- **URL**: `/dashboard/cliente/eventos`

### Logica de Agrupacion

```
1. Fetch todos los bookings del cliente via getBookingsByClient()
2. Obtener cart items del CartProvider
3. Agrupar ambos por event_name (campo opcional del booking/cart item)
4. Bookings sin event_name → grupo "Sin evento asignado"
5. Ordenar grupos por gasto total descendente
```

### Calculo del Gasto Total por Evento

```
Para cada booking:
  effectiveTotal = status === 'cancelled' && refund_amount ? total - refund_amount : total

Para cada cart item:
  effectiveTotal = total

grandTotal = Σ(effectiveTotal de bookings) + Σ(total de cart items)
```

### Componentes Reutilizados

- `BookingDetailDialog` — click en un booking abre el detalle
- `CreateReviewDialog` — boton de review para bookings completados
- `BOOKING_STATUS_LABELS/COLORS` — badges de status consistentes
- Estilo amber para cart items (consistente con reservas)

### Exportacion de Datos (CSV, XLSX, PDF)

Sistema reutilizable de exportacion con `ExportButton` dropdown (CSV, Excel, PDF). Usa `xlsx` (SheetJS), `jspdf` + `jspdf-autotable`.

**Archivos core:**
- `src/lib/export.ts` — funciones `exportCSV()`, `exportXLSX()`, `exportPDF()` con columnas configurables
- `src/components/ui/export-button.tsx` — dropdown con 3 formatos, acepta `data`, `columns`, `filename`, `pdfTitle`

**Paginas con export:**
- Admin: Reservas, Finanzas (mensual + liquidacion), Fiscal, Proveedores, Usuarios, Servicios, Reviews
- Proveedor: Reservas, Servicios

Cada pagina define `exportColumns: ExportColumn[]` con accessors que resuelven propiedades nested (ej: `r.service?.title`). Los datos filtrados/visibles se pasan directamente al boton.

### Relacion con "Por Evento" en Reservas

La pagina de reservas (`/dashboard/cliente/reservas`) tiene un toggle "Por Evento" que agrupa bookings de manera similar. La pagina dedicada de eventos es mas completa (incluye gasto total, desglose detallado con horarios e invitados). Ambas coexisten sin conflicto.

---

## Extras — Imagen y Descripcion

### Campos del Extra

Cada extra de un servicio puede tener opcionalmente:
- **`description`** (TEXT, max 150 chars): Breve descripcion del extra. Columna existia en DB desde migracion `00003` pero no se exponia en formularios. Ahora visible en formularios de proveedor, admin y selector del cliente.
- **`image`** (TEXT, nullable): URL de imagen subida a Supabase Storage bucket `service-media`. Agregada en migracion `00044_extras_image.sql`.

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/00044_extras_image.sql` | Agrega columna `image TEXT` a tabla `extras` |
| `src/types/database.ts` | `Extra` interface incluye `image: string \| null` |
| `src/lib/supabase/queries.ts` | `createService`, `createExtra`, `updateExtra` aceptan `description?` e `image?` |
| `src/app/dashboard/proveedor/servicios/nuevo/page.tsx` | Formulario de extras con campo descripcion (150 chars) + upload de imagen |
| `src/app/dashboard/proveedor/servicios/[id]/editar/page.tsx` | Edicion de extras con descripcion + imagen (upload/remove) |
| `src/app/admin-portal/dashboard/servicios/[id]/editar/page.tsx` | Mismo que proveedor editar |
| `src/components/services/extras-selector.tsx` | Muestra imagen del extra al cliente junto al checkbox |
| `src/data/mock-services.ts` | Mock extras incluyen `image: null` |

### Upload de Imagen

Usa `uploadServiceMedia()` de `src/lib/supabase/storage.ts` — sube al bucket `service-media` con path `{serviceId}/{timestamp}_{filename}`. La imagen se muestra como thumbnail de 64x64px con opcion de eliminar.

---

## Zonas Geograficas

### 9 Zonas

| Slug | Label | Mapping Google |
|------|-------|----------------|
| `ciudad-de-mexico` | Ciudad de México | state = "Ciudad de México" / "DF" |
| `estado-de-mexico` | Estado de México | state = "México" y no Toluca metro |
| `toluca` | Toluca | state = "México" y locality en Toluca metro |
| `puebla` | Puebla | state = "Puebla" |
| `hidalgo` | Hidalgo | state = "Hidalgo" |
| `queretaro` | Querétaro | state = "Querétaro" |
| `guanajuato` | Guanajuato | state = "Guanajuato" |
| `tlaxcala` | Tlaxcala | state = "Tlaxcala" |
| `morelos` | Morelos | state = "Morelos" |

### Almacenamiento dual

- Tabla `service_zones`: slugs como PK (`ciudad-de-mexico`)
- Columna `services.zones`: array de **labels** (`"Ciudad de México"`)
- `CartItem.event_zone`: slug desde `mapPlaceToZone()`
- Comparacion: `serviceCoversZone()` normaliza label↔slug para comparar

### Google Places Autocomplete

- **API Key**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restriccion a `mx`)
- **Componente**: `src/components/address-autocomplete.tsx`
- **Mapping**: `src/lib/zone-mapping.ts` — `mapPlaceToZone(PlaceComponents) → ViveloZoneSlug | null`
- **Fallback**: Si la API no esta configurada o falla, muestra Input + Select manual de zona
- **Validacion en carrito** (3 condiciones bloquean checkout):
  1. Direccion vacia (`!event_address`)
  2. Direccion fuera de zonas Vivelo (`event_address` existe pero `event_zone` es null — ej: Colima)
  3. Zona no cubierta por el servicio (`event_zone` existe pero `serviceCoversZone()` retorna false)

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `src/lib/zone-mapping.ts` | Tipos, mapping Google→zona, `serviceCoversZone()` |
| `src/lib/constants.ts` | `VIVELO_ZONES` (9 zonas con slug+label) |
| `src/components/address-autocomplete.tsx` | Componente de direccion con Places API |
| `supabase/migrations/00100_update_zones.sql` | Migracion de 7→9 zonas + rename en services |
| `src/providers/cart-provider.tsx` | `CartItemServiceSnapshot.zones`, `CartItem.event_zone` |
| `src/app/carrito/page.tsx` | Validacion visual + bloqueo de checkout por zona |

---

## Seguridad — Hallazgos de Auditoria

### Problemas Identificados

| Severidad | Problema | Ubicacion | Estado |
|-----------|----------|-----------|--------|
| ~~**ALTA**~~ | ~~Trigger de signup no copia `role` del metadata al perfil — todos los usuarios quedan como 'client'~~ | `00001_create_profiles.sql` trigger `handle_new_user` | ✅ Resuelto (migracion `00118`) — trigger ahora copia `phone` y `role` del metadata + backfill |
| **ALTA** | Datos bancarios (RFC, CLABE) visibles via RLS para cualquier usuario autenticado — se filtra solo a nivel de app | `profiles` table RLS policies | Pendiente |
| **MEDIA** | Fallback de `checkVendorAvailability` hardcodea `max_concurrent=1` si el RPC falla | `queries.ts:1105-1107` | Pendiente |
| **MEDIA** | No hay rate limiting en endpoints de auth (`/login`, `/register`) | `src/app/login`, `src/app/register` | Pendiente |
| **MEDIA** | No hay audit logging para acciones de admin (cambios de rol, moderacion) | Admin API routes | Pendiente |
| **BAJA** | `buffer_before_days` y `buffer_after_days` existen en schema pero nunca se usan en codigo | `availability.ts` | Deuda tecnica |
| **BAJA** | ~~Webhook `charge.refunded` no actualiza `orders.status`~~ | `bookings/cancel/route.ts` | ✅ Resuelto (C3) — order status se actualiza en `/api/bookings/cancel` tras cancelar booking |

### Lo que SI esta bien

- ✅ Webhook de Stripe con firma HMAC + idempotencia
- ✅ RLS habilitado en todas las tablas
- ✅ Patron `requireAuth()`/`requireRole()` consistente en API routes
- ✅ Admin portal aislado por subdominio con verificacion de rol
- ✅ Service-role key solo en servidor, nunca expuesta al cliente
- ✅ Cancelacion multi-party (client/provider/admin) con validacion de ownership
- ✅ Snapshots financieros inmutables en bookings

## Recuperacion de Contrasena Admin

### Flujo

1. Admin en `admin.solovivelo.com/login` → click "Olvidaste tu contrasena?" → formulario de email
2. `POST /api/admin/auth/recover` (sin auth requerido):
   - Verifica que el email pertenece a un admin (si no, retorna success sin revelar info)
   - Genera contrasena temporal (`Vivelo-XXXXXXXX`)
   - Actualiza password en Supabase auth via `supabaseAdmin.auth.admin.updateUserById()`
   - Marca `profiles.must_change_password = true`
   - Envia email con contrasena temporal via Resend (`sendTemporaryPassword`)
3. Admin hace login con contrasena temporal → detecta `must_change_password: true` → redirect a `/dashboard/perfil?cambiar=1`
4. Pagina de perfil muestra banner de alerta + formulario de cambio de contrasena
5. `POST /api/admin/auth/change-password` (requiere auth admin):
   - Verifica contrasena actual con `signInWithPassword`
   - Actualiza password via `supabaseAdmin.auth.admin.updateUserById()`
   - Marca `must_change_password = false`
6. Desde perfil, el admin siempre puede cambiar su contrasena voluntariamente

### Archivos

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/00102_add_must_change_password.sql` | Columna `must_change_password BOOLEAN DEFAULT false` en profiles |
| `src/app/api/admin/auth/recover/route.ts` | Endpoint de recuperacion (genera temp password, envia email) |
| `src/app/api/admin/auth/change-password/route.ts` | Endpoint de cambio de contrasena (verifica actual, actualiza) |
| `src/lib/email.ts` | Funcion `sendTemporaryPassword()` (interfaz generica: `userName`, `userEmail`, `loginUrl?`) |
| `src/components/admin/admin-login-form.tsx` | Login + formulario de recuperacion + redirect si `must_change_password` |
| `src/app/admin-portal/dashboard/perfil/page.tsx` | Pagina de perfil admin con cambio de contrasena |
| `src/components/admin/admin-sidebar.tsx` | Link "Mi Perfil" en sidebar |

### Gestion de Usuarios Admin

- **Invitar admin**: `POST /api/admin/users` — crea usuario con password random, rol admin, envia email recovery
- **Pausar/Activar**: Toggle `verified` en profiles (verified=false actua como pausa)
- **Borrar usuario**: `DELETE /api/admin/users` — borra profile + auth.users (protegido contra auto-borrado y FK constraints)
- **Generar contrasena temporal**: `POST /api/admin/users/temp-password` — genera `Vivelo-XXXXXXXX`, la setea via service-role, marca `must_change_password=true`, retorna la contrasena en la respuesta para que el admin la copie y comparta manualmente. Util para usuarios con emails falsos donde el reset por correo no funciona.

## Recuperacion de Contrasena Cliente/Proveedor

### Flujo

Mismo patron que admin, con endpoints separados que rechazan admins:

1. Cliente/proveedor en `solovivelo.com/login` → click "¿Olvidaste tu contrasena?" → formulario de email
2. `POST /api/auth/recover` (sin auth requerido):
   - Verifica que el email pertenece a un client o provider (si es admin o no existe, retorna success sin revelar info)
   - Genera contrasena temporal (`Vivelo-XXXXXXXX`)
   - Actualiza password en Supabase auth via `supabaseAdmin.auth.admin.updateUserById()`
   - Marca `profiles.must_change_password = true`
   - Envia email con contrasena temporal via Resend (`sendTemporaryPassword` con `loginUrl: 'solovivelo.com/login'`)
3. Usuario hace login con contrasena temporal → detecta `must_change_password: true` → redirect a `/dashboard/cliente/perfil?cambiar=1` o `/dashboard/proveedor/perfil?cambiar=1`
4. Pagina de perfil muestra banner amber de alerta + formulario de cambio de contrasena
5. `POST /api/auth/change-password` (requiere auth client o provider):
   - Verifica contrasena actual con `signInWithPassword`
   - Actualiza password via `supabaseAdmin.auth.admin.updateUserById()`
   - Marca `must_change_password = false`
6. Si vino con `?cambiar=1`, redirect a `/dashboard` al completar
7. Desde perfil, el usuario siempre puede cambiar su contrasena voluntariamente

### Archivos

| Archivo | Proposito |
|---------|-----------|
| `src/app/api/auth/recover/route.ts` | Endpoint de recuperacion para client/provider (rechaza admin) |
| `src/app/api/auth/change-password/route.ts` | Endpoint de cambio de contrasena para client/provider (rechaza admin) |
| `src/lib/email.ts` | `sendTemporaryPassword()` — generico con `loginUrl` para diferenciar admin vs usuario |
| `src/components/auth/login-form.tsx` | Login + formulario de recuperacion + redirect si `must_change_password` |
| `src/app/dashboard/cliente/perfil/page.tsx` | Perfil cliente con Card de cambio de contrasena |
| `src/app/dashboard/proveedor/perfil/page.tsx` | Perfil proveedor con Card de cambio de contrasena |

---

## Blog CMS — Sistema de Contenido

### Arquitectura

- **Admin**: `src/app/admin-portal/dashboard/contenido/page.tsx` — CRUD de posts con formulario de 3 tabs (Contenido, SEO, Enlaces)
- **Publico**: `src/app/blog/` — Lista con filtro por tags + busqueda + detalle con dual renderer (HTML + markdown fallback)
- **RSS Feed**: `src/app/blog/feed.xml/route.ts` — RSS 2.0 con cache de 1h
- **Storage**: Imagenes de blog se suben a bucket `service-media` con path `blog/{uuid}.{ext}` via `uploadBlogMedia()`

### Campos del Blog Post

| Campo | Tipo | Tab Admin | Uso |
|-------|------|-----------|-----|
| `title` | TEXT | Contenido | Titulo principal |
| `slug` | TEXT UNIQUE | Contenido | URL del post |
| `excerpt` | TEXT | Contenido | Resumen corto |
| `content` | TEXT | Contenido | Cuerpo en HTML (editor Tiptap WYSIWYG). Posts legacy en markdown se convierten al editar |
| `cover_image` | TEXT | Contenido | Imagen de portada (upload widget) |
| `media_type` | ENUM | Contenido | text / video / audio |
| `media_url` | TEXT | Contenido | URL del video/audio |
| `status` | ENUM | Contenido | draft / published / archived |
| `publish_date` | TIMESTAMPTZ | Contenido | Fecha de publicacion |
| `meta_title` | TEXT | SEO | Titulo para buscadores (override de title) |
| `meta_description` | TEXT | SEO | Descripcion para buscadores (max 160 chars) |
| `focus_keyword` | TEXT | SEO | Palabra clave principal |
| `tags` | TEXT[] | SEO | Etiquetas para filtrado y SEO |
| `og_image` | TEXT | SEO | Imagen Open Graph (override de cover_image) |
| `author_id` | UUID FK | Auto | Se asigna al crear (usuario admin actual) |

### Blog Post Links (tabla `blog_post_links`)

Asocia posts con servicios y/o proveedores. Tab "Enlaces" en el admin permite buscar servicios activos y agregar links. En la pagina publica del blog, los servicios enlazados se muestran como `ServiceCard` y los proveedores como badges con link.

### Editor WYSIWYG (Tiptap)

El admin usa un editor rico (Tiptap/ProseMirror) que produce HTML limpio. Dos variantes:
- **`full`** (Contenido): Bold, Italic, Underline, Strike, H1-H3, Listas, Blockquote, HR, Link, Image upload, YouTube embed, Undo/Redo
- **`simple`** (Extracto): Bold, Italic, Underline, Link

Componente: `src/components/admin/rich-text-editor.tsx`

### Dual Rendering (HTML + Markdown Fallback)

Posts nuevos se guardan en HTML. Posts legacy en markdown se renderizan con el parser original.
- `isHtmlContent()` detecta formato: HTML empieza con `<tag>`, markdown no
- Al editar un post markdown, `markdownToBasicHtml()` lo convierte a HTML para Tiptap
- Al guardar, se guarda como HTML — proxima carga usa el renderer HTML
- Utilidades en `src/lib/blog-utils.ts`: `isHtmlContent`, `stripHtml`, `extractHeadingsFromHtml`, `addHeadingIds`, `markdownToBasicHtml`

### Funciones SEO del Blog

- **Tiempo de lectura**: Calculado automaticamente (200 wpm), mostrado como "X min de lectura"
- **Tabla de contenido (TOC)**: Auto-generada desde encabezados `##`, con anchor links
- **Posts relacionados**: Query por tags compartidos (`overlaps`), muestra hasta 3 posts al final
- **Busqueda**: Input en la lista del blog filtra por titulo y excerpt
- **RSS Feed**: `/blog/feed.xml` con todos los posts publicados, cache 1h

### Archivos Clave

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/00105_blog_post_links.sql` | Tabla de links blog↔servicios/proveedores |
| `src/components/admin/rich-text-editor.tsx` | Editor WYSIWYG Tiptap (full/simple) |
| `src/lib/blog-utils.ts` | Utilidades: isHtmlContent, stripHtml, extractHeadingsFromHtml, addHeadingIds, markdownToBasicHtml |
| `src/app/admin-portal/dashboard/contenido/page.tsx` | Formulario admin completo (3 tabs) con RichTextEditor |
| `src/app/blog/blog-list-client.tsx` | Lista publica con busqueda + filtro por tags |
| `src/app/blog/[slug]/page.tsx` | Detalle con dual renderer (HTML + markdown), SEO, TOC, reading time |
| `src/app/blog/feed.xml/route.ts` | RSS 2.0 feed |
| `src/lib/supabase/storage.ts` | `uploadBlogMedia()` |
| `src/lib/supabase/queries.ts` | `createBlogPost`, `getBlogPostLinks`, `setBlogPostLinks` |
| `src/lib/supabase/server-queries.ts` | `getBlogPostLinksServer`, `getRelatedBlogPostsServer` |

---

## Regla de Git
Al terminar cada ticket, haz commit con el formato:
feat(module): descripción corta

Ejemplos:
feat(auth): implement register and login endpoints
feat(contacts): add CRUD with pagination and filters
feat(campaigns): add execution engine with Retell integration
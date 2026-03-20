# CLAUDE.md

Guia completa para trabajar con el codigo de Vivelo. Este archivo documenta toda la arquitectura, reglas de negocio, matematica financiera y convenciones del proyecto.

## Descripcion del Proyecto

Vivelo es un marketplace mexicano de servicios para eventos que conecta clientes con proveedores (catering, audio, decoracion, foto/video, staff, mobiliario) en 9 zonas. Stack: Next.js 14 App Router, Supabase (auth + DB + storage), Stripe (pagos en MXN), Google Calendar (sync del proveedor), Anthropic Claude (asistente Vivi). Desplegado en Vercel: `solovivelo.com` (consumidor) y `admin.solovivelo.com` (admin).

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

Paginas son `'use client'` y cargan datos via `useEffect` con queries client-side (`src/lib/supabase/queries.ts`). Las funciones de query verifican `isMockMode()` y retornan datos mock de `src/data/` cuando Supabase no esta configurado.

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

La campana se obtiene via `getActiveCampaignForService(serviceId)` que verifica `campaign_subscriptions` + estado activo + rango de fechas.

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
│       ├── cron/               auto-complete, send-event-codes
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
| `blog_posts` | Articulos del blog con SEO |
| `showcase_items` / `site_banners` | Contenido de marketing |
| `stripe_webhook_events` | Idempotencia de webhooks |

Admin usa service-role key para bypass de RLS en todas las operaciones administrativas.

---

## Estado de Modulos

| Modulo | Estado | Notas |
|--------|--------|-------|
| Alta de servicios (proveedor) | ✅ Terminado | CRUD completo con extras, precios, categorias. Flujo: Creacion → pending_review → (admin aprueba) → active ↔ paused / (admin rechaza) → archived |
| Onboarding proveedor | ✅ Terminado | Banner persistente en dashboard hasta completar: datos de empresa (company_name, bio) + datos bancarios (RFC, CLABE, documento). Secciones en `/configuracion`. Helper: `getProviderOnboardingStatus()` |
| Extras por servicio | ✅ Terminado | Logica de min/max, depends_on_guests/hours, imagen y descripcion (150 chars) |
| Calculo de precios (detalle) | ✅ Terminado | Todos los price_unit, extras, descuentos |
| Carrito | ✅ Terminado | Edicion, recalculo, persistencia localStorage, agrupacion por evento, direccion con Google Places + validacion de zona |
| Zonas geograficas | ✅ Terminado | 9 zonas, Google Places Autocomplete, fallback manual, validacion de cobertura en carrito |
| Campanas/descuentos | ✅ Terminado | Proveedores crean campanas, se aplican en checkout |
| Admin Portal | ✅ Terminado | KPIs, moderacion, finanzas, catalogo, usuarios |
| Chat Vivi (AI) | ✅ Terminado | Estable, sin planes de cambio |
| Checkout + Stripe | ⚠️ En progreso | Pago funciona pero bookings pueden perderse (ver Bugs Conocidos) |
| Cancelacion + reembolsos | ⚠️ En progreso | Funciona pero depende del fix de checkout |
| Reviews/resenas | 🔲 Sin uso real | Codigo existe, moderacion implementada, sin resenas reales |
| Google Calendar | 🚫 No integrar | Codigo existe pero NO se usa — no tocar |
| Codigos de verificacion | 🔲 Implementado | Cron + endpoints existen, sin pruebas reales en produccion |
| Mis Eventos (cliente) | ✅ Terminado | Agrupacion de servicios por `event_name` con gasto total y desglose |

---

## Bugs Conocidos

### CRITICO: Bookings perdidos en ordenes multi-servicio
**Reproduccion**: Agregar 3 servicios al carrito → pagar → solo 2 bookings aparecen en dashboards.
**Causa raiz**: `createBookingsForOrder()` crea bookings en un loop sin rollback. Si el booking #2 falla (ej: disponibilidad cambio), los bookings #1 ya creados quedan huerfanos y el #3 nunca se crea. El pago ya fue procesado por Stripe.
**Archivos**: `src/app/checkout/page.tsx` (funcion `createBookingsForOrder`)
**Impacto**: Cliente pago por 3 servicios pero solo tiene 2 reservas. Sin forma de recuperar automaticamente.

### ALTO: Race condition webhook vs booking creation
El webhook `payment_intent.succeeded` puede llegar antes de que `createBookingsForOrder()` termine. El webhook busca bookings por `order_id` — si aun no existen, no los marca como `confirmed`.

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
| **ALTA** | Trigger de signup no copia `role` del metadata al perfil — todos los usuarios quedan como 'client' | `00001_create_profiles.sql` trigger `handle_new_user` | Pendiente |
| **ALTA** | Datos bancarios (RFC, CLABE) visibles via RLS para cualquier usuario autenticado — se filtra solo a nivel de app | `profiles` table RLS policies | Pendiente |
| **MEDIA** | Fallback de `checkVendorAvailability` hardcodea `max_concurrent=1` si el RPC falla | `queries.ts:1105-1107` | Pendiente |
| **MEDIA** | No hay rate limiting en endpoints de auth (`/login`, `/register`) | `src/app/login`, `src/app/register` | Pendiente |
| **MEDIA** | No hay audit logging para acciones de admin (cambios de rol, moderacion) | Admin API routes | Pendiente |
| **BAJA** | `buffer_before_days` y `buffer_after_days` existen en schema pero nunca se usan en codigo | `availability.ts` | Deuda tecnica |
| **BAJA** | Webhook `charge.refunded` no actualiza `orders.status` a `refunded`/`partially_refunded` | `webhook/route.ts` | Pendiente |

### Lo que SI esta bien

- ✅ Webhook de Stripe con firma HMAC + idempotencia
- ✅ RLS habilitado en todas las tablas
- ✅ Patron `requireAuth()`/`requireRole()` consistente en API routes
- ✅ Admin portal aislado por subdominio con verificacion de rol
- ✅ Service-role key solo en servidor, nunca expuesta al cliente
- ✅ Cancelacion multi-party (client/provider/admin) con validacion de ownership
- ✅ Snapshots financieros inmutables en bookings

## Regla de Git
Al terminar cada ticket, haz commit con el formato:
feat(module): descripción corta

Ejemplos:
feat(auth): implement register and login endpoints
feat(contacts): add CRUD with pagination and filters
feat(campaigns): add execution engine with Retell integration
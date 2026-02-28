# Auditoria Inicial - Vivelo
**Fecha:** 27 de Febrero 2026
**Agentes:** Frontend/UX, Backend/API, Database, QA/Security, DevOps/Infra

---

## Resumen Ejecutivo

5 agentes auditaron el proyecto en paralelo. Se encontraron **12 issues CRITICAL**, **14 HIGH**, **10 MEDIUM** y **6 LOW**.

El proyecto tiene bases solidas (schema bien disenado, RLS en 19 tablas, Stripe integrado, 3 dashboards funcionales), pero tiene **vulnerabilidades de autorizacion criticas** que deben resolverse antes de produccion.

---

## TOP 12 CRITICAL - Ordenados por Prioridad

### SEGURIDAD Y AUTORIZACION (Sprint Actual - Bloqueantes)

| # | Issue | Agente | Archivo | Fix |
|---|-------|--------|---------|-----|
| 1 | **Dashboard admin sin verificacion de rol** - cualquier usuario autenticado accede a /dashboard/admin | QA | `dashboard/admin/*` | Envolver con `<AuthGuard allowedRoles={['admin']}>` |
| 2 | **`updateProfileRole()` callable desde client** - un usuario puede auto-promoverse a admin | QA | `lib/supabase/queries.ts:697` | Mover a API route server-side con auth |
| 3 | **Sin auth en `/api/bookings/cancel`** - cualquiera cancela bookings ajenos | Backend + QA | `api/bookings/cancel/route.ts` | Verificar `auth.uid()` = client_id o provider_id |
| 4 | **Sin auth en `/api/stripe/create-payment-intent`** - cualquiera crea PaymentIntents | Backend | `api/stripe/create-payment-intent/route.ts` | Verificar usuario autenticado y ownership |
| 5 | **Sin validacion de amount** - montos negativos o absurdos aceptados | QA | `api/stripe/create-payment-intent/route.ts` | Zod validation + verificar vs total real |
| 6 | **`updateBookingStatus()` sin ownership** - cualquier user cambia status de cualquier booking | QA | `lib/supabase/queries.ts:628` | RLS policy + server-side ownership check |

### INTEGRIDAD DE DATOS

| # | Issue | Agente | Archivo | Fix |
|---|-------|--------|---------|-----|
| 7 | **Race condition: doble cancelacion = doble refund** | Backend + QA | `api/bookings/cancel/route.ts` | Conditional update: `.eq('status', 'confirmed')` |
| 8 | **Webhook NO es idempotente** - eventos duplicados procesados dos veces | Backend | `api/stripe/webhook/route.ts` | Tabla `webhook_events` con `stripe_event_id` |
| 9 | **`orders.client_id` sin ON DELETE CASCADE** - ordenes huerfanas si se borra perfil | Database | `migrations/00020` | ALTER TABLE con CASCADE |

### INFRAESTRUCTURA

| # | Issue | Agente | Archivo | Fix |
|---|-------|--------|---------|-----|
| 10 | **Sin `error.tsx` ni `loading.tsx`** en ningun segmento del app router | Frontend + DevOps | `src/app/` | Crear error boundaries y loading skeletons |
| 11 | **`next.config.mjs` vacio** - sin security headers (HSTS, CSP, X-Frame-Options) | DevOps | `next.config.mjs` | Agregar headers de seguridad |
| 12 | **Mock mode bypasea webhook verification** - si env var mal configurada, auth se salta | QA + Backend | `api/stripe/webhook/route.ts` | Check explicito en produccion |

---

## HIGH PRIORITY (14 issues)

| # | Issue | Agente |
|---|-------|--------|
| 1 | Sin validacion de schema (Zod) en request bodies | QA |
| 2 | Datos bancarios (CLABE, RFC) sin RLS a nivel de campo | QA |
| 3 | Sin validacion de transiciones de estado de bookings | QA |
| 4 | Google Calendar sync N+1 queries (250 eventos = 500 queries) | Backend |
| 5 | Sin timeout en llamadas a Stripe | Backend |
| 6 | Rutas de Google Calendar sin autenticacion | Backend |
| 7 | Ruta de chat sin auth ni rate limiting | Backend |
| 8 | Middleware permite TODO en mock mode | Backend |
| 9 | `queries.ts` usa browser client en server (anon key) | Backend |
| 10 | Booking confirmado con stripe_payment_intent_id=null: refund silencioso | Backend |
| 11 | `.env.example` incompleto - faltan Google Calendar y CRON_SECRET | DevOps |
| 12 | Sin image domains en next.config.mjs para Supabase | DevOps |
| 13 | Cron endpoint no verifica CRON_SECRET | DevOps |
| 14 | Credenciales reales en .env.local - rotar si repo fue publico | QA |

---

## MEDIUM PRIORITY (10 issues)

| # | Issue | Agente |
|---|-------|--------|
| 1 | Sin proteccion de rutas por rol en URLs directas | Frontend |
| 2 | Tablas sin scroll horizontal en mobile | Frontend |
| 3 | Faltan ARIA labels en botones de iconos | Frontend |
| 4 | Sin paginacion en listas largas (admin reservas) | Frontend |
| 5 | Refund percent no validado (>100% posible) | QA |
| 6 | Race conditions en status updates (optimistic locking) | QA |
| 7 | Refund amount puede exceder total pagado | QA |
| 8 | Falta indice en orders.created_at | Database |
| 9 | Falta indice en bookings.cancelled_at | Database |
| 10 | Logica de fallback de politica de cancelacion compleja y fragil | Backend |

---

## LOW PRIORITY (6 issues)

| # | Issue | Agente |
|---|-------|--------|
| 1 | Sin design tokens centralizados (colores hardcodeados) | Frontend |
| 2 | Cart no valida ediciones inline | Frontend |
| 3 | 118 console.log statements para limpiar | DevOps |
| 4 | Falta indice en profiles.role | Database |
| 5 | Migraciones 00015/00017 duplicadas | Database |
| 6 | Build warning de React hooks en reservas | DevOps |

---

## LO QUE ESTA BIEN (Green Flags)

- Schema de DB bien disenado con 19 tablas + RLS en todas
- 3 politicas de cancelacion seed correctas (Flexible, Moderada, Estricta)
- TypeScript types coinciden 100% con schema SQL
- 47+ indices cubriendo columnas clave
- Stripe webhook verifica firma correctamente
- Secret keys nunca expuestas al frontend
- Zero XSS (no dangerouslySetInnerHTML, React escapa todo)
- Error messages genericos al cliente (sin stack traces)
- Build pasa exitosamente (44 rutas, 87.8 KB shared)
- Mock mode bien aislado para desarrollo
- Cart con persistencia en localStorage y CRUD completo
- Los 3 dashboards implementados (Cliente, Proveedor, Admin)
- Google Calendar OAuth con HMAC validation

---

## PLAN DE ACCION SUGERIDO

### Sprint 1: Seguridad (Bloqueante)
1. Auth + authorization en todas las API routes
2. AuthGuard en admin pages
3. Mover funciones admin a API routes server-side
4. Race condition fix (conditional update)
5. Webhook idempotency table
6. Zod validation en todos los endpoints

### Sprint 2: Infraestructura
7. Security headers en next.config.mjs
8. Error boundaries (error.tsx, loading.tsx)
9. Fix ON DELETE CASCADE en orders
10. Completar .env.example
11. Booking status state machine

### Sprint 3: UX y Performance
12. Mobile table scroll
13. ARIA labels y accessibility
14. Google Calendar batch queries
15. Paginacion en listas largas
16. Limpiar console.logs

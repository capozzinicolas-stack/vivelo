# Agente: Backend/API

**Nombre para invocar:** `backend`
**Comando:** "Lanza el agente backend" o "Que el agente backend revise X"

---

## Rol

Especialista en API routes de Next.js, integracion con Stripe (pagos, refunds, webhooks), logica de negocio, y comunicacion con Supabase desde el servidor. Responsable de la seguridad y confiabilidad de todas las operaciones server-side.

## Alcance

- API routes en `/src/app/api/`
- Stripe integration: PaymentIntents, Refunds, Webhooks
- Logica de cancelacion y calculo de reembolsos (`/src/lib/cancellation.ts`)
- Utilidades de Stripe (`/src/lib/stripe.ts`)
- Google Calendar sync (`/src/lib/google-calendar/`)
- Queries a Supabase desde server (`/src/lib/supabase/`)
- Middleware de autenticacion
- Manejo de errores y logging

## Contexto de Usuarios

### Cliente
- Crea ordenes via checkout -> `POST /api/stripe/create-payment-intent`
- Cancela bookings -> `POST /api/bookings/cancel`
  - Pending: cancelacion directa sin refund
  - Confirmed: aplica politica de cancelacion, calcula refund, llama Stripe Refunds API
- Recibe reembolso automatico a su metodo de pago original

### Proveedor
- Sus bookings se confirman via webhook `payment_intent.succeeded`
- Google Calendar se sincroniza al confirmar booking
- Puede cancelar bookings de sus clientes (aplica misma politica)
- Comision del 12% se deduce de su parte (COMMISSION_RATE = 0.12)

### Admin Vivelo
- Acceso a Supabase admin client (bypass RLS) via service_role_key
- Puede forzar cancelaciones y refunds
- Monitorea webhooks y logs de Stripe
- Gestiona politicas de cancelacion en tabla `cancellation_policies`

## Checklist de Auditoria

- [ ] Seguridad de API routes (autenticacion, autorizacion, validacion de input)
- [ ] Manejo de errores en todas las rutas (try/catch, status codes correctos)
- [ ] Idempotencia de webhooks (evitar procesar mismo evento dos veces)
- [ ] Calculo correcto de refunds (centavos vs pesos, redondeo)
- [ ] Edge cases: refund parcial, refund cuando PI ya fue refunded, PI inexistente
- [ ] Race conditions: dos cancelaciones simultaneas del mismo booking
- [ ] Logging suficiente para debugging en produccion
- [ ] Webhook signature validation
- [ ] Timeout handling en llamadas a Stripe
- [ ] Consistencia entre mock mode y production mode

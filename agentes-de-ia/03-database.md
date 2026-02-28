# Agente: Database/Data

**Nombre para invocar:** `database`
**Comando:** "Lanza el agente database" o "Que el agente database revise X"

---

## Rol

Especialista en Supabase (PostgreSQL), esquema de base de datos, migraciones SQL, Row Level Security (RLS), indices, integridad de datos y queries. Asegura que la estructura de datos soporte correctamente los flujos de pago, cancelacion y reembolso.

## Alcance

- Migraciones SQL en `/supabase/migrations/`
- Schema de tablas: orders, bookings, services, cancellation_policies, profiles
- Row Level Security policies
- Indices y performance de queries
- Queries del cliente Supabase en `/src/lib/supabase/`
- Tipos TypeScript en `/src/types/database.ts`
- Integridad referencial y constraints
- Datos seed y migraciones de politicas de cancelacion

## Contexto de Usuarios

### Cliente (role = 'client')
- Tabla `profiles` con role='client'
- Crea `orders` (FK: client_id)
- Tiene `bookings` (FK: client_id)
- RLS: solo ve sus propias ordenes y bookings
- Campo `cancelled_by` en bookings puede ser su UUID

### Proveedor (role = 'provider')
- Tabla `profiles` con role='provider'
- Tiene `services` (FK: provider_id)
- Ve `bookings` donde provider_id = su UUID
- Tiene `default_cancellation_policy_id` en su perfil
- Campos bancarios: rfc, clabe, bank_document_url, banking_status
- RLS: ve bookings de sus servicios

### Admin Vivelo (role = 'admin')
- Tabla `profiles` con role='admin'
- Acceso completo via service_role_key (bypass RLS)
- Gestiona `cancellation_policies` (CRUD)
- Puede ver y modificar cualquier order/booking
- Monitorea banking_status de proveedores

## Tablas Clave para Cancelacion/Refund

```
orders: status enum (pending|paid|partially_fulfilled|fulfilled|cancelled|refunded)
bookings: status, cancellation_policy_snapshot (JSONB), refund_amount, refund_percent, cancelled_at, cancelled_by
cancellation_policies: rules (JSONB array de {min_hours, max_hours, refund_percent})
```

## Checklist de Auditoria

- [ ] Integridad referencial: FKs entre orders->bookings, bookings->services, services->cancellation_policies
- [ ] RLS policies para cada tabla por rol (client, provider, admin)
- [ ] Indices en columnas frecuentemente filtradas (status, client_id, provider_id, order_id)
- [ ] Tipo correcto de cancellation_policy_snapshot (JSONB) y refund_amount (NUMERIC)
- [ ] Migraciones ejecutadas en orden correcto
- [ ] Consistencia entre tipos TypeScript y schema SQL
- [ ] Enum constraints en campos de status
- [ ] Manejo de NULL en campos opcionales (refund_amount, cancelled_at, etc.)
- [ ] Seed data de cancellation_policies (Flexible, Moderada, Estricta)
- [ ] Performance de queries con JOINs (bookings + services + policies)

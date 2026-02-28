# Plan: Migrar Comisiones de Per-Proveedor a Per-Categoria

## Contexto

El admin quiere dejar de gestionar comisiones individualmente por proveedor y en su lugar asignar una tasa de comision a cada **categoria de servicio** (default 12%). El proveedor vera un promedio ponderado de las comisiones de las categorias de sus servicios activos. Los bookings existentes NO se tocan (sus snapshots son inmutables).

## Archivos a Modificar (14 archivos)

| # | Archivo | Accion |
|---|---------|--------|
| 1 | `supabase/migrations/00029_category_commission_rate.sql` | **CREAR** — Migration |
| 2 | `src/lib/commission.ts` | **MODIFICAR** — `getProviderCommissionRate` → `getCategoryCommissionRate` |
| 3 | `src/lib/validations/api-schemas.ts` | **MODIFICAR** — Agregar `commission_rate` a schemas de categoria, eliminar `UpdateProviderCommissionSchema` |
| 4 | `src/app/api/admin/providers/commission/route.ts` | **ELIMINAR** |
| 5 | `src/lib/supabase/queries.ts` | **MODIFICAR** — Agregar `getCategoriesWithCommission`, actualizar `getProvidersWithCommission`, `getProviderStats`, eliminar `updateProviderCommissionRate` |
| 6 | `src/types/database.ts` | **MODIFICAR** — Quitar `Profile.commission_rate`, agregar `CatalogCategory.commission_rate` |
| 7 | `src/app/checkout/page.tsx` | **MODIFICAR** — Usar `getCategoryCommissionRate(category)` en vez de `getProviderCommissionRate(providerId)` |
| 8 | `src/app/admin-portal/dashboard/proveedores/page.tsx` | **MODIFICAR** — Quitar dialog de comision, columna de comision, cards de comision |
| 9 | `src/app/admin-portal/dashboard/configuracion/page.tsx` | **MODIFICAR** — Agregar campo comision al dialog de categoria, actualizar stats para leer de categorias |
| 10 | `src/app/admin-portal/dashboard/finanzas/page.tsx` | **MODIFICAR** — Usar `getCategoriesWithCommission` para promedio ponderado |
| 11 | `src/app/dashboard/proveedor/page.tsx` | **MODIFICAR** — Mostrar promedio de comision basado en categorias de servicios |
| 12 | `src/providers/catalog-provider.tsx` | **MODIFICAR** — Agregar `commission_rate` al fallback data |
| 13 | `src/providers/auth-provider.tsx` | **MODIFICAR** — Quitar `commission_rate` de mock user |
| 14 | `src/data/mock-users.ts` | **MODIFICAR** — Quitar `commission_rate` de mock data |

---

## 1. Migration SQL (`00029_category_commission_rate.sql`)

```sql
-- Agregar commission_rate a service_categories (default 12%)
ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1200;

-- Constraint 0-100%
ALTER TABLE service_categories
  ADD CONSTRAINT chk_category_commission_rate_range
  CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- Eliminar trigger de proteccion de comision por proveedor
DROP TRIGGER IF EXISTS trg_protect_commission_rate ON profiles;
DROP FUNCTION IF EXISTS fn_protect_commission_rate();

-- Eliminar columna de comision de profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_commission_rate_range;
DROP INDEX IF EXISTS idx_profiles_provider_commission;
ALTER TABLE profiles DROP COLUMN IF EXISTS commission_rate;

-- bookings.commission_rate_snapshot se mantiene intacto (datos historicos)
```

## 2. Core Logic (`src/lib/commission.ts`)

Reemplazar `getProviderCommissionRate(providerId)` por `getCategoryCommissionRate(categorySlug)`:
- Query `service_categories` por `slug` para obtener `commission_rate`
- Fallback a `COMMISSION_RATE` (0.12) si no se encuentra
- `calculateCommission()` no cambia

## 3. Validation Schemas (`src/lib/validations/api-schemas.ts`)

- **Eliminar** `UpdateProviderCommissionSchema` (lineas 22-27)
- **Agregar** `commission_rate: z.number().min(0).max(1).default(0.12)` a `CreateCategorySchema`
- **Agregar** `commission_rate: z.number().min(0).max(1).optional()` a `UpdateCategorySchema`

## 4. Eliminar API Route (`src/app/api/admin/providers/commission/route.ts`)

Eliminar el archivo completo. La comision ahora se gestiona via el API de catalogo existente (`/api/admin/catalog` y `/api/admin/catalog/[slug]`).

## 5. Queries (`src/lib/supabase/queries.ts`)

- **Agregar** `getCategoriesWithCommission()` — retorna categorias activas con `commission_rate` y `service_count`
- **Modificar** `getProvidersWithCommission()` — quitar `commission_rate` del select (ya no existe en profiles)
- **Modificar** `getProviderStats()` — agregar calculo de `avgCommissionRate` basado en categorias de los servicios del proveedor (promedio ponderado por cantidad de servicios por categoria)
- **Eliminar** `updateProviderCommissionRate()`

## 6. Types (`src/types/database.ts`)

- **Quitar** `commission_rate: number` de `Profile` (linea 78)
- **Agregar** `commission_rate: number` a `CatalogCategory` (despues de `is_active`)

## 7. Checkout (`src/app/checkout/page.tsx`)

En `createBookingsForOrder` (linea 178-180):
- Cambiar `getProviderCommissionRate(item.service_snapshot.provider_id)` → `getCategoryCommissionRate(item.service_snapshot.category)`
- El snapshot se guarda igual: `commission_rate_snapshot: categoryRate`

## 8. Admin Proveedores (`src/app/admin-portal/dashboard/proveedores/page.tsx`)

Simplificar la pagina eliminando todo lo relacionado con comision:
- Quitar imports de `updateProviderCommissionRate`, `COMMISSION_RATE`
- Quitar states: `editProvider`, `editRate`, `saving`
- Quitar `weightedAvg` calculo, `openEdit`, `handleSave`
- Quitar cards "Comision Promedio Ponderada" y "Comision Base"
- Quitar columna "Comision" de la tabla y la celda con Badge "Personalizada"
- Quitar columna "Acciones" con boton "Editar"
- Quitar dialog completo de editar comision (lineas 200-245)
- Reemplazar card de "Comision Promedio Ponderada" por "Total Servicios Activos"

## 9. Admin Configuracion (`src/app/admin-portal/dashboard/configuracion/page.tsx`)

**Card de Comisiones (lineas 332-359):**
- Cambiar `getProvidersWithCommission()` por `getCategoriesWithCommission()` en `loadPolicies`
- Actualizar texto: "por proveedor" → "por categoria"
- Stats: `count` ahora es categorias, no proveedores

**Dialog de editar categoria (lineas 565-634):**
- Agregar state `catCommissionRate` (default '12.00')
- Inicializar en `openCreateCatalog` y `openEditCategory`
- Agregar campo input de porcentaje al formulario (entre Orden y Activa)
- Enviar `commission_rate: parseFloat(catCommissionRate) / 100` en el body del fetch

**Tabla de categorias (lineas 381-417):**
- Agregar columna "Comision" al header
- Agregar celda mostrando `{((cat.commission_rate ?? 0.12) * 100).toFixed(1)}%`

## 10. Admin Finanzas (`src/app/admin-portal/dashboard/finanzas/page.tsx`)

- Cambiar import `getProvidersWithCommission` → `getCategoriesWithCommission`
- Cambiar calculo de promedio ponderado: usar `categories` en vez de `providers`

## 11. Provider Dashboard (`src/app/dashboard/proveedor/page.tsx`)

- Quitar import de `getProfileById`
- `getProviderStats` ahora retorna `avgCommissionRate` — usarlo directamente
- Cambiar de `Promise.all([getProviderStats, getProfileById])` a solo `getProviderStats`

## 12-14. Catalog Provider, Auth Provider, Mock Users

- `catalog-provider.tsx`: Agregar `commission_rate: 0.12` al fallback data de categorias
- `auth-provider.tsx`: Quitar `commission_rate: 0.12` del mock user
- `mock-users.ts`: Quitar `commission_rate: 0.12` de todos los mock users

---

## Verificacion

1. `npm run build` sin errores
2. Ejecutar migration en Supabase
3. Admin: Configuracion > Editar categoria > Campo de comision visible y funcional
4. Admin: Configuracion > Tabla de categorias muestra columna "Comision"
5. Admin: Proveedores > Ya no hay dialog ni columna de comision
6. Admin: Finanzas > Promedio ponderado calculado desde categorias
7. Provider: Dashboard > Comision mostrada es promedio de sus categorias
8. Checkout: Booking creado usa `commission_rate` de la categoria del servicio
9. Booking existente: `commission_rate_snapshot` no cambia

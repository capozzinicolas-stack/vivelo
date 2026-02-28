# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vivelo is a Mexican event services marketplace connecting clients with providers (catering, audio, decoration, photo/video, staff, furniture) across 7 zones. Built with Next.js 14 App Router, Supabase (auth + DB), Stripe (payments in MXN), Google Calendar (provider sync), and Anthropic Claude (Vivi AI chat assistant). Deployed on Vercel at `solovivelo.com` (consumer) and `admin.solovivelo.com` (admin portal).

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
npm start        # Start production server
```

## Architecture

### Dual-Domain Routing

Middleware (`src/middleware.ts`) detects `admin.` hostname and rewrites paths to `/admin-portal/*`, setting `x-admin-portal: 1` header. The root layout uses this header to conditionally suppress consumer navbar/footer/chat. Direct access to `/admin-portal/*` from the main domain is blocked. `/dashboard/admin/*` redirects to the admin subdomain.

### Mock/Production Duality

Every integration checks for placeholder env vars and returns mock data when unconfigured. The primary check is `process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')`. This enables full dev workflow without credentials. Stripe, Google Calendar, and Anthropic each have their own placeholder checks.

### Auth System

Three Supabase clients exist:
- `src/lib/supabase/client.ts` — browser client for client components
- `src/lib/supabase/server.ts` — server client (reads cookies) for server components/API routes
- `src/lib/supabase/admin.ts` — service role client, bypasses RLS for admin operations

`AuthProvider` wraps the app, fetching the `profiles` table row (not raw auth user). Roles: `'client' | 'provider' | 'admin'`.

**API route auth pattern:**
```ts
const auth = await requireAuth();          // or requireRole(['admin'])
if (isAuthError(auth)) return auth;        // returns 401/403 NextResponse
const { user, profile, supabase } = auth;
```

Client-side: `<AuthGuard allowedRoles={['provider']}>` wraps protected pages.

### Data Flow

Pages are `'use client'` and load data via `useEffect` with client-side Supabase queries (`src/lib/supabase/queries.ts`). Query functions check `isMockMode()` and return mock data from `src/data/` when Supabase is unconfigured.

### Checkout Flow

Cart (`CartProvider`, persisted to `localStorage` key `'vivelo-cart'`) → availability check via `checkVendorAvailability()` → `createOrder()` → `POST /api/stripe/create-payment-intent` → Stripe Elements payment → `createBookingsForOrder()` creates `Booking` + `SubBooking` records with snapshots (`commission_rate_snapshot`, `cancellation_policy_snapshot`, `effective_start`/`effective_end` with buffers) → Stripe webhook confirms as fallback → redirect to confirmation page.

### Booking State Machine (`src/lib/booking-state-machine.ts`)

`pending → confirmed | cancelled | rejected → in_review → completed | cancelled`. Terminal states: `completed`, `cancelled`, `rejected`.

### Key Integrations

- **Stripe**: MXN currency, amounts in pesos (centavos for API). Webhook at `/api/stripe/webhook` with `stripe_webhook_events` table for idempotency. Refund percentage based on time until event (`src/lib/cancellation.ts`).
- **Google Calendar**: OAuth with HMAC-signed state, tokens encrypted with AES-256-GCM (`GOOGLE_TOKEN_ENCRYPTION_KEY`). Sync is Google→Vivelo (creates `vendor_calendar_blocks`). Bookings push to provider's "Vivelo - Mis Eventos" calendar. Daily cron sync at 8am UTC (`vercel.json`).
- **Anthropic (Vivi chat)**: Model `claude-sonnet-4-20250514`, SSE streaming from `/api/chat`. Agentic tool-use loop (max 5 rounds) with tools: `search_services`, `get_service_details`, `check_availability`, `calculate_price`. Tool schemas built dynamically from DB catalog.

### Context Providers (root layout)

`AuthProvider` → `CatalogProvider` → `CartProvider` → `ChatProvider` → `ToastProvider`

`CatalogProvider` fetches categories/subcategories/zones from `/api/admin/catalog` (public GET) with fallback to static `src/data/categories.ts`.

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **UI components**: shadcn/ui (new-york style) in `src/components/ui/`, Radix UI + CVA. Icons from lucide-react.
- **Forms**: React Hook Form + Zod resolvers. API validation via `validateBody(request, Schema)` from `src/lib/validations/api-schemas.ts`.
- **Styling**: Tailwind with CSS variables for theming. Brand colors: `gold (#ecbe38)`, `deep-purple (#43276c)`, `off-white (#fcf7f4)`. Font: Helvetica Now Display. Dynamic Tailwind classes from DB are safelisted in `tailwind.config.ts`.
- **Commission**: Default 12% (`COMMISSION_RATE` in `src/lib/constants.ts`), per-provider override in `profiles.commission_rate`.
- **Buffer system**: Services have `buffer_before_minutes/days`, `buffer_after_minutes/days`. Providers can override per-service buffers globally. `calculateEffectiveTimes()` expands booking windows.
- **Snapshot pattern**: Financial data (commission rate, cancellation policy, billing type) is snapshotted at booking creation for historical accuracy.
- **Spanish throughout**: All UI text, error messages, and many comments are in Mexican Spanish. Console logs use `[ModuleName] Message` format.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public routes)     # /, /login, /servicios, /checkout, /blog, etc.
│   ├── dashboard/
│   │   ├── cliente/        # Client: bookings, profile
│   │   ├── proveedor/      # Provider: services CRUD, calendar, campaigns, settings
│   │   └── admin/          # Redirects to admin subdomain
│   ├── admin-portal/       # Full admin dashboard (served at admin.solovivelo.com)
│   └── api/                # stripe/, bookings/, chat, google-calendar/, admin/
├── components/             # Grouped by domain (auth/, chat/, checkout/, dashboard/, homepage/, services/, layout/, ui/)
├── data/                   # Static/mock data
├── hooks/                  # Custom React hooks
├── lib/                    # Business logic, utilities, integrations
│   ├── supabase/           # Three clients + queries + storage + middleware
│   ├── chat/               # System prompt, tools, tool executor
│   ├── google-calendar/    # OAuth, encryption, sync
│   ├── auth/               # API route auth helpers (requireAuth, requireRole)
│   └── validations/        # Zod schemas for API routes
├── providers/              # React context providers
└── types/                  # TypeScript type definitions

supabase/migrations/        # 29 sequential SQL migration files
agentes-de-ia/              # AI agent role definitions + security audit report
```

## Database

Supabase with RLS on all tables. Key tables: `profiles`, `services`, `extras`, `bookings`, `sub_bookings`, `orders`, `vendor_calendar_blocks`, `google_calendar_connections`, `cancellation_policies`/`cancellation_rules`, `service_categories`/`service_subcategories`/`service_zones`, `featured_placements`, `campaigns`, `blog_posts`, `showcase_items`, `site_banners`, `notifications`, `reviews`.

Admin operations use the service role key to bypass RLS.

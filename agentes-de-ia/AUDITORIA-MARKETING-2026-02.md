# Auditoria Multi-Agente: Marketing & Growth — Vivelo

**Fecha:** 2026-02-28
**Sitios auditados:** solovivelo.com | admin.solovivelo.com/dashboard/marketing
**Agentes participantes:** Marketing (06), Frontend/UX (01), Backend/API (02), Database (03), QA/Security (04), DevOps/Infra (05)

---

## Resumen Ejecutivo

Vivelo tiene una infraestructura funcional de marketplace con 8 espacios publicitarios implementados y un panel de marketing administrable. Sin embargo, la auditoria revela **problemas criticos** que hacen que el sitio sea practicamente **invisible para motores de busqueda y redes sociales**, que los **descuentos de campanas nunca se apliquen en checkout**, y que exista **cero tracking de analytics**. El sitio funciona bien como producto, pero no tiene fundaciones de marketing digital.

### Scorecard General

| Area | Puntuacion | Estado |
|------|-----------|--------|
| SEO Tecnico | 1/10 | Sin sitemap, robots.txt, structured data; todo client-side rendered |
| SEO On-Page | 2/10 | Solo el root layout tiene metadata basico |
| Open Graph / Social | 0/10 | Zero OG tags, zero Twitter Cards |
| SAIO (Search AI Optimization) | 0/10 | Zero datos estructurados, zero FAQ schemas |
| Analytics & Tracking | 0/10 | Zero GA4, GTM, Meta Pixel, Vercel Analytics |
| Retail Media (Espacios publicitarios) | 4/10 | 8 espacios existen pero sin tracking de impresiones/clicks |
| Campanas Promocionales | 2/10 | Se crean pero descuentos nunca se aplican en checkout |
| Email Marketing | 0/10 | Sin libreria de envio de emails instalada |
| CRO (Conversion) | 5/10 | Buen UX de producto, falta social proof y trust signals |
| Brand | 6/10 | Diseno consistente, falta tagline y assets |

---

## Hallazgos por Severidad

### CRITICOS (17 hallazgos) — Requieren accion inmediata

#### SEO & Rendering

| # | Hallazgo | Agentes | Impacto |
|---|----------|---------|---------|
| C1 | **Todas las paginas publicas son `'use client'`** — Homepage, /servicios, /servicios/[id], /blog, /blog/[slug], /proveedores/[id] cargan datos via `useEffect`. Googlebot ve HTML vacio. | Frontend + DevOps | El sitio completo es invisible para motores de busqueda |
| C2 | **Ninguna pagina tiene `generateMetadata()`** — No hay titulo, descripcion, ni OG tags dinamicos por pagina. Solo el root layout tiene metadata generico. | Frontend + Marketing | Cada pagina comparte el mismo titulo en Google |
| C3 | **No existe `robots.txt`** — Crawlers no tienen directivas. El admin-portal es indexable. | DevOps + Marketing | Google puede indexar paginas de admin |
| C4 | **No existe sitemap** — Ni `sitemap.xml` estatico, ni `src/app/sitemap.ts` dinamico, ni `next-sitemap`. | DevOps + Marketing | Google no puede descubrir servicios ni blog posts |
| C5 | **Zero Schema.org / JSON-LD** en todo el codebase — No hay `Service`, `LocalBusiness`, `Article`, `Organization`, `Review`, `FAQ`, `BreadcrumbList`. | Frontend + Marketing | Sin rich snippets en Google, invisible para AI search |
| C6 | **Zero Open Graph tags** — Social shares (WhatsApp, Facebook, LinkedIn) muestran titulo generico sin imagen. | Frontend + Marketing | Links compartidos no generan clicks |

#### Analytics

| # | Hallazgo | Agentes | Impacto |
|---|----------|---------|---------|
| C7 | **Zero analytics en el sitio** — No GA4, no GTM, no Meta Pixel, no Vercel Analytics. Ningun script de tracking instalado. | DevOps + Marketing | Cero datos de trafico, conversion, o comportamiento |
| C8 | **No hay paquetes de analytics** — `@vercel/analytics`, `@vercel/speed-insights`, `@next/third-parties` no estan instalados. | DevOps | No se puede instalar analytics sin agregar dependencias |
| C9 | **No hay env vars de analytics** — No existe `GA_MEASUREMENT_ID`, `META_PIXEL_ID`, etc. en `.env.example`. | DevOps | No hay infraestructura para activar tracking |

#### Campanas & Checkout

| # | Hallazgo | Agentes | Impacto |
|---|----------|---------|---------|
| C10 | **Descuentos de campanas son solo visuales** — La homepage muestra precios con descuento, pero el checkout cobra precio completo. No hay logica de descuento en `createOrder`, `create-payment-intent`, ni en el carrito. | Backend + Database + QA | Clientes ven un precio y pagan otro |
| C11 | **No hay `campaign_id` en bookings/orders** — Las tablas `bookings` y `orders` no tienen FK a `campaigns`. Imposible rastrear que booking vino de que campana. | Database + Backend | Cero medicion de ROI de campanas |
| C12 | **No hay verificacion server-side de precios** — `/api/stripe/create-payment-intent` acepta el `amount` del cliente sin validar contra campanas activas. | Backend + QA | Riesgo de manipulacion de precios |

#### Marketing Analytics

| # | Hallazgo | Agentes | Impacto |
|---|----------|---------|---------|
| C13 | **Zero tracking de impresiones/clicks en espacios publicitarios** — `featured_placements`, `campaigns`, `banners`, `showcase` no registran vistas ni clicks. | Database + Marketing | Imposible medir ROI de retail media |
| C14 | **No hay queries de rendimiento de campanas** — No se puede consultar cuantos bookings genero una campana. | Database + Backend | Marketing opera a ciegas |
| C15 | **`services.view_count` nunca se incrementa** — La columna existe en DB, se muestra en dashboards, pero ningun codigo la actualiza. | Database + Backend | Datos de popularidad son falsos |

#### Admin Panel

| # | Hallazgo | Agentes | Impacto |
|---|----------|---------|---------|
| C16 | **Featured Providers no tiene UI de admin** — Queries existen, homepage los muestra, pero no hay pantalla para gestionarlos. Solo via SQL directo. | Frontend + Marketing | Espacio publicitario inmanejable |
| C17 | **Zero API routes para marketing** — Todas las mutaciones (placements, campanas, blog, banners) van directo del browser a Supabase sin validacion server-side, sin schemas Zod, sin sanitizacion. | Backend + QA | Seguridad depende 100% de RLS |

---

### ALTOS (19 hallazgos)

#### SEO & Contenido

| # | Hallazgo | Agentes |
|---|----------|---------|
| H1 | No hay `metadataBase` en root layout — OG images no resuelven a URLs absolutas | Frontend |
| H2 | No hay favicon.ico, apple-touch-icon en /public | DevOps |
| H3 | No hay cookie consent banner (requerido por LFPDPPP mexicana) | Frontend + QA |
| H4 | No hay breadcrumbs en ninguna pagina | Frontend + Marketing |
| H5 | No hay paginacion server-side en /servicios — todos los servicios se cargan de golpe | Frontend + Backend |
| H6 | No hay filtros en URL en /servicios — filtros son estado local, no compartibles/indexables | Frontend + Marketing |
| H7 | No hay sort options en /servicios (precio, rating, popularidad) | Frontend |
| H8 | No hay reviews individuales en servicio ni proveedor — solo aggregate rating numerico | Frontend + Database |
| H9 | `blog_posts` no tiene campos SEO (meta_description, focus_keyword, author, tags) | Database + Marketing |
| H10 | Blog content rendering es naive — split por lineas, no soporta markdown real (bold, links, listas) | Frontend |
| H11 | No hay i18n config para es-MX en next.config | DevOps |
| H12 | Admin portal no tiene `robots: 'noindex'` en metadata ni `X-Robots-Tag` header | DevOps + QA |

#### Campanas & Proveedores

| # | Hallazgo | Agentes |
|---|----------|---------|
| H13 | Campanas no se pueden editar despues de creadas — solo cambiar status | Backend + Frontend |
| H14 | Admin no puede ver que proveedores se inscribieron a cada campana | Frontend + Backend |
| H15 | Proveedores no ven el costo que absorben al inscribirse a campana (solo ven discount_pct) | Frontend |
| H16 | Proveedores no tienen metricas de rendimiento de campanas | Frontend + Backend |

#### Infraestructura

| # | Hallazgo | Agentes |
|---|----------|---------|
| H17 | No hay libreria de email (resend, sendgrid) — sin confirmaciones, sin marketing emails | DevOps + Backend |
| H18 | No hay tabla `utm_attribution` — no se puede medir canal de adquisicion | Database + Marketing |
| H19 | Checkout no tiene cross-sell/upsell ni multiples trust badges | Frontend + Marketing |

---

### MEDIOS (14 hallazgos)

| # | Hallazgo | Agentes |
|---|----------|---------|
| M1 | No hay social proof counters en homepage (# proveedores, # eventos) | Frontend + Marketing |
| M2 | No hay seccion "Como funciona" en homepage | Frontend + Marketing |
| M3 | No hay FAQ section en paginas de servicio | Frontend + Marketing |
| M4 | No hay botones de compartir (WhatsApp, Facebook) en servicios y blog | Frontend |
| M5 | No hay servicios relacionados/similares al final del detalle de servicio | Frontend + Backend |
| M6 | No hay progreso de pasos en checkout (Carrito → Pago → Confirmacion) | Frontend |
| M7 | No hay notificacion a proveedores cuando se activa una campana | Backend |
| M8 | No hay validacion de fechas en placements/campanas (end > start) | Backend + QA |
| M9 | No hay audit logging para acciones de marketing | Backend + QA |
| M10 | No hay archivado automatico de placements/campanas expirados | Backend + Database |
| M11 | No hay tablas de referral (codigos, recompensas) | Database |
| M12 | No hay tabla de `email_events` para tracking de email marketing | Database |
| M13 | No hay tabla de `search_events` para comportamiento de busqueda | Database |
| M14 | No hay manifest.json / PWA support | DevOps |

---

## Inventario de Espacios Publicitarios — Estado Real

| # | Espacio | Gestion Admin | Visible en Sitio | Tracking | Monetizable | Estado |
|---|---------|:---:|:---:|:---:|:---:|--------|
| 1 | Servicios Destacados | SI | SI | NO | Potencial | Funcional, sin metricas |
| 2 | Servicios Recomendados | SI | SI | NO | Potencial | Funcional, sin metricas |
| 3 | Mas Vendidos | SI | SI | NO | Potencial | Funcional, sin metricas |
| 4 | Proveedores Destacados | **NO** | SI | NO | Potencial | **Sin UI admin** |
| 5 | Showcase de Categorias | SI | SI | NO | Potencial | Funcional, sin metricas |
| 6 | Banners del Sitio | SI (solo edit) | SI | NO | Potencial | Funcional, sin metricas |
| 7 | Campanas Promocionales | SI | SI (visual) | NO | **Roto** | **Descuentos no se aplican** |
| 8 | Blog / Content Marketing | SI (en /contenido) | SI | NO | Organico | Funcional, sin SEO |

---

## Tablas de DB Faltantes para Marketing

| Tabla | Proposito | Prioridad |
|-------|-----------|-----------|
| `ad_events` | Tracking de impresiones y clicks en espacios publicitarios | ALTA |
| `utm_attribution` | Rastreo de fuente de adquisicion (UTM params) | ALTA |
| Columnas en `bookings`: `campaign_id`, `discount_amount` | Vincular bookings con campanas | CRITICA |
| Columnas en `orders`: `campaign_id`, `discount_amount`, `original_total` | Vincular ordenes con campanas | CRITICA |
| Columnas en `blog_posts`: `author_id`, `meta_title`, `meta_description`, `focus_keyword`, `tags`, `og_image` | SEO de blog | ALTA |
| `referral_codes` + `referral_rewards` | Programa de referidos | MEDIA |
| `email_events` | Tracking de emails enviados/abiertos/clicks | MEDIA |
| `search_events` | Comportamiento de busqueda en el marketplace | MEDIA |
| `provider_subscriptions` | Tiers premium de proveedores | BAJA |

---

## Plan de Remediacion Priorizado

### Fase 1 — Fundaciones SEO e Infraestructura (Semana 1-2)

**Agentes: DevOps + Frontend + Marketing**

1. Agregar `robots.txt` → bloquear `/admin-portal/`, `/dashboard/`, `/api/`, `/checkout/`
2. Crear `src/app/sitemap.ts` → generar sitemap dinamico con servicios activos + blog posts
3. Instalar GA4 + Meta Pixel → `@next/third-parties` o `<Script>` manual en root layout
4. Agregar `favicon.ico`, `apple-touch-icon.png`, `opengraph-image.png` a `/public/`
5. Agregar `robots: 'noindex, nofollow'` en metadata del admin portal layout
6. Agregar env vars: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_SITE_URL`

### Fase 2 — SSR + Metadata Dinamico (Semana 2-3)

**Agentes: Frontend + Backend + Marketing**

7. Convertir `/servicios/[id]/page.tsx` a server component (o hibrido) con `generateMetadata()` → titulo, descripcion, OG image dinamicos por servicio
8. Convertir `/blog/[slug]/page.tsx` a server component con `generateMetadata()` → titulo, descripcion, OG tags por post
9. Convertir `/proveedores/[id]/page.tsx` con `generateMetadata()`
10. Agregar JSON-LD `Service` + `LocalBusiness` + `AggregateRating` en detalle de servicio
11. Agregar JSON-LD `Article` en blog posts
12. Agregar JSON-LD `Organization` + `WebSite` + `SearchAction` en homepage
13. Agregar breadcrumbs con schema `BreadcrumbList` en servicios, blog, proveedores
14. Agregar `metadataBase` en root layout

### Fase 3 — Campanas Funcionales (Semana 3-4)

**Agentes: Backend + Database + QA**

15. Migracion SQL: agregar `campaign_id` y `discount_amount` a tablas `bookings` y `orders`
16. Implementar logica de descuento en checkout: detectar campana activa → aplicar `discount_pct` → calcular `commission_reduction_pct`
17. Implementar verificacion server-side de precios en `/api/stripe/create-payment-intent`
18. Agregar snapshot de campana al booking (`campaign_id`, `discount_amount`)
19. Agregar UI de Featured Providers al panel de marketing
20. Habilitar edicion de campanas (no solo status)
21. Agregar vista de suscripciones por campana para admin

### Fase 4 — Analytics & Tracking (Semana 4-5)

**Agentes: Database + Backend + Frontend + Marketing**

22. Crear tabla `ad_events` para impresiones/clicks de espacios publicitarios
23. Implementar tracking de impresiones en componentes de featured placements, showcase, banners
24. Implementar increment de `services.view_count` via RPC en pagina de detalle
25. Crear tabla `utm_attribution` y capturar UTMs al primer visit
26. Configurar eventos de GA4: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
27. Dashboard de rendimiento de campanas en admin (bookings, revenue, ROI)

### Fase 5 — CRO & Growth (Semana 5-8)

**Agentes: Frontend + Marketing + Backend**

28. Agregar reviews individuales en servicio y proveedor
29. Agregar social proof counters en homepage
30. Agregar cross-sell en checkout
31. Agregar trust badges multiples en checkout
32. Agregar FAQ section en detalle de servicio
33. Agregar botones de compartir (WhatsApp, FB, copiar link)
34. Instalar libreria de email (Resend) + flujos basicos (confirmacion, post-compra)
35. Agregar paginacion server-side + filtros en URL en /servicios
36. Implementar sort options en listado de servicios
37. Agregar campos SEO a blog_posts (meta_description, keywords, author, tags)
38. Implementar markdown rendering real para blog content

### Fase 6 — Monetizacion Avanzada (Semana 8-12)

**Agentes: Todos**

39. Resultados patrocinados en /servicios
40. Badge "Proveedor Premium" con suscripcion
41. Self-service de placements para proveedores
42. Programa de referidos (tablas + UI + logica)
43. Landing pages por zona para SEO local
44. Email marketing automatizado (carrito abandonado, reactivacion, newsletter)
45. A/B testing framework

---

## Verificacion de Checklist del Agente Marketing

### SEO & SAIO
- [x] ~~Meta title y description dinamicos en paginas de servicio~~ **FALTA**
- [x] ~~Schema.org JSON-LD~~ **FALTA** — cero implementado
- [x] ~~Sitemap.xml dinamico~~ **FALTA**
- [x] ~~robots.txt configurado~~ **FALTA**
- [x] ~~URLs canonicas~~ **FALTA**
- [x] ~~Open Graph y Twitter Cards~~ **FALTA**
- [x] ~~Core Web Vitals~~ **NO MEDIDO** — sin analytics
- [x] ~~Contenido optimizado para AI~~ **FALTA** — sin FAQs, sin structured data
- [x] ~~Alt text en imagenes~~ **PARCIAL** — service title como alt, pero sin optimizacion
- [x] ~~Breadcrumbs con schema~~ **FALTA**

### Retail Media & Monetizacion
- [x] ~~Tracking de impresiones en espacios publicitarios~~ **FALTA**
- [x] ~~Revenue por espacio en dashboard admin~~ **FALTA**
- [x] ~~Self-service de placements para proveedores~~ **FALTA**
- [x] ~~Modelo de pricing por espacio~~ **FALTA**
- [x] ~~Billing automatizado para ads~~ **FALTA**
- [x] ~~Resultados patrocinados en busqueda~~ **FALTA**

### Paid Media & Tracking
- [x] ~~Pixel de Meta~~ **FALTA**
- [x] ~~Google Ads conversion tracking~~ **FALTA**
- [x] ~~Eventos GA4 de ecommerce~~ **FALTA**
- [x] ~~UTM parameters~~ **FALTA**
- [x] ~~Retargeting audiences~~ **FALTA**
- [x] ~~Attribution model~~ **FALTA**

### Email Marketing
- [x] ~~Flujo de bienvenida~~ **FALTA** — sin libreria de email
- [x] ~~Email post-compra~~ **FALTA**
- [x] ~~Email post-evento~~ **FALTA**
- [x] ~~Email de reactivacion~~ **FALTA**
- [x] ~~Email de carrito abandonado~~ **FALTA**
- [x] ~~Newsletter~~ **FALTA**
- [x] ~~DNS (SPF, DKIM, DMARC)~~ **FALTA**

### Brand & Content
- [x] ~~Tagline definido~~ **FALTA**
- [x] ~~Social proof en homepage~~ **FALTA**
- [x] ~~Calendario editorial~~ **FALTA**
- [x] ~~Templates de social media~~ **FALTA**
- [x] ~~Video institucional~~ **FALTA**
- [x] ~~Guia de estilo~~ **PARCIAL** — colores y fuente definidos, sin documento formal

### CRO & Growth
- [ ] CTAs claros en cada paso — **PARCIAL** — buen CTA en detalle de servicio, falta en otros
- [x] ~~Checkout simplificado~~ **OK** — funcional pero falta cross-sell y trust badges
- [x] ~~Trust badges multiples~~ **PARCIAL** — solo 1 badge de Stripe
- [x] ~~Reviews verificadas visibles~~ **FALTA** — solo aggregate, no individuales
- [x] ~~Programa de referidos~~ **FALTA**
- [x] ~~A/B testing~~ **FALTA**

---

**Conclusion:** Vivelo tiene un producto funcional y bien construido, pero carece de las fundaciones de marketing digital necesarias para crecer. Las prioridades absolutas son: (1) hacer el sitio visible para Google con SSR + metadata, (2) instalar analytics, (3) hacer que las campanas realmente descuenten en checkout, y (4) agregar tracking a los espacios publicitarios.

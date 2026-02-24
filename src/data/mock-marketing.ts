import type { FeaturedPlacement, Campaign, CampaignSubscription, FeaturedProvider, ShowcaseItem, SiteBanner } from '@/types/database';

export const mockFeaturedPlacements: FeaturedPlacement[] = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    service_id: '10000000-0000-0000-0000-000000000001',
    section: 'servicios_destacados',
    position: 0,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000002',
    service_id: '10000000-0000-0000-0000-000000000003',
    section: 'servicios_destacados',
    position: 1,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000003',
    service_id: '10000000-0000-0000-0000-000000000005',
    section: 'servicios_destacados',
    position: 2,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000004',
    service_id: '10000000-0000-0000-0000-000000000011',
    section: 'servicios_destacados',
    position: 3,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000005',
    service_id: '10000000-0000-0000-0000-000000000002',
    section: 'servicios_recomendados',
    position: 0,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000006',
    service_id: '10000000-0000-0000-0000-000000000010',
    section: 'mas_vendidos',
    position: 0,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: '60000000-0000-0000-0000-000000000101',
    internal_name: 'Promo Verano 2026',
    external_name: 'Ofertas de Verano',
    description: 'Campana de verano con descuentos en servicios de eventos al aire libre. Ideal para bodas y fiestas en jardin.',
    discount_pct: 15,
    commission_reduction_pct: 5,
    vivelo_absorbs_pct: 60,
    provider_absorbs_pct: 40,
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-08-31T23:59:59Z',
    exposure_channels: ['homepage', 'email', 'social_media'],
    status: 'active',
    created_at: '2025-12-15T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000102',
    internal_name: 'Black Friday Eventos',
    external_name: 'Black Friday - Hasta 25% Off',
    description: 'Descuento especial de Black Friday para reservas de servicios de eventos durante noviembre.',
    discount_pct: 25,
    commission_reduction_pct: 10,
    vivelo_absorbs_pct: 50,
    provider_absorbs_pct: 50,
    start_date: '2026-11-20T00:00:00Z',
    end_date: '2026-11-30T23:59:59Z',
    exposure_channels: ['homepage', 'email'],
    status: 'draft',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
];

export const mockCampaignSubscriptions: CampaignSubscription[] = [
  {
    id: '60000000-0000-0000-0000-000000000201',
    campaign_id: '60000000-0000-0000-0000-000000000101',
    service_id: '10000000-0000-0000-0000-000000000001',
    provider_id: '00000000-0000-0000-0000-000000000002',
    status: 'active',
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000202',
    campaign_id: '60000000-0000-0000-0000-000000000101',
    service_id: '10000000-0000-0000-0000-000000000003',
    provider_id: '00000000-0000-0000-0000-000000000002',
    status: 'active',
    created_at: '2026-01-03T00:00:00Z',
  },
];

export const mockFeaturedProviders: FeaturedProvider[] = [
  {
    id: '60000000-0000-0000-0000-000000000301',
    provider_id: '00000000-0000-0000-0000-000000000002',
    position: 0,
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockShowcaseItems: ShowcaseItem[] = [
  { id: '70000000-0000-0000-0000-000000000001', label: 'Animadores', description: 'El espiritu de tu evento quien determina eres tu! Conozca la amplia variedad de animadores de Vivelo y dale vida a tu evento con tu toque especial.', subcategory: 'ANIMADOR_MC', parent_category: 'AUDIO', gradient_color: 'from-purple-500 to-pink-500', position: 0, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: '70000000-0000-0000-0000-000000000002', label: 'Mariachis', description: 'La alma de tu evento no puede dejar de existir! Los mariachis mas clasicos de Mexico pueden estar presentes en tu evento para que tu lo vivas sin igual.', subcategory: 'MARIACHI', parent_category: 'AUDIO', gradient_color: 'from-amber-500 to-orange-500', position: 1, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: '70000000-0000-0000-0000-000000000003', label: 'Planners', description: 'No deje que ningun detalle de tu evento sea olvidado, solo Vivelo. Nuestra seleccion especial de planners para que tu disfrute cada momento.', subcategory: 'COORDINADOR_PLANNER', parent_category: 'STAFF', gradient_color: 'from-green-500 to-teal-500', position: 2, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: '70000000-0000-0000-0000-000000000004', label: 'Floristas', description: 'Transforma tu evento en un jardin de ensueno. Los mejores arreglos florales para bodas, fiestas y celebraciones especiales.', subcategory: 'FLORAL', parent_category: 'DECORATION', gradient_color: 'from-pink-400 to-rose-500', position: 3, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: '70000000-0000-0000-0000-000000000005', label: 'Seguridad', description: 'La tranquilidad de tu evento empieza con la seguridad. Profesionales capacitados para garantizar que todo salga perfecto.', subcategory: 'SEGURIDAD', parent_category: 'STAFF', gradient_color: 'from-gray-600 to-gray-800', position: 4, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: '70000000-0000-0000-0000-000000000006', label: 'Valet Parking', description: 'La primera impresion cuenta. Servicio de estacionamiento profesional para que tus invitados lleguen con estilo.', subcategory: 'VALET_PARKING', parent_category: 'STAFF', gradient_color: 'from-blue-500 to-indigo-600', position: 5, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
];

export const mockSiteBanners: SiteBanner[] = [
  { id: '70000000-0000-0000-0000-000000000101', banner_key: 'showcase_promo', title: 'Los mejores servicios para tu evento', subtitle: null, button_text: 'Todos los servicios', button_link: '/servicios', gradient: 'from-pink-300 via-pink-400 to-pink-500', image_url: null, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: '70000000-0000-0000-0000-000000000102', banner_key: 'cashback_banner', title: 'Cashback de 5%', subtitle: 'regalos y servicios gratuitos con tus recompras', button_text: null, button_link: null, gradient: null, image_url: null, is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
];

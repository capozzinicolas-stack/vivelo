export type ViveloZoneSlug =
  | 'ciudad-de-mexico'
  | 'estado-de-mexico'
  | 'toluca'
  | 'puebla'
  | 'hidalgo'
  | 'queretaro'
  | 'guanajuato'
  | 'tlaxcala'
  | 'morelos';

export interface PlaceComponents {
  locality: string;
  administrative_area_level_1: string;
  administrative_area_level_2?: string;
}

export interface AddressResult {
  address: string;
  zone: ViveloZoneSlug | null;
  zoneLabel: string | null;
  lat: number | null;
  lng: number | null;
}

export const ZONE_LABELS: Record<ViveloZoneSlug, string> = {
  'ciudad-de-mexico': 'Ciudad de México',
  'estado-de-mexico': 'Estado de México',
  'toluca': 'Toluca',
  'puebla': 'Puebla',
  'hidalgo': 'Hidalgo',
  'queretaro': 'Querétaro',
  'guanajuato': 'Guanajuato',
  'tlaxcala': 'Tlaxcala',
  'morelos': 'Morelos',
};

const TOLUCA_METRO = [
  'toluca de lerdo', 'toluca', 'metepec', 'zinacantepec',
  'lerma', 'san mateo atenco', 'ocoyoacac',
];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function mapPlaceToZone(components: PlaceComponents): ViveloZoneSlug | null {
  const state = normalize(components.administrative_area_level_1);
  const city = normalize(components.locality || '');
  const muni = normalize(components.administrative_area_level_2 || '');

  switch (state) {
    case 'ciudad de mexico':
    case 'df':
    case 'distrito federal':
      return 'ciudad-de-mexico';

    case 'mexico':
    case 'estado de mexico': {
      // Check Toluca metro first
      if (TOLUCA_METRO.some(t => city.includes(t) || muni.includes(t))) {
        return 'toluca';
      }
      // Everything else in EdoMex (conurbado or not)
      return 'estado-de-mexico';
    }

    case 'puebla':
      return 'puebla';

    case 'hidalgo':
      return 'hidalgo';

    case 'queretaro':
    case 'queretaro de arteaga':
      return 'queretaro';

    case 'guanajuato':
      return 'guanajuato';

    case 'tlaxcala':
      return 'tlaxcala';

    case 'morelos':
      return 'morelos';

    default:
      return null;
  }
}

export function getZoneLabel(slug: ViveloZoneSlug | null): string | null {
  if (!slug) return null;
  return ZONE_LABELS[slug] || null;
}

/**
 * Check if a service covers a given zone.
 * Handles the label-vs-slug mismatch: service.zones stores labels,
 * but event_zone is a slug from mapPlaceToZone.
 */
export function serviceCoversZone(serviceZones: string[], zoneSlug: ViveloZoneSlug | null): boolean {
  if (!zoneSlug || serviceZones.length === 0) return true; // no zone to check = no conflict
  const label = ZONE_LABELS[zoneSlug];
  if (!label) return false;
  const normalizedLabel = normalize(label);
  return serviceZones.some(z => normalize(z) === normalizedLabel);
}

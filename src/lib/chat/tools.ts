import type Anthropic from '@anthropic-ai/sdk';

export function getChatTools(categorySlugs: string[], zoneLabels: string[]): Anthropic.Tool[] {
  return [
    {
      name: 'search_services',
      description:
        'Busca servicios disponibles en el catálogo de Vivelo. Usa esta herramienta SIEMPRE que el usuario pregunte por servicios, proveedores o precios. Puedes filtrar por categoría, zona, rango de precio y texto libre.',
      input_schema: {
        type: 'object' as const,
        properties: {
          category: {
            type: 'string',
            enum: categorySlugs.length > 0 ? categorySlugs : ['FOOD_DRINKS', 'AUDIO', 'DECORATION', 'PHOTO_VIDEO', 'STAFF', 'FURNITURE'],
            description: 'Categoría del servicio',
          },
          zone: {
            type: 'string',
            enum: zoneLabels.length > 0 ? zoneLabels : [
              'Ciudad de México',
              'Estado de México',
              'Puebla',
              'Toluca',
              'Cuernavaca',
              'Querétaro',
              'Pachuca',
            ],
            description: 'Zona de cobertura',
          },
          min_price: {
            type: 'number',
            description: 'Precio mínimo en MXN',
          },
          max_price: {
            type: 'number',
            description: 'Precio máximo en MXN',
          },
          search: {
            type: 'string',
            description: 'Texto libre de búsqueda (nombre, descripción)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_service_details',
      description:
        'Obtiene los detalles completos de un servicio específico, incluyendo descripción, extras disponibles, y datos del proveedor.',
      input_schema: {
        type: 'object' as const,
        properties: {
          service_id: {
            type: 'string',
            description: 'ID del servicio',
          },
        },
        required: ['service_id'],
      },
    },
    {
      name: 'check_availability',
      description:
        'Verifica si un proveedor tiene disponibilidad para una fecha y horario específico.',
      input_schema: {
        type: 'object' as const,
        properties: {
          service_id: {
            type: 'string',
            description: 'ID del servicio a verificar',
          },
          date: {
            type: 'string',
            description: 'Fecha del evento en formato YYYY-MM-DD',
          },
          start_time: {
            type: 'string',
            description: 'Hora de inicio en formato HH:MM (24h)',
          },
          end_time: {
            type: 'string',
            description: 'Hora de fin en formato HH:MM (24h)',
          },
        },
        required: ['service_id', 'date', 'start_time', 'end_time'],
      },
    },
    {
      name: 'calculate_price',
      description:
        'Calcula el precio estimado de un servicio según el número de invitados, horas, y extras seleccionados.',
      input_schema: {
        type: 'object' as const,
        properties: {
          service_id: {
            type: 'string',
            description: 'ID del servicio',
          },
          guest_count: {
            type: 'number',
            description: 'Número de invitados',
          },
          hours: {
            type: 'number',
            description: 'Duración del evento en horas',
          },
        },
        required: ['service_id'],
      },
    },
  ];
}

/** @deprecated Use getChatTools() instead */
export const chatTools: Anthropic.Tool[] = getChatTools([], []);

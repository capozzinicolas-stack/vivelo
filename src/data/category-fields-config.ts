import type { ServiceCategory } from '@/types/database';

export type FieldType = 'text_long' | 'text_short' | 'number' | 'currency' | 'multi_select' | 'dropdown' | 'switch' | 'switch_number';

export interface CategoryFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  instruction: string;
  options?: string[];
  unit?: string;
  switchLabel?: string;
  numberLabel?: string;
}

// Universal fields — apply to ALL categories
export const universalFields: CategoryFieldConfig[] = [
  {
    key: 'not_included',
    label: 'Lo que NO incluye mi servicio',
    type: 'text_long',
    instruction: 'Lista lo que el cliente debe proveer o contratar por separado. Ej: vajilla, mesas, transporte, etc.',
  },
];

// Category-specific fields
export const categoryFieldsMap: Record<ServiceCategory, CategoryFieldConfig[]> = {
  FOOD_DRINKS: [
    {
      key: 'insumos_incluidos',
      label: 'Insumos incluidos',
      type: 'text_long',
      instruction: 'Describe los insumos que incluye tu servicio. Ej: platos, cubiertos, servilletas, chafers, etc.',
    },
    {
      key: 'menu',
      label: 'Menu / Opciones de platillos',
      type: 'text_long',
      instruction: 'Describe las opciones de menu o platillos disponibles.',
    },
    {
      key: 'tipo_servicio',
      label: 'Tipo de servicio',
      type: 'multi_select',
      instruction: 'Selecciona los formatos en los que ofreces tu servicio.',
      options: ['Buffet', 'Servido a mesa', 'Estacion', 'Food truck', 'Para llevar', 'Otro'],
    },
    {
      key: 'espacio_minimo',
      label: 'Espacio minimo requerido',
      type: 'number',
      instruction: 'El area minima que necesitas para montar tu servicio.',
      unit: 'm²',
    },
    {
      key: 'montaje_incluido',
      label: 'Incluye montaje y desmontaje',
      type: 'switch',
      instruction: 'Indica si tu servicio incluye la instalacion y retiro del equipo.',
    },
  ],
  AUDIO: [
    {
      key: 'equipo_incluido',
      label: 'Equipo incluido',
      type: 'text_long',
      instruction: 'Describe el equipo de audio, iluminacion o instrumentos que incluyes. Ej: bocinas, microfono, luces, etc.',
    },
    {
      key: 'repertorio',
      label: 'Repertorio / Tipo de musica',
      type: 'text_long',
      instruction: 'Describe los generos o tipo de musica/entretenimiento que ofreces.',
    },
    {
      key: 'numero_integrantes',
      label: 'Numero de integrantes',
      type: 'number',
      instruction: 'Cuantas personas conforman tu grupo o show.',
    },
    {
      key: 'requiere_electricidad',
      label: 'Requiere toma electrica',
      type: 'switch',
      instruction: 'Indica si necesitas acceso a corriente electrica en el lugar del evento.',
    },
    {
      key: 'espacio_minimo',
      label: 'Espacio minimo requerido',
      type: 'number',
      instruction: 'El area minima que necesitas para tu presentacion.',
      unit: 'm²',
    },
  ],
  DECORATION: [
    {
      key: 'materiales_incluidos',
      label: 'Materiales incluidos',
      type: 'text_long',
      instruction: 'Describe los materiales que incluye tu servicio. Ej: flores, globos, telas, velas, etc.',
    },
    {
      key: 'estilo',
      label: 'Estilo de decoracion',
      type: 'multi_select',
      instruction: 'Selecciona los estilos que manejas.',
      options: ['Elegante', 'Rustico', 'Moderno', 'Bohemio', 'Clasico', 'Tematico', 'Otro'],
    },
    {
      key: 'colores_personalizables',
      label: 'Colores personalizables',
      type: 'switch',
      instruction: 'Indica si el cliente puede elegir la paleta de colores.',
    },
    {
      key: 'montaje_incluido',
      label: 'Incluye montaje y desmontaje',
      type: 'switch',
      instruction: 'Indica si tu servicio incluye la instalacion y retiro de la decoracion.',
    },
    {
      key: 'espacio_maximo',
      label: 'Espacio maximo que cubren',
      type: 'number',
      instruction: 'El area maxima que puedes decorar con este servicio.',
      unit: 'm²',
    },
  ],
  PHOTO_VIDEO: [
    {
      key: 'equipo_incluido',
      label: 'Equipo incluido',
      type: 'text_long',
      instruction: 'Describe tu equipo. Ej: camaras, lentes, dron, iluminacion, impresora, etc.',
    },
    {
      key: 'entregables',
      label: 'Entregables',
      type: 'multi_select',
      instruction: 'Selecciona lo que el cliente recibira.',
      options: ['Fotos editadas', 'Video editado', 'Galeria digital', 'Impresiones', 'Album', 'USB', 'Otro'],
    },
    {
      key: 'tiempo_entrega',
      label: 'Tiempo de entrega',
      type: 'number',
      instruction: 'Dias habiles para entregar el material final.',
      unit: 'dias',
    },
    {
      key: 'num_fotografos',
      label: 'Numero de fotografos/camarografos',
      type: 'number',
      instruction: 'Cuantos profesionales asisten al evento.',
    },
    {
      key: 'sesion_previa',
      label: 'Incluye sesion previa',
      type: 'switch',
      instruction: 'Indica si incluyes una sesion de fotos/video antes del evento.',
    },
  ],
  STAFF: [
    {
      key: 'uniforme_incluido',
      label: 'Incluye uniforme',
      type: 'switch',
      instruction: 'Indica si tu personal se presenta con uniforme.',
    },
    {
      key: 'experiencia',
      label: 'Experiencia del personal',
      type: 'text_long',
      instruction: 'Describe la experiencia y preparacion de tu equipo.',
    },
    {
      key: 'idiomas',
      label: 'Idiomas que hablan',
      type: 'multi_select',
      instruction: 'Selecciona los idiomas que maneja tu personal.',
      options: ['Espanol', 'Ingles', 'Frances', 'Otro'],
    },
    {
      key: 'capacitacion',
      label: 'Capacitacion o certificaciones',
      type: 'text_long',
      instruction: 'Menciona certificaciones relevantes. Ej: manejo de alimentos, primeros auxilios, etc.',
    },
    {
      key: 'numero_personal',
      label: 'Numero de personal incluido',
      type: 'number',
      instruction: 'Cuantas personas incluye tu servicio base.',
    },
  ],
  FURNITURE: [
    {
      key: 'materiales',
      label: 'Material del mobiliario',
      type: 'multi_select',
      instruction: 'Selecciona los materiales de tus piezas.',
      options: ['Madera', 'Metal', 'Plastico', 'Acrilico', 'Tela', 'Otro'],
    },
    {
      key: 'colores_disponibles',
      label: 'Colores disponibles',
      type: 'text_long',
      instruction: 'Describe los colores o acabados disponibles.',
    },
    {
      key: 'incluye_transporte',
      label: 'Incluye transporte',
      type: 'switch',
      instruction: 'Indica si el precio incluye transporte al lugar del evento.',
    },
    {
      key: 'incluye_montaje',
      label: 'Incluye montaje y desmontaje',
      type: 'switch',
      instruction: 'Indica si tu servicio incluye la instalacion y retiro del mobiliario.',
    },
    {
      key: 'cantidad_disponible',
      label: 'Cantidad disponible',
      type: 'number',
      instruction: 'Cuantas piezas tienes disponibles de este tipo.',
      unit: 'piezas',
    },
  ],
};

/** Get all fields for a category (universal + category-specific) */
export function getFieldsForCategory(category: ServiceCategory): CategoryFieldConfig[] {
  return [...universalFields, ...(categoryFieldsMap[category] || [])];
}

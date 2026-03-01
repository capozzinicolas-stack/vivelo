import type { ServiceCategory } from '@/types/database';

export type FieldType = 'text_long' | 'text_short' | 'number' | 'currency' | 'multi_select' | 'dropdown' | 'switch' | 'switch_number' | 'matrix_select';

export interface CategoryFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  instruction: string;
  options?: string[];
  unit?: string;
  switchLabel?: string;
  numberLabel?: string;
  columns?: string[];
  columnLabel?: string;
  rows?: string[];
}

// Universal fields — apply to ALL categories
export const universalFields: CategoryFieldConfig[] = [];

// Category-specific fields
export const categoryFieldsMap: Record<ServiceCategory, CategoryFieldConfig[]> = {
  FOOD_DRINKS: [
    {
      key: 'servicio_base',
      label: '¿Qué incluye mi servicio base?',
      type: 'multi_select',
      instruction: 'Selecciona todo lo que incluye tu servicio.',
      options: [
        'Loza y Cubiertos',
        'Cristalería',
        'Meseros',
        'Cocinero',
        'Entrega (drop-off)',
        'Desechables',
        'Tablones',
      ],
    },
    {
      key: 'requerimientos_sitio',
      label: 'Requerimientos en sitio',
      type: 'multi_select',
      instruction: 'Selecciona lo que necesitas en el lugar del evento.',
      options: [
        'Necesito acceso a cocina equipada',
        'Necesito conexión eléctrica',
        'Necesito acceso a agua potable',
        'Llevo todo listo, no necesito nada (Autónomo)',
      ],
    },
    {
      key: 'espacio_minimo',
      label: 'Espacio mínimo requerido',
      type: 'number',
      instruction: 'El área mínima que necesitas para montar tu servicio.',
      unit: 'm²',
    },
    {
      key: 'not_included',
      label: 'Lo que NO incluye mi servicio',
      type: 'text_long',
      instruction: 'Lista lo que el cliente debe proveer o contratar por separado.',
    },
    {
      key: 'preparacion',
      label: '¿La comida se lleva preparada o se prepara en el lugar?',
      type: 'dropdown',
      instruction: 'Indica cómo se prepara la comida para el evento.',
      options: ['Se lleva preparada', 'Se prepara en el lugar'],
    },
    {
      key: 'menu',
      label: '¿Cuál es el menú o las opciones que ofreces?',
      type: 'text_long',
      instruction: 'Describe las opciones de menú o platillos disponibles.',
    },
    {
      key: 'limite_platillos',
      label: 'Límite de opciones de platillos',
      type: 'matrix_select',
      instruction: 'Indica cuántos platillos ofreces según el número de invitados.',
      columnLabel: 'Invitados',
      columns: ['0-20', '20-50', '50-100', '100-250', '250-350', '350-500', '500+'],
      rows: ['1 platillo', '2 platillos', '3 platillos', '4 platillos', '5 platillos', '6 platillos'],
    },
    {
      key: 'comentarios',
      label: 'Comentarios adicionales',
      type: 'text_long',
      instruction: 'Cualquier información adicional que quieras compartir con los clientes.',
    },
  ],
  AUDIO: [
    {
      key: 'equipo_estandar',
      label: 'Tu equipamiento y servicio estándar',
      type: 'multi_select',
      instruction: 'Selecciona todo lo que incluye tu servicio base.',
      options: [
        'Sistema de Audio (Bocinas)',
        'Microfonía',
        'Cabina de DJ / Setup Visual',
        'Iluminación de Pista',
        'Iluminación Decorativa',
        'Efectos Especiales',
        'Pantallas / Proyección',
        'Planta de Luz',
        'Accesorios de Animación',
      ],
    },
    {
      key: 'num_personas',
      label: 'Personas (músicos, animadores) incluidos',
      type: 'number',
      instruction: 'Cuántas personas incluye tu servicio.',
    },
    {
      key: 'requerimientos_sitio',
      label: 'Requerimientos en sitio',
      type: 'multi_select',
      instruction: 'Selecciona lo que necesitas en el lugar del evento.',
      options: [
        'Enchufe doméstico normal (110v)',
        'Corriente bifásica/trifásica (Requiere instalación especial)',
        'Planta de luz propia (Soy autónomo en energía)',
      ],
    },
    {
      key: 'descansos',
      label: '¿Qué pasa durante los descansos?',
      type: 'dropdown',
      instruction: 'Indica qué sucede cuando el acto principal toma un descanso.',
      options: [
        'Ponemos música grabada (Playlist DJ automático)',
        'Silencio / El cliente debe poner su música',
      ],
    },
    {
      key: 'espacio_minimo',
      label: 'Espacio mínimo requerido',
      type: 'number',
      instruction: 'El área mínima que necesitas para tu presentación.',
      unit: 'm²',
    },
    {
      key: 'comentarios',
      label: 'Comentarios adicionales',
      type: 'text_long',
      instruction: 'Cualquier información adicional que quieras compartir con los clientes.',
    },
  ],
  DECORATION: [
    {
      key: 'material_principal',
      label: 'Material Principal',
      type: 'multi_select',
      instruction: 'Selecciona los tipos de materiales que utilizas en tu servicio.',
      options: [
        'Natural: Flores, follaje y elementos orgánicos vivos',
        'Preservado / Seco: Elementos naturales tratados que no requieren agua',
        'Artificial / Seda: Flores de tela o materiales sintéticos de alta calidad',
        'Globo / Inflables: Diseños basados en globos de látex o metálicos',
        'Estructuras Rígidas: Madera, metal, acrílico o neón (sin flores)',
      ],
    },
    {
      key: 'logistica_entrega',
      label: 'Logística de Entrega',
      type: 'dropdown',
      instruction: 'Indica si el cliente se queda con el material o lo retiras.',
      options: [
        'Venta (Propiedad del cliente): El cliente se queda con todo al finalizar',
        'Renta (Retorno al proveedor): El proveedor retira las estructuras/bases al terminar',
        'Mixto: El cliente se queda con lo orgánico y el proveedor retira las bases/luces',
      ],
    },
    {
      key: 'requerimientos_instalacion',
      label: 'Requerimientos de Instalación',
      type: 'multi_select',
      instruction: 'Selecciona lo que necesitas en el lugar del evento para tu montaje.',
      options: [
        'Punto Eléctrico: Requiere conexión a luz (110v) a menos de 5 metros',
        'Anclaje a Techo/Pared: Necesita clavos, ganchos o colgarse de la estructura del lugar',
        'Superficie Plana: No puede montarse en pasto irregular o tierra',
        'Protección del Clima: Solo para interiores o áreas techadas (no resiste sol/lluvia)',
        'Elevador / Montacargas: Si el equipo es pesado y el evento no es en planta baja',
      ],
    },
    {
      key: 'not_included',
      label: 'Lo que NO incluye mi servicio',
      type: 'text_long',
      instruction: 'Describe lo que el cliente debe proveer o contratar por separado.',
    },
  ],
  PHOTO_VIDEO: [
    {
      key: 'fotos_editadas',
      label: 'Fotos editadas garantizadas',
      type: 'number',
      instruction: 'Cantidad mínima de fotos editadas que entregas.',
    },
    {
      key: 'formato_video',
      label: 'Formato de Video',
      type: 'text_short',
      instruction: 'Ej: 4K, Full HD, Cinematográfico, etc.',
    },
    {
      key: 'entrega_raw',
      label: '¿Entregas archivos originales (RAW/Sin editar)?',
      type: 'switch',
      instruction: 'Indica si entregas los archivos sin editar además del material final.',
    },
    {
      key: 'entregables',
      label: 'Formato de Entrega Final',
      type: 'multi_select',
      instruction: 'Selecciona los formatos en que entregas el material.',
      options: ['Fotos editadas', 'Video editado', 'Galeria digital', 'Impresiones', 'Album', 'USB'],
    },
    {
      key: 'tiempo_entrega',
      label: 'Tiempos de Entrega',
      type: 'number',
      instruction: 'Días para entregar el material final.',
      unit: 'días',
    },
    {
      key: 'num_fotografos',
      label: 'Numero de fotografos/camarografos',
      type: 'number',
      instruction: 'Cuántos profesionales asisten al evento.',
    },
    {
      key: 'equipo_tecnico',
      label: 'Equipo técnico principal',
      type: 'text_short',
      instruction: 'Describe tu equipo. Ej: Canon R5, DJI Mavic, etc.',
    },
    {
      key: 'sesion_previa',
      label: 'Incluye sesion previa',
      type: 'switch',
      instruction: 'Indica si incluyes una sesión de fotos/video antes del evento.',
    },
    {
      key: 'necesidades_adicionales',
      label: 'Necesidades adicionales',
      type: 'text_short',
      instruction: 'Cualquier requerimiento especial que necesites en el lugar del evento.',
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

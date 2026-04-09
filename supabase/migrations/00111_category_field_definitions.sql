-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Category field definitions: dynamic fields configurable from admin panel
CREATE TABLE category_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL REFERENCES service_categories(slug) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'text_long','text_short','number','currency',
    'multi_select','dropdown','switch','switch_number','matrix_select'
  )),
  instruction TEXT NOT NULL DEFAULT '',
  options TEXT[] DEFAULT '{}',
  unit TEXT,
  switch_label TEXT,
  number_label TEXT,
  columns TEXT[] DEFAULT '{}',
  column_label TEXT,
  rows TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_slug, key)
);

-- RLS
ALTER TABLE category_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON category_field_definitions FOR SELECT USING (true);
CREATE POLICY "admin_manage" ON category_field_definitions FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON category_field_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed existing hardcoded fields

-- FOOD_DRINKS
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, unit, sort_order) VALUES
('FOOD_DRINKS', 'servicio_base', '¿Qué incluye mi servicio base?', 'multi_select', 'Selecciona todo lo que incluye tu servicio.', ARRAY['Loza y Cubiertos','Cristalería','Meseros','Cocinero','Entrega (drop-off)','Desechables','Tablones'], NULL, 1),
('FOOD_DRINKS', 'requerimientos_sitio', 'Requerimientos en sitio', 'multi_select', 'Selecciona lo que necesitas en el lugar del evento.', ARRAY['Necesito acceso a cocina equipada','Necesito conexión eléctrica','Necesito acceso a agua potable','Llevo todo listo, no necesito nada (Autónomo)'], NULL, 2),
('FOOD_DRINKS', 'espacio_minimo', 'Espacio mínimo requerido', 'number', 'El área mínima que necesitas para montar tu servicio.', '{}', 'm²', 3),
('FOOD_DRINKS', 'not_included', 'Lo que NO incluye mi servicio', 'text_long', 'Lista lo que el cliente debe proveer o contratar por separado.', '{}', NULL, 4),
('FOOD_DRINKS', 'preparacion', '¿La comida se lleva preparada o se prepara en el lugar?', 'dropdown', 'Indica cómo se prepara la comida para el evento.', ARRAY['Se lleva preparada','Se prepara en el lugar'], NULL, 5),
('FOOD_DRINKS', 'menu', '¿Cuál es el menú o las opciones que ofreces?', 'text_long', 'Describe las opciones de menú o platillos disponibles.', '{}', NULL, 6);

INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, columns, column_label, rows, sort_order) VALUES
('FOOD_DRINKS', 'limite_platillos', 'Límite de opciones de platillos', 'matrix_select', 'Indica cuántos platillos ofreces según el número de invitados.', ARRAY['0-20','20-50','50-100','100-250','250-350','350-500','500+'], 'Invitados', ARRAY['1 platillo','2 platillos','3 platillos','4 platillos','5 platillos','6 platillos'], 7);

INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, sort_order) VALUES
('FOOD_DRINKS', 'comentarios', 'Comentarios adicionales', 'text_long', 'Cualquier información adicional que quieras compartir con los clientes.', 8);

-- AUDIO
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, unit, sort_order) VALUES
('AUDIO', 'equipo_estandar', 'Tu equipamiento y servicio estándar', 'multi_select', 'Selecciona todo lo que incluye tu servicio base.', ARRAY['Sistema de Audio (Bocinas)','Microfonía','Cabina de DJ / Setup Visual','Iluminación de Pista','Iluminación Decorativa','Efectos Especiales','Pantallas / Proyección','Planta de Luz','Accesorios de Animación'], NULL, 1),
('AUDIO', 'num_personas', 'Personas (músicos, animadores) incluidos', 'number', 'Cuántas personas incluye tu servicio.', '{}', NULL, 2),
('AUDIO', 'requerimientos_sitio', 'Requerimientos en sitio', 'multi_select', 'Selecciona lo que necesitas en el lugar del evento.', ARRAY['Enchufe doméstico normal (110v)','Corriente bifásica/trifásica (Requiere instalación especial)','Planta de luz propia (Soy autónomo en energía)'], NULL, 3),
('AUDIO', 'descansos', '¿Qué pasa durante los descansos?', 'dropdown', 'Indica qué sucede cuando el acto principal toma un descanso.', ARRAY['Ponemos música grabada (Playlist DJ automático)','Silencio / El cliente debe poner su música'], NULL, 4),
('AUDIO', 'espacio_minimo', 'Espacio mínimo requerido', 'number', 'El área mínima que necesitas para tu presentación.', '{}', 'm²', 5),
('AUDIO', 'comentarios', 'Comentarios adicionales', 'text_long', 'Cualquier información adicional que quieras compartir con los clientes.', '{}', NULL, 6);

-- DECORATION
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, sort_order) VALUES
('DECORATION', 'material_principal', 'Material Principal', 'multi_select', 'Selecciona los tipos de materiales que utilizas en tu servicio.', ARRAY['Natural: Flores, follaje y elementos orgánicos vivos','Preservado / Seco: Elementos naturales tratados que no requieren agua','Artificial / Seda: Flores de tela o materiales sintéticos de alta calidad','Globo / Inflables: Diseños basados en globos de látex o metálicos','Estructuras Rígidas: Madera, metal, acrílico o neón (sin flores)'], 1),
('DECORATION', 'logistica_entrega', 'Logística de Entrega', 'dropdown', 'Indica si el cliente se queda con el material o lo retiras.', ARRAY['Venta (Propiedad del cliente): El cliente se queda con todo al finalizar','Renta (Retorno al proveedor): El proveedor retira las estructuras/bases al terminar','Mixto: El cliente se queda con lo orgánico y el proveedor retira las bases/luces'], 2),
('DECORATION', 'requerimientos_instalacion', 'Requerimientos de Instalación', 'multi_select', 'Selecciona lo que necesitas en el lugar del evento para tu montaje.', ARRAY['Punto Eléctrico: Requiere conexión a luz (110v) a menos de 5 metros','Anclaje a Techo/Pared: Necesita clavos, ganchos o colgarse de la estructura del lugar','Superficie Plana: No puede montarse en pasto irregular o tierra','Protección del Clima: Solo para interiores o áreas techadas (no resiste sol/lluvia)','Elevador / Montacargas: Si el equipo es pesado y el evento no es en planta baja'], 3),
('DECORATION', 'not_included', 'Lo que NO incluye mi servicio', 'text_long', 'Describe lo que el cliente debe proveer o contratar por separado.', '{}', 4);

-- PHOTO_VIDEO
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, unit, sort_order) VALUES
('PHOTO_VIDEO', 'fotos_editadas', 'Fotos editadas garantizadas', 'number', 'Cantidad mínima de fotos editadas que entregas.', '{}', NULL, 1),
('PHOTO_VIDEO', 'formato_video', 'Formato de Video', 'text_short', 'Ej: 4K, Full HD, Cinematográfico, etc.', '{}', NULL, 2),
('PHOTO_VIDEO', 'entrega_raw', '¿Entregas archivos originales (RAW/Sin editar)?', 'switch', 'Indica si entregas los archivos sin editar además del material final.', '{}', NULL, 3),
('PHOTO_VIDEO', 'entregables', 'Formato de Entrega Final', 'multi_select', 'Selecciona los formatos en que entregas el material.', ARRAY['Fotos editadas','Video editado','Galeria digital','Impresiones','Album','USB'], NULL, 4),
('PHOTO_VIDEO', 'tiempo_entrega', 'Tiempos de Entrega', 'number', 'Días para entregar el material final.', '{}', 'días', 5),
('PHOTO_VIDEO', 'num_fotografos', 'Numero de fotografos/camarografos', 'number', 'Cuántos profesionales asisten al evento.', '{}', NULL, 6),
('PHOTO_VIDEO', 'equipo_tecnico', 'Equipo técnico principal', 'text_short', 'Describe tu equipo. Ej: Canon R5, DJI Mavic, etc.', '{}', NULL, 7),
('PHOTO_VIDEO', 'sesion_previa', 'Incluye sesion previa', 'switch', 'Indica si incluyes una sesión de fotos/video antes del evento.', '{}', NULL, 8),
('PHOTO_VIDEO', 'necesidades_adicionales', 'Necesidades adicionales', 'text_short', 'Cualquier requerimiento especial que necesites en el lugar del evento.', '{}', NULL, 9);

-- STAFF
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, sort_order) VALUES
('STAFF', 'perfil_presentacion', 'Perfil y Presentación', 'dropdown', 'Selecciona el perfil de presentación de tu personal.', ARRAY['Ejecutivo / Formal: Alta etiqueta, ideal para bodas o corporativos','Casual / Moderno: Estilo relajado (ej. jeans y playera de marca)','Temático: Caracterizado según el concepto del evento','Bilingüe: Personal que domina inglés/español','Certificado: Con conocimientos técnicos (ej. curso de protección civil o mixología)'], 1),
('STAFF', 'uniforme_incluido', 'Uniforme incluido', 'multi_select', 'Selecciona el tipo de uniforme que incluye tu servicio.', ARRAY['Formal Completo: Camisa, chaleco/saco, corbata y pantalón de vestir','Básico: Camisa blanca/negra y pantalón oscuro (sin saco)','Branding Vívelo! / Proveedor: Playera o polo con logo de la empresa','A definir por el cliente: El staff usa lo que el cliente pida (dentro de lo razonable)'], 2),
('STAFF', 'que_incluye', '¿Qué incluye el servicio?', 'multi_select', 'Selecciona lo que incluye tu servicio de staff.', ARRAY['Montaje Previo: Ayuda a preparar el área antes de que lleguen invitados','Atención Continua: Servicio activo durante toda la duración contratada','Limpieza de Estación: Mantener su área de trabajo impecable','Desmontaje Final: Apoyo en la recogida de equipo al terminar','Coordinación: Un jefe de grupo que supervisa al resto del staff'], 3),
('STAFF', 'not_included', 'Lo que NO incluye mi servicio', 'text_long', 'Describe lo que el cliente debe proveer o contratar por separado.', '{}', 4),
('STAFF', 'personal_incluidos', 'Personal incluidos', 'number', 'Personal que participa en el servicio base.', '{}', 5);

-- BEAUTY
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, unit, sort_order) VALUES
('BEAUTY', 'tipo_servicio', 'Tipo de servicio', 'multi_select', 'Selecciona los tipos de servicio que ofreces.', ARRAY['Novia / Quinceañera (look completo)','Social / Fiesta','Corporativo / Editorial','Infantil','Caracterización / FX','Novio / Caballero','Grupal (misma sesión, varias personas)'], NULL, 1),
('BEAUTY', 'productos_marcas', 'Productos y marcas que utilizas', 'multi_select', 'Selecciona el tipo de productos que usas.', ARRAY['Alta gama (MAC, NARS, Charlotte Tilbury, Estée Lauder)','Profesional (Kryolan, Ben Nye, RCMA)','Orgánico / Cruelty-free','Hipoalergénico / Piel sensible','Otro'], NULL, 2),
('BEAUTY', 'incluye_prueba', 'Incluye prueba previa', 'switch', 'Indica si tu servicio incluye una prueba antes del evento.', '{}', NULL, 3),
('BEAUTY', 'tiempo_por_persona', 'Tiempo estimado por persona', 'number', 'Cuántos minutos tarda tu servicio por persona.', '{}', 'min', 4),
('BEAUTY', 'que_incluye', '¿Qué incluye tu servicio?', 'multi_select', 'Selecciona lo que incluye tu servicio de belleza.', ARRAY['Kit completo de productos','Retoque durante el evento','Preparación de piel (skincare previo)','Pestañas postizas','Accesorios para el cabello','Traslado al domicilio/venue incluido','Asesoría de imagen / colorimetría'], NULL, 5),
('BEAUTY', 'requerimientos_sitio', 'Requerimientos en sitio', 'multi_select', 'Selecciona lo que necesitas en el lugar del evento.', ARRAY['Espacio con buena iluminación natural o lámparas','Silla alta o sillón reclinable','Espejo de cuerpo completo','Conexión eléctrica (secadora, plancha, vaporizador)','Mesa o superficie de trabajo','Acceso a agua potable','Soy autónomo, llevo todo lo necesario'], NULL, 6),
('BEAUTY', 'not_included', 'Lo que NO incluye mi servicio', 'text_long', 'Describe lo que el cliente debe proveer o contratar por separado.', '{}', NULL, 7);

-- FURNITURE
INSERT INTO category_field_definitions (category_slug, key, label, type, instruction, options, unit, sort_order) VALUES
('FURNITURE', 'material_predominante', 'Material Predominante', 'dropdown', 'Selecciona el material principal de tu mobiliario.', ARRAY['Madera / Rústico: Parota, pino, acabado natural','Metálico / Industrial: Acero, hierro, aluminio','Plástico / Resina: Polipropileno (ej. Silla Avant Garde o Tiffany resina)','Textil / Tapizado: Terciopelo, lino, capitonado','Cristal / Acrílico: Transparencias y espejos'], NULL, 1),
('FURNITURE', 'uso_recomendado', 'Uso Recomendado', 'multi_select', 'Selecciona las condiciones en las que puede usarse tu mobiliario.', ARRAY['Todo Terreno: Apto para jardín, playa o interior (resiste sol/humedad)','Solo Interior / Techado: Material delicado que se daña con sol directo o lluvia','Superficie Firme: Requiere piso plano (no apto para pasto o arena)'], NULL, 2),
('FURNITURE', 'logistica_montaje', 'Logística de Montaje', 'multi_select', 'Selecciona cómo se entrega y monta tu mobiliario.', ARRAY['Full Setup: Descarga y acomodo total según el plano del cliente','Pie de Camión: Solo se descarga en la entrada; el cliente lo acomoda','Instalación Técnica: Requiere armado especializado (ej. Carpas o Pistas)'], NULL, 3),
('FURNITURE', 'not_included', 'Lo que NO incluye mi servicio', 'text_long', 'Describe lo que el cliente debe proveer o contratar por separado.', '{}', NULL, 4),
('FURNITURE', 'espacio_minimo', 'Espacio mínimo requerido', 'number', 'El área mínima que necesitas para montar tu mobiliario.', '{}', 'm²', 5);

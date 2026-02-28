-- ============================================================
-- 00028_dynamic_catalog.sql
-- Catalogo dinamico: categorias, subcategorias y zonas en DB
-- Idempotent: safe to re-run
-- ============================================================

-- 1. Crear tablas de catalogo
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_categories (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-600',
  sku_prefix CHAR(2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_subcategories (
  slug TEXT PRIMARY KEY,
  category_slug TEXT NOT NULL REFERENCES service_categories(slug),
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_zones (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed data: categorias
-- ─────────────────────────────────────────────────────────────

INSERT INTO service_categories (slug, label, description, icon, color, sku_prefix, sort_order) VALUES
  ('FOOD_DRINKS',  'Alimentos y Bebidas',       'Catering, barras de bebidas, food trucks y mas',      'UtensilsCrossed', 'bg-orange-100 text-orange-600', 'FD', 1),
  ('AUDIO',        'Audio y Entretenimiento',    'DJs, sistemas de sonido, bandas y entretenimiento',   'Music',           'bg-blue-100 text-blue-600',     'AU', 2),
  ('DECORATION',   'Decoracion y Ambientacion',  'Decoracion floral, iluminacion y ambientacion',       'Flower2',         'bg-pink-100 text-pink-600',     'DE', 3),
  ('PHOTO_VIDEO',  'Foto y Video',               'Fotografia, videografia, photobooths y drones',       'Camera',          'bg-purple-100 text-purple-600', 'PV', 4),
  ('STAFF',        'Staff y Operacion',           'Meseros, coordinadores, bartenders y mas',            'Users',           'bg-green-100 text-green-600',   'ST', 5),
  ('FURNITURE',    'Mobiliario y Equipo',          'Mesas, sillas, tarimas y carpas',                    'Armchair',        'bg-amber-100 text-amber-600',   'FU', 6)
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed data: subcategorias
-- ─────────────────────────────────────────────────────────────

INSERT INTO service_subcategories (slug, category_slug, label, sort_order) VALUES
  -- Alimentos y Bebidas
  ('TAQUIZA',                  'FOOD_DRINKS', 'Taquiza',                           1),
  ('CATERING_POR_TIEMPOS',     'FOOD_DRINKS', 'Catering por tiempos',              2),
  ('ESTACIONES_FOODTRUCKS',    'FOOD_DRINKS', 'Estaciones o FoodTrucks',           3),
  ('REPOSTERIA',               'FOOD_DRINKS', 'Reposteria',                        4),
  ('MESAS_DE_DULCES',          'FOOD_DRINKS', 'Mesas de dulces',                   5),
  ('COFFEE_BREAK',             'FOOD_DRINKS', 'Coffee Break',                      6),
  ('BARRA_COCTELERIA',         'FOOD_DRINKS', 'Barra de bebidas o Cocteleria',     7),
  -- Audio y Entretenimiento
  ('MARIACHI',                 'AUDIO',       'Mariachi',                          1),
  ('GRUPO_EN_VIVO',            'AUDIO',       'Grupo en vivo',                     2),
  ('DJ',                       'AUDIO',       'DJ',                                3),
  ('BANDA',                    'AUDIO',       'Banda',                             4),
  ('DUETO_TRIO',               'AUDIO',       'Dueto o Trio',                      5),
  ('SAXOFON_VIOLIN',           'AUDIO',       'Saxofon o Violin',                  6),
  ('KARAOKE',                  'AUDIO',       'Karaoke',                           7),
  ('ANIMADOR_MC',              'AUDIO',       'Animador o MC',                     8),
  ('IMITADOR',                 'AUDIO',       'Imitador',                          9),
  ('COMEDIANTE',               'AUDIO',       'Comediante',                       10),
  -- Decoracion y Ambientacion
  ('FLORAL',                   'DECORATION',  'Floral',                            1),
  ('GLOBOS_BACKDROPS',         'DECORATION',  'Globos y Backdrops',                2),
  ('CENTROS_DE_MESA',          'DECORATION',  'Centros de mesa',                   3),
  ('ESCENOGRAFIA_TEMATIZACION','DECORATION',  'Escenografia y Tematizacion',       4),
  ('ILUMINACION_AMBIENTAL',    'DECORATION',  'Iluminacion ambiental',             5),
  -- Foto y Video
  ('FOTOGRAFIA',               'PHOTO_VIDEO', 'Fotografia',                        1),
  ('VIDEO',                    'PHOTO_VIDEO', 'Video',                             2),
  ('DRON',                     'PHOTO_VIDEO', 'Dron',                              3),
  ('CABINA_360',               'PHOTO_VIDEO', 'Cabina 360',                        4),
  ('PHOTOBOOTH_IMPRESIONES',   'PHOTO_VIDEO', 'Photobooth e Impresiones',          5),
  ('SESION_PRIVADA',           'PHOTO_VIDEO', 'Sesion privada',                    6),
  -- Staff y Operacion
  ('MESEROS',                  'STAFF',       'Meseros',                           1),
  ('BARTENDER',                'STAFF',       'Bartender',                         2),
  ('CHEF_EN_SITIO',            'STAFF',       'Chef en sitio',                     3),
  ('PARRILLERO',               'STAFF',       'Parrillero',                        4),
  ('COORDINADOR_PLANNER',      'STAFF',       'Coordinador o Planner',             5),
  ('HOSTESS',                  'STAFF',       'Hostess',                           6),
  ('LIMPIEZA',                 'STAFF',       'Limpieza',                          7),
  ('SEGURIDAD',                'STAFF',       'Seguridad',                         8),
  ('VALET_PARKING',            'STAFF',       'Valet parking',                     9),
  ('NINERA',                   'STAFF',       'Ninera',                           10),
  -- Mobiliario y Equipo
  ('SILLAS_MESAS',             'FURNITURE',   'Sillas y Mesas',                    1),
  ('LOUNGE',                   'FURNITURE',   'Lounge',                            2),
  ('MANTELERIA',               'FURNITURE',   'Manteleria',                        3),
  ('CARPAS',                   'FURNITURE',   'Carpas',                            4),
  ('TARIMAS_ESCENARIOS',       'FURNITURE',   'Tarimas y Escenarios',              5),
  ('PISTA_DE_BAILE',           'FURNITURE',   'Pista de baile',                    6),
  ('ILUMINACION_EQUIPO',       'FURNITURE',   'Iluminacion (equipo)',              7),
  ('PROYECTOR_PANTALLAS_LED',  'FURNITURE',   'Proyector y Pantallas LED',         8),
  ('PLANTA_DE_LUZ',            'FURNITURE',   'Planta de luz',                     9),
  ('CLIMA',                    'FURNITURE',   'Clima',                            10)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed data: zonas
-- ─────────────────────────────────────────────────────────────

INSERT INTO service_zones (slug, label, sort_order) VALUES
  ('ciudad-de-mexico',  'Ciudad de México',  1),
  ('estado-de-mexico',  'Estado de México',  2),
  ('puebla',            'Puebla',            3),
  ('toluca',            'Toluca',            4),
  ('cuernavaca',        'Cuernavaca',        5),
  ('queretaro',         'Querétaro',         6),
  ('pachuca',           'Pachuca',           7)
ON CONFLICT (slug) DO NOTHING;

-- 5. Migrar services.category de ENUM a TEXT
-- ─────────────────────────────────────────────────────────────

-- Solo alterar si todavia es ENUM (chequeo idempotente)
DO $$
BEGIN
  -- Check if column is still enum type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'category'
      AND udt_name = 'service_category'
  ) THEN
    ALTER TABLE services ALTER COLUMN category TYPE TEXT;
  END IF;
END $$;

DROP TYPE IF EXISTS service_category;

-- Agregar FK de category a service_categories (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_services_category' AND table_name = 'services'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT fk_services_category
      FOREIGN KEY (category) REFERENCES service_categories(slug);
  END IF;
END $$;

-- Agregar FK de subcategory a service_subcategories (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_services_subcategory' AND table_name = 'services'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT fk_services_subcategory
      FOREIGN KEY (subcategory) REFERENCES service_subcategories(slug);
  END IF;
END $$;

-- 6. Triggers updated_at (IF NOT EXISTS via DO block)
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'service_categories_updated_at') THEN
    CREATE TRIGGER service_categories_updated_at
      BEFORE UPDATE ON service_categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'service_subcategories_updated_at') THEN
    CREATE TRIGGER service_subcategories_updated_at
      BEFORE UPDATE ON service_subcategories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'service_zones_updated_at') THEN
    CREATE TRIGGER service_zones_updated_at
      BEFORE UPDATE ON service_zones
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- 7. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to make idempotent, then recreate
DO $$
BEGIN
  -- Categories
  DROP POLICY IF EXISTS "Anyone can read categories" ON service_categories;
  DROP POLICY IF EXISTS "Admins can insert categories" ON service_categories;
  DROP POLICY IF EXISTS "Admins can update categories" ON service_categories;
  DROP POLICY IF EXISTS "Admins can delete categories" ON service_categories;

  -- Subcategories
  DROP POLICY IF EXISTS "Anyone can read subcategories" ON service_subcategories;
  DROP POLICY IF EXISTS "Admins can insert subcategories" ON service_subcategories;
  DROP POLICY IF EXISTS "Admins can update subcategories" ON service_subcategories;
  DROP POLICY IF EXISTS "Admins can delete subcategories" ON service_subcategories;

  -- Zones
  DROP POLICY IF EXISTS "Anyone can read zones" ON service_zones;
  DROP POLICY IF EXISTS "Admins can insert zones" ON service_zones;
  DROP POLICY IF EXISTS "Admins can update zones" ON service_zones;
  DROP POLICY IF EXISTS "Admins can delete zones" ON service_zones;
END $$;

-- SELECT: todos pueden leer
CREATE POLICY "Anyone can read categories"
  ON service_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read subcategories"
  ON service_subcategories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read zones"
  ON service_zones FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: solo admins
CREATE POLICY "Admins can insert categories"
  ON service_categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update categories"
  ON service_categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete categories"
  ON service_categories FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert subcategories"
  ON service_subcategories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update subcategories"
  ON service_subcategories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete subcategories"
  ON service_subcategories FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert zones"
  ON service_zones FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update zones"
  ON service_zones FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete zones"
  ON service_zones FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

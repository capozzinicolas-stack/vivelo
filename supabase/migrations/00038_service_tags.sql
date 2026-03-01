-- ============================================================
-- 00038_service_tags.sql
-- Sistema de etiquetas (tags) para servicios
-- Idempotent: safe to re-run
-- ============================================================

-- 1. Tabla de etiquetas
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_tags (
  slug TEXT PRIMARY KEY,
  category_slug TEXT NOT NULL REFERENCES service_categories(slug) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_tags_category ON service_tags(category_slug);

-- 2. Tabla junction: asignaciones de tags a servicios
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_tag_assignments (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL REFERENCES service_tags(slug) ON DELETE CASCADE,
  PRIMARY KEY (service_id, tag_slug)
);

CREATE INDEX IF NOT EXISTS idx_sta_service ON service_tag_assignments(service_id);
CREATE INDEX IF NOT EXISTS idx_sta_tag ON service_tag_assignments(tag_slug);

-- 3. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE service_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first for idempotency
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can read tags" ON service_tags;
  DROP POLICY IF EXISTS "Admins can insert tags" ON service_tags;
  DROP POLICY IF EXISTS "Admins can update tags" ON service_tags;
  DROP POLICY IF EXISTS "Admins can delete tags" ON service_tags;

  DROP POLICY IF EXISTS "Anyone can read tag assignments" ON service_tag_assignments;
  DROP POLICY IF EXISTS "Providers can manage own tag assignments" ON service_tag_assignments;
  DROP POLICY IF EXISTS "Admins can manage tag assignments" ON service_tag_assignments;
END $$;

-- service_tags: lectura publica, escritura solo admin
CREATE POLICY "Anyone can read tags"
  ON service_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tags"
  ON service_tags FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update tags"
  ON service_tags FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete tags"
  ON service_tags FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- service_tag_assignments: lectura publica, escritura por proveedor dueno + admin
CREATE POLICY "Anyone can read tag assignments"
  ON service_tag_assignments FOR SELECT
  USING (true);

CREATE POLICY "Providers can manage own tag assignments"
  ON service_tag_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = service_tag_assignments.service_id
        AND services.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = service_tag_assignments.service_id
        AND services.provider_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tag assignments"
  ON service_tag_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Seed data: 56 tags del CSV
-- ─────────────────────────────────────────────────────────────

INSERT INTO service_tags (slug, category_slug, label, sort_order) VALUES
  -- Alimentos y Bebidas (FOOD_DRINKS)
  ('mexicana',                'FOOD_DRINKS', 'Mexicana',                1),
  ('internacional',           'FOOD_DRINKS', 'Internacional',           2),
  ('asiatica',                'FOOD_DRINKS', 'Asiatica',                3),
  ('italiana',                'FOOD_DRINKS', 'Italiana',                4),
  ('mariscos',                'FOOD_DRINKS', 'Mariscos',                5),
  ('vegetariana-vegana',      'FOOD_DRINKS', 'Vegetariana/Vegana',      6),
  ('postres',                 'FOOD_DRINKS', 'Postres',                 7),
  ('snacks-botanas',          'FOOD_DRINKS', 'Snacks/Botanas',          8),
  ('barra-libre',             'FOOD_DRINKS', 'Barra Libre',             9),
  ('cocteleria-autor',        'FOOD_DRINKS', 'Cocteleria de Autor',    10),
  ('cerveza-artesanal',       'FOOD_DRINKS', 'Cerveza Artesanal',      11),
  ('cafe-te',                 'FOOD_DRINKS', 'Cafe y Te',              12),

  -- Audio y Entretenimiento (AUDIO)
  ('dj-profesional',          'AUDIO', 'DJ Profesional',          1),
  ('musica-en-vivo',          'AUDIO', 'Musica en Vivo',          2),
  ('karaoke',                 'AUDIO', 'Karaoke',                 3),
  ('sonido-iluminacion',      'AUDIO', 'Sonido e Iluminacion',    4),
  ('show-interactivo',        'AUDIO', 'Show Interactivo',        5),
  ('infantil',                'AUDIO', 'Infantil',                6),
  ('magia',                   'AUDIO', 'Magia',                   7),
  ('performance',             'AUDIO', 'Performance',             8),
  ('comedia',                 'AUDIO', 'Comedia',                 9),
  ('maestro-ceremonias',      'AUDIO', 'Maestro de Ceremonias',  10),

  -- Decoracion y Ambientacion (DECORATION)
  ('flores-naturales',        'DECORATION', 'Flores Naturales',        1),
  ('flores-artificiales',     'DECORATION', 'Flores Artificiales',     2),
  ('globos',                  'DECORATION', 'Globos',                  3),
  ('iluminacion-decorativa',  'DECORATION', 'Iluminacion Decorativa',  4),
  ('tematica',                'DECORATION', 'Tematica',                5),
  ('minimalista',             'DECORATION', 'Minimalista',             6),
  ('rustica',                 'DECORATION', 'Rustica',                 7),
  ('elegante',                'DECORATION', 'Elegante',                8),
  ('bohemia',                 'DECORATION', 'Bohemia',                 9),
  ('industrial',              'DECORATION', 'Industrial',             10),

  -- Foto y Video (PHOTO_VIDEO)
  ('fotografia-evento',       'PHOTO_VIDEO', 'Fotografia de Evento',     1),
  ('video-cinematografico',   'PHOTO_VIDEO', 'Video Cinematografico',    2),
  ('photobooth',              'PHOTO_VIDEO', 'Photobooth',               3),
  ('dron',                    'PHOTO_VIDEO', 'Dron',                     4),
  ('cabina-360',              'PHOTO_VIDEO', 'Cabina 360',               5),
  ('streaming',               'PHOTO_VIDEO', 'Streaming',                6),
  ('sesion-pre-evento',       'PHOTO_VIDEO', 'Sesion Pre-Evento',        7),
  ('album-impreso',           'PHOTO_VIDEO', 'Album Impreso',            8),

  -- Staff y Operacion (STAFF)
  ('meseros',                 'STAFF', 'Meseros',                  1),
  ('bartenders',              'STAFF', 'Bartenders',               2),
  ('chef-en-sitio',           'STAFF', 'Chef en Sitio',            3),
  ('coordinador',             'STAFF', 'Coordinador',              4),
  ('hostess',                 'STAFF', 'Hostess',                  5),
  ('seguridad',               'STAFF', 'Seguridad',                6),
  ('valet-parking',           'STAFF', 'Valet Parking',            7),
  ('ninera',                  'STAFF', 'Ninera',                   8),
  ('limpieza',                'STAFF', 'Limpieza',                 9),

  -- Mobiliario y Equipo (FURNITURE)
  ('mesas-sillas',            'FURNITURE', 'Mesas y Sillas',          1),
  ('lounge',                  'FURNITURE', 'Lounge',                  2),
  ('carpas',                  'FURNITURE', 'Carpas',                  3),
  ('tarimas',                 'FURNITURE', 'Tarimas',                 4),
  ('pista-de-baile',          'FURNITURE', 'Pista de Baile',          5),
  ('pantallas-led',           'FURNITURE', 'Pantallas LED',           6),
  ('planta-de-luz',           'FURNITURE', 'Planta de Luz',           7),
  ('clima',                   'FURNITURE', 'Clima',                   8)
ON CONFLICT (slug) DO NOTHING;

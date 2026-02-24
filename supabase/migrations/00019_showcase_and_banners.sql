-- ============================================================
-- Migration 00019: Showcase Items & Site Banners
-- Editable subcategory showcase cards and homepage banners
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── SHOWCASE ITEMS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS showcase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subcategory TEXT NOT NULL,
  parent_category TEXT NOT NULL,
  gradient_color TEXT NOT NULL DEFAULT 'from-purple-500 to-pink-500',
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_showcase_items_position ON showcase_items(position);
CREATE INDEX IF NOT EXISTS idx_showcase_items_active ON showcase_items(is_active);

-- ─── SITE BANNERS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  gradient TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_banners_key ON site_banners(banner_key);
CREATE INDEX IF NOT EXISTS idx_site_banners_active ON site_banners(is_active);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE showcase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_banners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage showcase_items' AND tablename = 'showcase_items') THEN
    CREATE POLICY "Admins manage showcase_items" ON showcase_items FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active showcase_items' AND tablename = 'showcase_items') THEN
    CREATE POLICY "Public read active showcase_items" ON showcase_items FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage site_banners' AND tablename = 'site_banners') THEN
    CREATE POLICY "Admins manage site_banners" ON site_banners FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active site_banners' AND tablename = 'site_banners') THEN
    CREATE POLICY "Public read active site_banners" ON site_banners FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- ─── SEED DEFAULT DATA ──────────────────────────────────────

INSERT INTO showcase_items (label, description, subcategory, parent_category, gradient_color, position, is_active)
VALUES
  ('Animadores', 'El espiritu de tu evento quien determina eres tu! Conozca la amplia variedad de animadores de Vivelo y dale vida a tu evento con tu toque especial.', 'ANIMADOR_MC', 'AUDIO', 'from-purple-500 to-pink-500', 0, true),
  ('Mariachis', 'La alma de tu evento no puede dejar de existir! Los mariachis mas clasicos de Mexico pueden estar presentes en tu evento para que tu lo vivas sin igual.', 'MARIACHI', 'AUDIO', 'from-amber-500 to-orange-500', 1, true),
  ('Planners', 'No deje que ningun detalle de tu evento sea olvidado, solo Vivelo. Nuestra seleccion especial de planners para que tu disfrute cada momento.', 'COORDINADOR_PLANNER', 'STAFF', 'from-green-500 to-teal-500', 2, true),
  ('Floristas', 'Transforma tu evento en un jardin de ensueno. Los mejores arreglos florales para bodas, fiestas y celebraciones especiales.', 'FLORAL', 'DECORATION', 'from-pink-400 to-rose-500', 3, true),
  ('Seguridad', 'La tranquilidad de tu evento empieza con la seguridad. Profesionales capacitados para garantizar que todo salga perfecto.', 'SEGURIDAD', 'STAFF', 'from-gray-600 to-gray-800', 4, true),
  ('Valet Parking', 'La primera impresion cuenta. Servicio de estacionamiento profesional para que tus invitados lleguen con estilo.', 'VALET_PARKING', 'STAFF', 'from-blue-500 to-indigo-600', 5, true)
ON CONFLICT DO NOTHING;

INSERT INTO site_banners (banner_key, title, subtitle, button_text, button_link, gradient, is_active)
VALUES
  ('showcase_promo', 'Los mejores servicios para tu evento', NULL, 'Todos los servicios', '/servicios', 'from-pink-300 via-pink-400 to-pink-500', true),
  ('cashback_banner', 'Cashback de 5%', 'regalos y servicios gratuitos con tus recompras', NULL, NULL, NULL, true)
ON CONFLICT (banner_key) DO NOTHING;

-- Add slug column to profiles
ALTER TABLE profiles ADD COLUMN slug TEXT;

-- Helper function to generate a slug from text (reusable)
CREATE OR REPLACE FUNCTION generate_slug(input TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            TRANSLATE(
              LOWER(COALESCE(input, '')),
              'áéíóúàèìòùâêîôûäëïöüñ',
              'aeiouaeiouaeiouaeioun'
            ),
            '[^a-z0-9\s-]', '', 'g'
          ),
          '[\s_]+', '-', 'g'
        ),
        '-+', '-', 'g'
      ),
      '(^-|-$)', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill slugs from company_name (preferred) or full_name
UPDATE profiles SET slug = generate_slug(COALESCE(company_name, full_name));

-- Resolve duplicate slugs
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
    FROM profiles
  LOOP
    IF rec.rn > 1 THEN
      UPDATE profiles SET slug = rec.slug || '-' || rec.rn WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Make slug NOT NULL and add unique index
ALTER TABLE profiles ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_profiles_slug ON profiles (slug);

-- Trigger to auto-generate slug on INSERT (covers handle_new_user trigger)
CREATE OR REPLACE FUNCTION generate_profile_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 2;
BEGIN
  base_slug := generate_slug(COALESCE(NEW.company_name, NEW.full_name, NEW.email));
  IF base_slug = '' THEN
    base_slug := 'proveedor';
  END IF;
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = final_slug AND id != NEW.id) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_slug_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION generate_profile_slug();

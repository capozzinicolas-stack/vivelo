-- Add slug column to services
ALTER TABLE services ADD COLUMN slug TEXT;

-- Backfill slugs from titles
-- Step 1: Generate base slugs
UPDATE services SET slug = LOWER(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            TRANSLATE(
              LOWER(title),
              'áéíóúàèìòùâêîôûäëïöüñ',
              'aeiouaeiouaeiouaeioun'
            ),
            '[^a-z0-9\s-]', '', 'g'  -- remove non-alphanumeric
          ),
          '[\s_]+', '-', 'g'         -- spaces/underscores to hyphens
        ),
        '-+', '-', 'g'              -- collapse multiple hyphens
      ),
      '(^-|-$)', '', 'g'            -- trim leading/trailing hyphens
    )
  )
);

-- Step 2: Resolve duplicate slugs by appending -2, -3, etc.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
    FROM services
  LOOP
    IF rec.rn > 1 THEN
      UPDATE services SET slug = rec.slug || '-' || rec.rn WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Make slug NOT NULL and add unique index
ALTER TABLE services ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_services_slug ON services (slug);

-- Nuevas columnas en reviews para moderacion
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved' NOT NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- Actualizar trigger para solo contar reviews aprobadas
CREATE OR REPLACE FUNCTION update_service_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE services SET
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews
                  WHERE service_id = COALESCE(NEW.service_id, OLD.service_id)
                  AND status = 'approved'),
    review_count = (SELECT COUNT(*) FROM reviews
                    WHERE service_id = COALESCE(NEW.service_id, OLD.service_id)
                    AND status = 'approved')
  WHERE id = COALESCE(NEW.service_id, OLD.service_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

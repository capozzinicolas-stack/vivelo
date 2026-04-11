-- ============================================================================
-- Service Admin Comments
-- ============================================================================
-- Permite que los administradores envien comentarios (no bloqueantes) sobre
-- servicios ya activos al proveedor. A diferencia de `services.admin_notes`
-- (que esta atado al flujo needs_revision y bloquea la publicacion), estos
-- comentarios son puramente informativos: el servicio NO cambia de status.
--
-- Reglas de negocio:
--   - Comentarios con categoria (sugerencia, reconocimiento, aviso, oportunidad, recordatorio)
--   - Uno-via: admin escribe, proveedor lee
--   - Proveedor puede marcar como leido (`is_read = true`)
--   - Proveedor puede marcar como resuelto (`resolved_at = now()`) — solo archiva
--   - Admin mantiene CRUD completo via service-role
--   - Los comentarios son independientes del estado del servicio (aprobado, pausado, etc.)
-- ============================================================================

-- 1. Enum de categorias
DO $$ BEGIN
  CREATE TYPE service_comment_category AS ENUM (
    'sugerencia',
    'reconocimiento',
    'aviso',
    'oportunidad',
    'recordatorio'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla principal
CREATE TABLE IF NOT EXISTS service_admin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  -- provider_id se guarda denormalizado para RLS rapida y queries agregadas
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- admin_id puede ser NULL si el admin se elimina (preservamos el historico)
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category service_comment_category NOT NULL DEFAULT 'sugerencia',
  comment TEXT NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 2000),
  is_read BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_sac_service_id ON service_admin_comments(service_id);
CREATE INDEX IF NOT EXISTS idx_sac_provider_id ON service_admin_comments(provider_id);
CREATE INDEX IF NOT EXISTS idx_sac_admin_id ON service_admin_comments(admin_id);
-- Partial index para contar comentarios no leidos del proveedor (badge)
CREATE INDEX IF NOT EXISTS idx_sac_provider_unread
  ON service_admin_comments(provider_id)
  WHERE is_read = false AND resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sac_created_at ON service_admin_comments(created_at DESC);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION update_sac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sac_updated_at ON service_admin_comments;
CREATE TRIGGER trg_sac_updated_at
  BEFORE UPDATE ON service_admin_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_sac_updated_at();

-- 5. RLS
ALTER TABLE service_admin_comments ENABLE ROW LEVEL SECURITY;

-- Admins CRUD completo (detectado via profiles.role)
DROP POLICY IF EXISTS "Admins manage service comments" ON service_admin_comments;
CREATE POLICY "Admins manage service comments" ON service_admin_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Providers pueden leer sus propios comentarios
DROP POLICY IF EXISTS "Providers read own comments" ON service_admin_comments;
CREATE POLICY "Providers read own comments" ON service_admin_comments
  FOR SELECT
  USING (provider_id = auth.uid());

-- Providers pueden actualizar `is_read` y `resolved_at` de sus propios comentarios
-- (Nota: la RLS no puede limitar columnas; la API se encarga de filtrar los campos)
DROP POLICY IF EXISTS "Providers update own comments" ON service_admin_comments;
CREATE POLICY "Providers update own comments" ON service_admin_comments
  FOR UPDATE
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Migration: Provider Fiscal Data
-- Tabla 100% aislada para datos fiscales de proveedores.
-- NO modifica profiles, bookings, ni booking_snapshots.

CREATE TYPE fiscal_status AS ENUM ('incomplete', 'pending_review', 'approved', 'rejected');
CREATE TYPE persona_type AS ENUM ('fisica', 'moral');
CREATE TYPE regimen_fiscal AS ENUM (
  '601', -- General de Ley Personas Morales
  '603', -- Personas Morales con Fines no Lucrativos
  '605', -- Sueldos y Salarios e Ingresos Asimilados a Salarios
  '606', -- Arrendamiento
  '607', -- Regimen de Enajenacion o Adquisicion de Bienes
  '608', -- Demas ingresos
  '610', -- Residentes en el Extranjero sin Establecimiento Permanente en Mexico
  '611', -- Ingresos por Dividendos (socios y accionistas)
  '612', -- Personas Fisicas con Actividades Empresariales y Profesionales
  '614', -- Ingresos por intereses
  '615', -- Regimen de los ingresos por obtencion de premios
  '616', -- Sin obligaciones fiscales
  '620', -- Sociedades Cooperativas de Produccion que optan por diferir sus ingresos
  '621', -- Incorporacion Fiscal
  '622', -- Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras
  '623', -- Opcional para Grupos de Sociedades
  '624', -- Coordinados
  '625', -- Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas
  '626'  -- Regimen Simplificado de Confianza (RESICO)
);

CREATE TABLE IF NOT EXISTS provider_fiscal_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Datos fiscales basicos
  rfc TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  tipo_persona persona_type NOT NULL,
  regimen_fiscal regimen_fiscal NOT NULL,
  uso_cfdi TEXT NOT NULL DEFAULT 'G03', -- Gastos en general

  -- Direccion fiscal (estructura SAT)
  direccion_fiscal JSONB NOT NULL DEFAULT '{}',
  -- Esperado: { calle, numero_exterior, numero_interior, colonia, codigo_postal, municipio, estado, pais }

  -- Datos bancarios
  clabe TEXT,
  banco TEXT,

  -- Documentos (URLs en Supabase Storage - bucket privado)
  constancia_url TEXT,
  estado_cuenta_url TEXT,

  -- Estado de revision
  fiscal_status fiscal_status NOT NULL DEFAULT 'incomplete',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un solo registro fiscal por proveedor
  CONSTRAINT unique_provider_fiscal UNIQUE (provider_id)
);

-- Indices
CREATE INDEX idx_provider_fiscal_provider ON provider_fiscal_data(provider_id);
CREATE INDEX idx_provider_fiscal_status ON provider_fiscal_data(fiscal_status);

-- RLS
ALTER TABLE provider_fiscal_data ENABLE ROW LEVEL SECURITY;

-- Proveedor puede leer sus propios datos fiscales
CREATE POLICY "Providers can read own fiscal data"
  ON provider_fiscal_data FOR SELECT
  USING (auth.uid() = provider_id);

-- Proveedor puede insertar sus propios datos fiscales
CREATE POLICY "Providers can insert own fiscal data"
  ON provider_fiscal_data FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- Proveedor puede actualizar sus propios datos fiscales (solo si no estan aprobados)
CREATE POLICY "Providers can update own fiscal data if not approved"
  ON provider_fiscal_data FOR UPDATE
  USING (auth.uid() = provider_id AND fiscal_status != 'approved');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_fiscal_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiscal_data_updated_at
  BEFORE UPDATE ON provider_fiscal_data
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_data_updated_at();

-- Storage bucket para documentos fiscales (privado)
-- NOTA: Ejecutar en Supabase Dashboard > Storage > Create bucket: "fiscal-documents" (private)
-- Las politicas de storage se configuran manualmente en el dashboard:
--   - Providers can upload to their own folder: fiscal-documents/{provider_id}/*
--   - Admins (service-role) can read any file

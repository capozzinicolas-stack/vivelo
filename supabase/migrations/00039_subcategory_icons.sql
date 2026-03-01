-- ============================================================
-- 00039_subcategory_icons.sql
-- Agregar campo icon a service_subcategories
-- Idempotent: safe to re-run
-- ============================================================

-- 1. Agregar columna icon
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_subcategories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE service_subcategories ADD COLUMN icon TEXT NOT NULL DEFAULT 'Tag';
  END IF;
END $$;

-- 2. Seed icons para subcategorias existentes
-- ─────────────────────────────────────────────────────────────

-- Alimentos y Bebidas
UPDATE service_subcategories SET icon = 'Beef'           WHERE slug = 'TAQUIZA';
UPDATE service_subcategories SET icon = 'ChefHat'        WHERE slug = 'CATERING_POR_TIEMPOS';
UPDATE service_subcategories SET icon = 'Truck'          WHERE slug = 'ESTACIONES_FOODTRUCKS';
UPDATE service_subcategories SET icon = 'Cake'           WHERE slug = 'REPOSTERIA';
UPDATE service_subcategories SET icon = 'Candy'          WHERE slug = 'MESAS_DE_DULCES';
UPDATE service_subcategories SET icon = 'Coffee'         WHERE slug = 'COFFEE_BREAK';
UPDATE service_subcategories SET icon = 'Wine'           WHERE slug = 'BARRA_COCTELERIA';

-- Audio y Entretenimiento
UPDATE service_subcategories SET icon = 'Music'          WHERE slug = 'MARIACHI';
UPDATE service_subcategories SET icon = 'Guitar'         WHERE slug = 'GRUPO_EN_VIVO';
UPDATE service_subcategories SET icon = 'Disc3'          WHERE slug = 'DJ';
UPDATE service_subcategories SET icon = 'Radio'          WHERE slug = 'BANDA';
UPDATE service_subcategories SET icon = 'Mic2'           WHERE slug = 'DUETO_TRIO';
UPDATE service_subcategories SET icon = 'Sparkles'       WHERE slug = 'SAXOFON_VIOLIN';
UPDATE service_subcategories SET icon = 'PartyPopper'    WHERE slug = 'KARAOKE';
UPDATE service_subcategories SET icon = 'Megaphone'      WHERE slug = 'ANIMADOR_MC';
UPDATE service_subcategories SET icon = 'Drama'          WHERE slug = 'IMITADOR';
UPDATE service_subcategories SET icon = 'Laugh'          WHERE slug = 'COMEDIANTE';

-- Decoracion y Ambientacion
UPDATE service_subcategories SET icon = 'Flower2'        WHERE slug = 'FLORAL';
UPDATE service_subcategories SET icon = 'PartyPopper'    WHERE slug = 'GLOBOS_BACKDROPS';
UPDATE service_subcategories SET icon = 'Gem'            WHERE slug = 'CENTROS_DE_MESA';
UPDATE service_subcategories SET icon = 'Palette'        WHERE slug = 'ESCENOGRAFIA_TEMATIZACION';
UPDATE service_subcategories SET icon = 'Lamp'           WHERE slug = 'ILUMINACION_AMBIENTAL';

-- Foto y Video
UPDATE service_subcategories SET icon = 'Camera'         WHERE slug = 'FOTOGRAFIA';
UPDATE service_subcategories SET icon = 'Video'          WHERE slug = 'VIDEO';
UPDATE service_subcategories SET icon = 'Plane'          WHERE slug = 'DRON';
UPDATE service_subcategories SET icon = 'Aperture'       WHERE slug = 'CABINA_360';
UPDATE service_subcategories SET icon = 'ImagePlus'      WHERE slug = 'PHOTOBOOTH_IMPRESIONES';
UPDATE service_subcategories SET icon = 'BookImage'      WHERE slug = 'SESION_PRIVADA';

-- Staff y Operacion
UPDATE service_subcategories SET icon = 'Users'          WHERE slug = 'MESEROS';
UPDATE service_subcategories SET icon = 'GlassWater'     WHERE slug = 'BARTENDER';
UPDATE service_subcategories SET icon = 'ChefHat'        WHERE slug = 'CHEF_EN_SITIO';
UPDATE service_subcategories SET icon = 'Beef'           WHERE slug = 'PARRILLERO';
UPDATE service_subcategories SET icon = 'Handshake'      WHERE slug = 'COORDINADOR_PLANNER';
UPDATE service_subcategories SET icon = 'Heart'          WHERE slug = 'HOSTESS';
UPDATE service_subcategories SET icon = 'Sparkle'        WHERE slug = 'LIMPIEZA';
UPDATE service_subcategories SET icon = 'ShieldCheck'    WHERE slug = 'SEGURIDAD';
UPDATE service_subcategories SET icon = 'CarFront'       WHERE slug = 'VALET_PARKING';
UPDATE service_subcategories SET icon = 'Baby'           WHERE slug = 'NINERA';

-- Mobiliario y Equipo
UPDATE service_subcategories SET icon = 'Armchair'       WHERE slug = 'SILLAS_MESAS';
UPDATE service_subcategories SET icon = 'Sofa'           WHERE slug = 'LOUNGE';
UPDATE service_subcategories SET icon = 'BrickWall'      WHERE slug = 'MANTELERIA';
UPDATE service_subcategories SET icon = 'Tent'           WHERE slug = 'CARPAS';
UPDATE service_subcategories SET icon = 'SquareStack'    WHERE slug = 'TARIMAS_ESCENARIOS';
UPDATE service_subcategories SET icon = 'Disc3'          WHERE slug = 'PISTA_DE_BAILE';
UPDATE service_subcategories SET icon = 'Lightbulb'      WHERE slug = 'ILUMINACION_EQUIPO';
UPDATE service_subcategories SET icon = 'Monitor'        WHERE slug = 'PROYECTOR_PANTALLAS_LED';
UPDATE service_subcategories SET icon = 'Zap'            WHERE slug = 'PLANTA_DE_LUZ';
UPDATE service_subcategories SET icon = 'Thermometer'    WHERE slug = 'CLIMA';

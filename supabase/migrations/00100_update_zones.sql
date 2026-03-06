-- Migration: Update zones from 7 to 9
-- Cuernavaca → Morelos (state), Pachuca → Hidalgo (state), add Guanajuato + Tlaxcala

-- 1. Upsert the 9 zones into service_zones
INSERT INTO service_zones (slug, label, sort_order, is_active) VALUES
  ('ciudad-de-mexico', 'Ciudad de México', 1, true),
  ('estado-de-mexico', 'Estado de México', 2, true),
  ('toluca', 'Toluca', 3, true),
  ('puebla', 'Puebla', 4, true),
  ('hidalgo', 'Hidalgo', 5, true),
  ('queretaro', 'Querétaro', 6, true),
  ('guanajuato', 'Guanajuato', 7, true),
  ('tlaxcala', 'Tlaxcala', 8, true),
  ('morelos', 'Morelos', 9, true)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- 2. Migrate existing services: Cuernavaca → Morelos, Pachuca → Hidalgo
UPDATE services SET zones = array_replace(zones, 'Cuernavaca', 'Morelos')
  WHERE 'Cuernavaca' = ANY(zones);

UPDATE services SET zones = array_replace(zones, 'Pachuca', 'Hidalgo')
  WHERE 'Pachuca' = ANY(zones);

-- 3. Remove old zone entries that are no longer used
DELETE FROM service_zones WHERE slug IN ('cuernavaca', 'pachuca');

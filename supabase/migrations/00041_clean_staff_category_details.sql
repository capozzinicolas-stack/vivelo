-- Clean old staff category_details fields (experiencia, idiomas, capacitacion, numero_personal)
-- These are replaced by new structured fields (perfil_presentacion, uniforme_incluido, que_incluye, etc.)
UPDATE services
SET category_details = '{}'
WHERE category = 'STAFF'
  AND category_details IS NOT NULL
  AND category_details != '{}';

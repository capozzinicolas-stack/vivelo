-- Clean old furniture category_details fields (materiales, colores_disponibles, etc.)
-- Replaced by new structured fields (material_predominante, uso_recomendado, logistica_montaje, etc.)
UPDATE services
SET category_details = '{}'
WHERE category = 'FURNITURE'
  AND category_details IS NOT NULL
  AND category_details != '{}';

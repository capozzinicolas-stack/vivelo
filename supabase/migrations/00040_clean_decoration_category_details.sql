-- Clean old decoration category_details fields (materiales_incluidos, estilo, etc.)
-- These are replaced by new structured fields (material_principal, logistica_entrega, etc.)
UPDATE services
SET category_details = '{}'
WHERE category = 'DECORATION'
  AND category_details IS NOT NULL
  AND category_details != '{}';

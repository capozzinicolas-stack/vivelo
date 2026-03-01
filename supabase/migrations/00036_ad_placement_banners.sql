-- Seed new ad placement banner slots across the site
INSERT INTO site_banners (banner_key, title, subtitle, button_text, button_link, gradient, is_active) VALUES
  ('hero_promo_banner', 'Reserva hoy y obtén 10% de descuento', 'Oferta por tiempo limitado en servicios seleccionados para bodas y XV anos', 'Ver ofertas', '/servicios', 'from-amber-500 to-orange-500', true),
  ('services_top_banner', 'Proveedores verificados con garantia Vivelo', 'Todos nuestros proveedores pasan por un proceso de verificacion para garantizar la calidad de tu evento', 'Conoce mas', '/servicios', 'from-green-500 to-teal-500', true),
  ('service_detail_banner', 'Necesitas mas servicios para tu evento?', 'Explora catering, decoracion, audio y mas — todo en un solo lugar', 'Explorar servicios', '/servicios', 'from-purple-500 to-pink-500', true),
  ('blog_inline_banner', 'Organiza tu evento perfecto', 'Encuentra los mejores proveedores cerca de ti', 'Buscar servicios', '/servicios', 'from-indigo-500 to-purple-600', true),
  ('cart_upsell_banner', 'Completa tu evento!', 'Agrega mas servicios y asegura que todo salga perfecto', 'Ver mas servicios', '/servicios', 'from-blue-500 to-indigo-600', true),
  ('post_purchase_banner', 'Gracias por tu compra!', 'Refiere a un amigo y obtén recompensas en tu proxima reserva', 'Invitar amigos', '/dashboard/cliente/referidos', 'from-teal-400 to-cyan-500', true)
ON CONFLICT (banner_key) DO NOTHING;

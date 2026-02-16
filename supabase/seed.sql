-- Seed data for development
-- Note: In production, users are created through auth.users trigger
-- These inserts are for the profiles table directly for dev/mock purposes

INSERT INTO profiles (id, email, full_name, role, phone, company_name, bio, verified) VALUES
  ('00000000-0000-0000-0000-000000000001', 'maria@example.com', 'María González', 'client', '787-555-0101', NULL, 'Organizadora de eventos sociales', false),
  ('00000000-0000-0000-0000-000000000002', 'carlos@example.com', 'Carlos Rivera', 'provider', '787-555-0102', 'Catering Rivera', 'Más de 10 años de experiencia en catering para eventos', true),
  ('00000000-0000-0000-0000-000000000003', 'admin@vivelo.com', 'Admin Vivelo', 'admin', '787-555-0100', 'Vivelo Inc', 'Administrador de la plataforma', true);

-- Services
INSERT INTO services (id, provider_id, title, description, category, status, base_price, price_unit, min_guests, max_guests, zones, images, avg_rating, review_count, view_count) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Buffet Criollo Premium', 'Disfruta de un auténtico buffet criollo con los mejores platos de la cocina puertorriqueña. Incluye arroz con gandules, pernil, ensalada y más.', 'FOOD_DRINKS', 'active', 45.00, 'por persona', 20, 300, ARRAY['San Juan', 'Bayamon', 'Carolina'], ARRAY['/placeholder-food-1.jpg', '/placeholder-food-2.jpg'], 4.8, 24, 156),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Barra de Cócteles Artesanales', 'Servicio de barra con mixólogos profesionales. Cócteles personalizados para tu evento con ingredientes frescos y locales.', 'FOOD_DRINKS', 'active', 35.00, 'por persona', 30, 200, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Caguas'], ARRAY['/placeholder-drinks-1.jpg'], 4.6, 18, 120),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'DJ + Sonido Profesional', 'Sistema de sonido profesional con DJ experimentado. Incluye luces básicas, micrófonos y equipo completo.', 'AUDIO', 'active', 1500.00, 'por evento', 1, 500, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Ponce', 'Caguas'], ARRAY['/placeholder-audio-1.jpg'], 4.9, 32, 210),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Decoración Floral Elegante', 'Arreglos florales personalizados para tu evento. Centros de mesa, arcos decorativos y ambientación floral completa.', 'DECORATION', 'active', 25.00, 'por mesa', 5, 50, ARRAY['San Juan', 'Bayamon'], ARRAY['/placeholder-deco-1.jpg', '/placeholder-deco-2.jpg'], 4.7, 15, 98),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Fotografía y Video 4K', 'Cobertura completa de tu evento con fotografía profesional y video en 4K. Incluye edición y entrega digital.', 'PHOTO_VIDEO', 'active', 2500.00, 'por evento', 1, 500, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Ponce', 'Caguas', 'Mayaguez'], ARRAY['/placeholder-photo-1.jpg'], 4.9, 28, 180),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Meseros Profesionales', 'Personal de servicio capacitado y uniformado. Atención de primera para tus invitados.', 'STAFF', 'active', 150.00, 'por mesero', 2, 20, ARRAY['San Juan', 'Bayamon', 'Carolina'], ARRAY['/placeholder-staff-1.jpg'], 4.5, 12, 75),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Mesas y Sillas Elegantes', 'Mobiliario premium para eventos. Mesas redondas, rectangulares, sillas Chiavari y más.', 'FURNITURE', 'active', 15.00, 'por persona', 20, 400, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Caguas'], ARRAY['/placeholder-furniture-1.jpg'], 4.4, 8, 55),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Iluminación Ambiental LED', 'Transformamos tu evento con iluminación LED profesional. Incluye wash lights, uplights y efectos especiales.', 'DECORATION', 'active', 800.00, 'por evento', 1, 500, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Ponce'], ARRAY['/placeholder-lights-1.jpg'], 4.8, 20, 130),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'Tarima y Escenario', 'Montaje de tarima profesional para tu evento. Disponible en varios tamaños con accesorios.', 'FURNITURE', 'active', 1200.00, 'por evento', 1, 500, ARRAY['San Juan', 'Bayamon'], ARRAY['/placeholder-stage-1.jpg'], 4.6, 10, 65),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Servicio de Food Truck', 'Food truck gourmet con menú personalizado. Comida fresca preparada en el momento.', 'FOOD_DRINKS', 'active', 2000.00, 'por evento', 30, 150, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Caguas', 'Ponce'], ARRAY['/placeholder-truck-1.jpg'], 4.7, 14, 88),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'Photobooth 360°', 'Experiencia interactiva con photobooth 360° y props personalizados. Incluye impresión instantánea.', 'PHOTO_VIDEO', 'active', 1800.00, 'por evento', 1, 300, ARRAY['San Juan', 'Bayamon', 'Carolina'], ARRAY['/placeholder-booth-1.jpg'], 4.8, 22, 145),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Coordinador de Eventos', 'Coordinación profesional del día de tu evento. Manejo de proveedores, timeline y logística.', 'STAFF', 'active', 2000.00, 'por evento', 1, 500, ARRAY['San Juan', 'Bayamon', 'Carolina', 'Ponce', 'Caguas', 'Mayaguez', 'Arecibo'], ARRAY['/placeholder-coordinator-1.jpg'], 5.0, 16, 110);

-- Extras
INSERT INTO extras (id, service_id, name, description, price, price_type, max_quantity) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Estación de Postres', 'Mesa de postres variados incluyendo flan, tembleque y más', 8.00, 'per_person', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Lechón Asado', 'Lechón entero asado a la vara (rinde ~80 personas)', 350.00, 'fixed', 3),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Shot de Bienvenida', 'Shot personalizado para cada invitado al llegar', 5.00, 'per_person', 1),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Hora Extra de Barra', 'Extensión del servicio de barra por 1 hora adicional', 500.00, 'fixed', 3),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Hora Extra DJ', 'Hora adicional de servicio de DJ', 200.00, 'fixed', 4),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Luces Robóticas', 'Set de luces robóticas inteligentes', 400.00, 'fixed', 2),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Máquina de Humo', 'Efecto de humo bajo para primer baile o momentos especiales', 150.00, 'fixed', 1),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000005', 'Drone Footage', 'Tomas aéreas con drone profesional', 500.00, 'fixed', 1),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Same-Day Edit', 'Video editado el mismo día del evento', 800.00, 'fixed', 1),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'Álbum Premium', 'Álbum fotográfico premium de 40 páginas', 350.00, 'fixed', 1);

-- Bookings
INSERT INTO bookings (id, service_id, client_id, provider_id, event_date, guest_count, base_total, extras_total, commission, total, selected_extras, notes, status) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-03-15', 100, 4500.00, 1150.00, 678.00, 6328.00, '[{"extra_id": "20000000-0000-0000-0000-000000000001", "name": "Estación de Postres", "quantity": 1, "price": 800.00}, {"extra_id": "20000000-0000-0000-0000-000000000002", "name": "Lechón Asado", "quantity": 1, "price": 350.00}]', 'Boda de 100 personas', 'confirmed'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-03-15', 1, 1500.00, 550.00, 246.00, 2296.00, '[{"extra_id": "20000000-0000-0000-0000-000000000005", "name": "Hora Extra DJ", "quantity": 1, "price": 200.00}, {"extra_id": "20000000-0000-0000-0000-000000000007", "name": "Máquina de Humo", "quantity": 1, "price": 150.00}, {"extra_id": "20000000-0000-0000-0000-000000000006", "name": "Luces Robóticas", "quantity": 1, "price": 200.00}]', NULL, 'confirmed'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-04-20', 1, 2500.00, 1300.00, 456.00, 4256.00, '[{"extra_id": "20000000-0000-0000-0000-000000000008", "name": "Drone Footage", "quantity": 1, "price": 500.00}, {"extra_id": "20000000-0000-0000-0000-000000000009", "name": "Same-Day Edit", "quantity": 1, "price": 800.00}]', 'Boda completa con drone', 'pending'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-05-10', 20, 500.00, 0, 60.00, 560.00, '[]', 'Decoración para fiesta de cumpleaños', 'pending'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-03-20', 80, 2800.00, 400.00, 384.00, 3584.00, '[{"extra_id": "20000000-0000-0000-0000-000000000003", "name": "Shot de Bienvenida", "quantity": 1, "price": 400.00}]', NULL, 'in_review'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-06-01', 5, 750.00, 0, 90.00, 840.00, '[]', '5 meseros para evento corporativo', 'confirmed'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-02-28', 1, 1800.00, 0, 216.00, 2016.00, '[]', NULL, 'completed'),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-01-15', 60, 2000.00, 0, 240.00, 2240.00, '[]', 'Food truck para fiesta de año nuevo', 'completed'),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-04-10', 80, 1200.00, 0, 144.00, 1344.00, '[]', NULL, 'cancelled'),
  ('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-07-04', 1, 2000.00, 0, 240.00, 2240.00, '[]', 'Coordinación para boda grande', 'pending');

-- Blocked Dates
INSERT INTO blocked_dates (service_id, blocked_date, reason) VALUES
  ('10000000-0000-0000-0000-000000000001', '2026-03-15', 'Reservado - Boda González'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-24', 'No disponible - Navidad'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-25', 'No disponible - Navidad'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-31', 'No disponible - Año Nuevo'),
  ('10000000-0000-0000-0000-000000000003', '2026-03-15', 'Reservado - Boda González'),
  ('10000000-0000-0000-0000-000000000003', '2026-04-18', 'Mantenimiento de equipo'),
  ('10000000-0000-0000-0000-000000000005', '2026-04-20', 'Reservado - Sesión de boda'),
  ('10000000-0000-0000-0000-000000000005', '2026-05-01', 'Día libre');

-- Reviews
INSERT INTO reviews (service_id, client_id, booking_id, rating, comment) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 5, 'Excelente comida y servicio. Los invitados quedaron encantados con el buffet criollo.'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 5, 'El DJ fue increíble, mantuvo la fiesta toda la noche. Muy profesional.'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', 5, 'El photobooth 360 fue el hit de la fiesta. Todos los invitados lo amaron.'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008', 4, 'Buena comida y concepto original. El food truck fue muy popular.');

-- Seed initial data for Cantera ERP system

-- Insert sample users
INSERT INTO users (email, name, role) VALUES
  ('cajero@cantera.com', 'María González', 'CASHIER'),
  ('patio@cantera.com', 'Juan Pérez', 'YARD'),
  ('seguridad@cantera.com', 'Carlos López', 'SECURITY'),
  ('admin@cantera.com', 'Ana Martínez', 'ADMIN'),
  ('reportes@cantera.com', 'Luis Rodríguez', 'REPORTS')
ON CONFLICT (email) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (name, rfc, address, phone, email) VALUES
  ('Constructora ABC S.A. de C.V.', 'CABC850101ABC', 'Av. Construcción 123, Ciudad', '555-0101', 'contacto@abc.com'),
  ('Materiales del Norte', 'MDN900202DEF', 'Calle Norte 456, Ciudad', '555-0202', 'ventas@norte.com'),
  ('Obras y Proyectos', 'OYP950303GHI', 'Blvd. Proyectos 789, Ciudad', '555-0303', 'info@obras.com')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, unit, price_per_unit) VALUES
  ('Arena', 'Arena de río para construcción', 'm3', 250.00),
  ('Grava', 'Grava triturada 3/4"', 'm3', 300.00),
  ('Piedra', 'Piedra braza para construcción', 'm3', 180.00),
  ('Tepetate', 'Tepetate para relleno', 'm3', 120.00)
ON CONFLICT DO NOTHING;

-- Insert sample trucks
INSERT INTO trucks (plates, brand, model, capacity, driver_name, driver_phone) VALUES
  ('ABC-123-D', 'Kenworth', 'T800', 15.0, 'Roberto Silva', '555-1001'),
  ('DEF-456-G', 'Freightliner', 'Cascadia', 18.0, 'Miguel Torres', '555-1002'),
  ('GHI-789-J', 'Volvo', 'VNL', 20.0, 'Pedro Ramírez', '555-1003'),
  ('JKL-012-M', 'Mack', 'Anthem', 16.0, 'José Hernández', '555-1004')
ON CONFLICT (plates) DO NOTHING;

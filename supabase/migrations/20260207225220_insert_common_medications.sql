/*
  # Insertar medicamentos comunes y sus lotes de inventario
  
  ## Descripción
  Esta migración precarga la base de datos con medicamentos comunes utilizados en hospitales,
  incluyendo sus lotes de inventario iniciales para que el sistema no se vea vacío.
  
  ## Medicamentos incluidos (30 medicamentos comunes)
  
  ### Antibióticos
  - Amoxicilina 500mg (Cápsulas)
  - Ciprofloxacino 500mg (Tabletas)
  - Azitromicina 500mg (Tabletas)
  - Cefalexina 500mg (Cápsulas)
  
  ### Analgésicos y Antiinflamatorios
  - Paracetamol 500mg (Tabletas)
  - Ibuprofeno 400mg (Tabletas)
  - Diclofenaco 50mg (Tabletas)
  - Naproxeno 250mg (Tabletas)
  - Ketorolaco 10mg (Tabletas)
  
  ### Medicamentos Cardiovasculares
  - Losartán 50mg (Tabletas)
  - Enalapril 10mg (Tabletas)
  - Atorvastatina 20mg (Tabletas)
  - Metoprolol 50mg (Tabletas)
  
  ### Medicamentos Gastrointestinales
  - Omeprazol 20mg (Cápsulas)
  - Ranitidina 150mg (Tabletas)
  - Metoclopramida 10mg (Tabletas)
  
  ### Medicamentos para Diabetes
  - Metformina 850mg (Tabletas)
  - Glibenclamida 5mg (Tabletas)
  - Insulina NPH (Vial) - Alto Costo
  - Insulina Rápida (Vial) - Alto Costo
  
  ### Antihistamínicos y Respiratorios
  - Loratadina 10mg (Tabletas)
  - Salbutamol Inhalador (Inhalador)
  - Dexametasona 4mg (Ampolla)
  
  ### Medicamentos de Alto Costo
  - Rituximab 500mg (Vial) - Oncológico
  - Bevacizumab 400mg (Vial) - Oncológico
  - Adalimumab 40mg (Jeringa) - Inmunológico
  
  ### Otros
  - Ácido Fólico 5mg (Tabletas)
  - Vitamina B12 (Ampolla)
  - Suero Fisiológico 0.9% (Bolsa)
  - Dextrosa 5% (Bolsa)
  
  ## Inventario
  Cada medicamento tiene 2-3 lotes con diferentes fechas de vencimiento y proveedores
  
  ## Notas importantes
  - Los lotes se crean con fechas de vencimiento realistas
  - Los precios son referenciales
  - Los medicamentos de alto costo están marcados apropiadamente
*/

-- Insertar medicamentos comunes
INSERT INTO medications (name, generic_name, description, category, unit_type, is_high_cost, min_stock_alert) VALUES

-- Antibióticos
('Amoxicilina 500mg', 'Amoxicilina', 'Antibiótico de amplio espectro para infecciones bacterianas', 'Antibiótico', 'cápsula', false, 50),
('Ciprofloxacino 500mg', 'Ciprofloxacino', 'Antibiótico fluoroquinolona para infecciones bacterianas', 'Antibiótico', 'tableta', false, 30),
('Azitromicina 500mg', 'Azitromicina', 'Antibiótico macrólido de amplio espectro', 'Antibiótico', 'tableta', false, 40),
('Cefalexina 500mg', 'Cefalexina', 'Antibiótico cefalosporina de primera generación', 'Antibiótico', 'cápsula', false, 35),

-- Analgésicos y Antiinflamatorios
('Paracetamol 500mg', 'Paracetamol', 'Analgésico y antipirético de uso común', 'Analgésico', 'tableta', false, 100),
('Ibuprofeno 400mg', 'Ibuprofeno', 'Antiinflamatorio no esteroideo (AINE)', 'Antiinflamatorio', 'tableta', false, 80),
('Diclofenaco 50mg', 'Diclofenaco', 'AINE potente para dolor e inflamación', 'Antiinflamatorio', 'tableta', false, 60),
('Naproxeno 250mg', 'Naproxeno', 'AINE de acción prolongada', 'Antiinflamatorio', 'tableta', false, 50),
('Ketorolaco 10mg', 'Ketorolaco', 'Analgésico AINE potente', 'Analgésico', 'tableta', false, 40),

-- Cardiovasculares
('Losartán 50mg', 'Losartán', 'Antihipertensivo antagonista de receptores de angiotensina', 'Cardiovascular', 'tableta', false, 60),
('Enalapril 10mg', 'Enalapril', 'Inhibidor de la ECA para hipertensión', 'Cardiovascular', 'tableta', false, 55),
('Atorvastatina 20mg', 'Atorvastatina', 'Estatina para control de colesterol', 'Cardiovascular', 'tableta', false, 45),
('Metoprolol 50mg', 'Metoprolol', 'Beta bloqueador para hipertensión y arritmias', 'Cardiovascular', 'tableta', false, 40),

-- Gastrointestinales
('Omeprazol 20mg', 'Omeprazol', 'Inhibidor de la bomba de protones para acidez', 'Gastrointestinal', 'cápsula', false, 70),
('Ranitidina 150mg', 'Ranitidina', 'Bloqueador H2 para reducir ácido estomacal', 'Gastrointestinal', 'tableta', false, 50),
('Metoclopramida 10mg', 'Metoclopramida', 'Antiemético y procinético', 'Gastrointestinal', 'tableta', false, 45),

-- Diabetes
('Metformina 850mg', 'Metformina', 'Antidiabético oral de primera línea', 'Antidiabético', 'tableta', false, 80),
('Glibenclamida 5mg', 'Glibenclamida', 'Sulfonilurea para diabetes tipo 2', 'Antidiabético', 'tableta', false, 50),
('Insulina NPH', 'Insulina Humana', 'Insulina de acción intermedia', 'Antidiabético', 'vial', true, 20),
('Insulina Rápida', 'Insulina Regular', 'Insulina de acción rápida', 'Antidiabético', 'vial', true, 20),

-- Antihistamínicos y Respiratorios
('Loratadina 10mg', 'Loratadina', 'Antihistamínico de segunda generación', 'Antihistamínico', 'tableta', false, 60),
('Salbutamol Inhalador', 'Salbutamol', 'Broncodilatador para asma y EPOC', 'Respiratorio', 'inhalador', false, 25),
('Dexametasona 4mg', 'Dexametasona', 'Corticoide de alta potencia', 'Corticoide', 'ampolla', false, 40),

-- Alto Costo
('Rituximab 500mg', 'Rituximab', 'Anticuerpo monoclonal para linfomas y leucemias', 'Oncológico', 'vial', true, 5),
('Bevacizumab 400mg', 'Bevacizumab', 'Antiangiogénico para cáncer colorrectal y otros', 'Oncológico', 'vial', true, 5),
('Adalimumab 40mg', 'Adalimumab', 'Agente biológico para enfermedades autoinmunes', 'Inmunológico', 'jeringa', true, 10),

-- Otros
('Ácido Fólico 5mg', 'Ácido Fólico', 'Vitamina B9 para prevención de defectos del tubo neural', 'Vitamina', 'tableta', false, 50),
('Vitamina B12', 'Cianocobalamina', 'Vitamina B12 inyectable', 'Vitamina', 'ampolla', false, 30),
('Suero Fisiológico 0.9%', 'Cloruro de Sodio', 'Solución isotónica para hidratación', 'Solución', 'bolsa', false, 100),
('Dextrosa 5%', 'Glucosa', 'Solución glucosada para hidratación', 'Solución', 'bolsa', false, 80);

-- Insertar lotes de inventario para cada medicamento
-- Obtener el ID del admin (primer usuario con rol admin)
DO $$
DECLARE
  admin_id uuid;
  med_id uuid;
BEGIN
  -- Obtener el ID del primer admin
  SELECT id INTO admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  
  -- Si no hay admin, usar NULL (aunque no debería pasar)
  IF admin_id IS NULL THEN
    admin_id := '09a9f4f0-6480-4cbb-bab9-87287751d9d5';
  END IF;

  -- Crear lotes para cada medicamento
  -- Amoxicilina
  SELECT id INTO med_id FROM medications WHERE name = 'Amoxicilina 500mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'AMX-2024-001', 500, 500, 0.25, '2026-08-15', 'Farmacéutica ABC', '2024-01-15', admin_id),
    (med_id, 'AMX-2024-002', 300, 300, 0.28, '2026-11-20', 'Distribuidora XYZ', '2024-03-10', admin_id);

  -- Ciprofloxacino
  SELECT id INTO med_id FROM medications WHERE name = 'Ciprofloxacino 500mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'CIP-2024-001', 250, 250, 0.45, '2026-07-30', 'Farmacéutica ABC', '2024-02-05', admin_id),
    (med_id, 'CIP-2024-002', 200, 200, 0.42, '2026-10-15', 'MediSupply S.A.', '2024-04-12', admin_id);

  -- Azitromicina
  SELECT id INTO med_id FROM medications WHERE name = 'Azitromicina 500mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'AZI-2024-001', 300, 300, 0.80, '2026-09-10', 'Distribuidora XYZ', '2024-01-20', admin_id);

  -- Cefalexina
  SELECT id INTO med_id FROM medications WHERE name = 'Cefalexina 500mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'CEF-2024-001', 280, 280, 0.35, '2026-12-05', 'Farmacéutica ABC', '2024-02-28', admin_id);

  -- Paracetamol
  SELECT id INTO med_id FROM medications WHERE name = 'Paracetamol 500mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'PAR-2024-001', 1000, 1000, 0.05, '2027-03-15', 'Genéricos del Sur', '2024-01-10', admin_id),
    (med_id, 'PAR-2024-002', 800, 800, 0.06, '2027-06-20', 'Farmacéutica ABC', '2024-03-15', admin_id),
    (med_id, 'PAR-2024-003', 600, 600, 0.05, '2027-08-30', 'Distribuidora XYZ', '2024-05-20', admin_id);

  -- Ibuprofeno
  SELECT id INTO med_id FROM medications WHERE name = 'Ibuprofeno 400mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'IBU-2024-001', 750, 750, 0.08, '2027-01-25', 'Genéricos del Sur', '2024-01-18', admin_id),
    (med_id, 'IBU-2024-002', 500, 500, 0.09, '2027-04-10', 'MediSupply S.A.', '2024-04-05', admin_id);

  -- Diclofenaco
  SELECT id INTO med_id FROM medications WHERE name = 'Diclofenaco 50mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'DIC-2024-001', 450, 450, 0.12, '2026-11-12', 'Farmacéutica ABC', '2024-02-14', admin_id);

  -- Naproxeno
  SELECT id INTO med_id FROM medications WHERE name = 'Naproxeno 250mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'NAP-2024-001', 380, 380, 0.15, '2026-10-08', 'Distribuidora XYZ', '2024-03-08', admin_id);

  -- Ketorolaco
  SELECT id INTO med_id FROM medications WHERE name = 'Ketorolaco 10mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'KET-2024-001', 320, 320, 0.18, '2026-09-22', 'MediSupply S.A.', '2024-02-20', admin_id);

  -- Losartán
  SELECT id INTO med_id FROM medications WHERE name = 'Losartán 50mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'LOS-2024-001', 550, 550, 0.22, '2027-02-15', 'Farmacéutica ABC', '2024-01-25', admin_id),
    (med_id, 'LOS-2024-002', 400, 400, 0.20, '2027-05-30', 'Genéricos del Sur', '2024-04-18', admin_id);

  -- Enalapril
  SELECT id INTO med_id FROM medications WHERE name = 'Enalapril 10mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'ENA-2024-001', 480, 480, 0.18, '2027-01-10', 'Distribuidora XYZ', '2024-02-05', admin_id);

  -- Atorvastatina
  SELECT id INTO med_id FROM medications WHERE name = 'Atorvastatina 20mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'ATO-2024-001', 420, 420, 0.35, '2026-12-18', 'MediSupply S.A.', '2024-03-12', admin_id);

  -- Metoprolol
  SELECT id INTO med_id FROM medications WHERE name = 'Metoprolol 50mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'MET-2024-001', 380, 380, 0.25, '2026-11-05', 'Farmacéutica ABC', '2024-02-22', admin_id);

  -- Omeprazol
  SELECT id INTO med_id FROM medications WHERE name = 'Omeprazol 20mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'OME-2024-001', 650, 650, 0.15, '2027-04-20', 'Genéricos del Sur', '2024-01-30', admin_id),
    (med_id, 'OME-2024-002', 500, 500, 0.16, '2027-07-15', 'Distribuidora XYZ', '2024-04-25', admin_id);

  -- Ranitidina
  SELECT id INTO med_id FROM medications WHERE name = 'Ranitidina 150mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'RAN-2024-001', 440, 440, 0.12, '2026-10-28', 'MediSupply S.A.', '2024-03-05', admin_id);

  -- Metoclopramida
  SELECT id INTO med_id FROM medications WHERE name = 'Metoclopramida 10mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'MTC-2024-001', 360, 360, 0.10, '2026-09-14', 'Farmacéutica ABC', '2024-02-18', admin_id);

  -- Metformina
  SELECT id INTO med_id FROM medications WHERE name = 'Metformina 850mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'MTF-2024-001', 720, 720, 0.08, '2027-05-10', 'Genéricos del Sur', '2024-01-22', admin_id),
    (med_id, 'MTF-2024-002', 600, 600, 0.09, '2027-08-25', 'Distribuidora XYZ', '2024-05-10', admin_id);

  -- Glibenclamida
  SELECT id INTO med_id FROM medications WHERE name = 'Glibenclamida 5mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'GLI-2024-001', 450, 450, 0.06, '2027-03-08', 'MediSupply S.A.', '2024-02-12', admin_id);

  -- Insulina NPH (alto costo)
  SELECT id INTO med_id FROM medications WHERE name = 'Insulina NPH';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'INS-NPH-2024-001', 85, 85, 25.50, '2026-06-30', 'BioPharma Internacional', '2024-01-08', admin_id),
    (med_id, 'INS-NPH-2024-002', 60, 60, 26.00, '2026-09-15', 'BioPharma Internacional', '2024-03-20', admin_id);

  -- Insulina Rápida (alto costo)
  SELECT id INTO med_id FROM medications WHERE name = 'Insulina Rápida';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'INS-RAP-2024-001', 75, 75, 28.00, '2026-07-20', 'BioPharma Internacional', '2024-01-15', admin_id),
    (med_id, 'INS-RAP-2024-002', 50, 50, 27.50, '2026-10-05', 'BioPharma Internacional', '2024-04-10', admin_id);

  -- Loratadina
  SELECT id INTO med_id FROM medications WHERE name = 'Loratadina 10mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'LOR-2024-001', 520, 520, 0.07, '2027-02-28', 'Genéricos del Sur', '2024-02-08', admin_id);

  -- Salbutamol
  SELECT id INTO med_id FROM medications WHERE name = 'Salbutamol Inhalador';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'SAL-2024-001', 120, 120, 3.50, '2026-12-30', 'Respiratorio Plus', '2024-01-12', admin_id),
    (med_id, 'SAL-2024-002', 80, 80, 3.75, '2027-03-15', 'Respiratorio Plus', '2024-04-22', admin_id);

  -- Dexametasona
  SELECT id INTO med_id FROM medications WHERE name = 'Dexametasona 4mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'DEX-2024-001', 350, 350, 0.45, '2026-11-20', 'Farmacéutica ABC', '2024-02-25', admin_id);

  -- Rituximab (alto costo)
  SELECT id INTO med_id FROM medications WHERE name = 'Rituximab 500mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'RIT-2024-001', 12, 12, 850.00, '2025-12-31', 'Oncológicos Premium', '2024-01-05', admin_id),
    (med_id, 'RIT-2024-002', 8, 8, 875.00, '2026-02-28', 'Oncológicos Premium', '2024-03-18', admin_id);

  -- Bevacizumab (alto costo)
  SELECT id INTO med_id FROM medications WHERE name = 'Bevacizumab 400mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'BEV-2024-001', 10, 10, 920.00, '2025-11-30', 'Oncológicos Premium', '2024-01-10', admin_id),
    (med_id, 'BEV-2024-002', 6, 6, 945.00, '2026-01-15', 'Oncológicos Premium', '2024-03-25', admin_id);

  -- Adalimumab (alto costo)
  SELECT id INTO med_id FROM medications WHERE name = 'Adalimumab 40mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'ADA-2024-001', 25, 25, 680.00, '2026-04-30', 'BioPharma Internacional', '2024-01-20', admin_id),
    (med_id, 'ADA-2024-002', 18, 18, 695.00, '2026-07-15', 'BioPharma Internacional', '2024-04-15', admin_id);

  -- Ácido Fólico
  SELECT id INTO med_id FROM medications WHERE name = 'Ácido Fólico 5mg';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'FOL-2024-001', 480, 480, 0.04, '2027-06-10', 'Genéricos del Sur', '2024-02-10', admin_id);

  -- Vitamina B12
  SELECT id INTO med_id FROM medications WHERE name = 'Vitamina B12';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'B12-2024-001', 280, 280, 0.55, '2026-10-18', 'Vitaminas S.A.', '2024-03-02', admin_id);

  -- Suero Fisiológico
  SELECT id INTO med_id FROM medications WHERE name = 'Suero Fisiológico 0.9%';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'SF-2024-001', 850, 850, 1.20, '2027-09-30', 'Soluciones Médicas', '2024-01-18', admin_id),
    (med_id, 'SF-2024-002', 650, 650, 1.25, '2027-12-15', 'Soluciones Médicas', '2024-05-08', admin_id);

  -- Dextrosa
  SELECT id INTO med_id FROM medications WHERE name = 'Dextrosa 5%';
  INSERT INTO inventory_batches (medication_id, batch_number, quantity, initial_quantity, unit_cost, expiration_date, supplier, entry_date, created_by)
  VALUES 
    (med_id, 'DEX5-2024-001', 720, 720, 1.15, '2027-08-20', 'Soluciones Médicas', '2024-01-22', admin_id),
    (med_id, 'DEX5-2024-002', 580, 580, 1.18, '2027-11-10', 'Soluciones Médicas', '2024-05-15', admin_id);

END $$;

-- ============================================================
--  MEDICONTROL PRO - SCRIPT COMPLETO DE BASE DE DATOS
--  Ejecutar en: Supabase > SQL Editor > Run
--  Version consolidada: DDL (estructura) + Seed (datos iniciales)
-- ============================================================

-- ============================================================
-- SECCION 0: LIMPIEZA COMPLETA
-- PRECAUCION: Elimina TODAS las tablas y datos existentes.
-- Solo ejecutar en entornos frescos / reinstalacion total.
-- ============================================================

DROP TABLE IF EXISTS historial_despachos_alto_costo CASCADE;
DROP TABLE IF EXISTS pacientes_alto_costo            CASCADE;
DROP TABLE IF EXISTS audit_logs                      CASCADE;
DROP TABLE IF EXISTS inventory_movements             CASCADE;
DROP TABLE IF EXISTS inventory_batches               CASCADE;
DROP TABLE IF EXISTS medications                     CASCADE;
DROP TABLE IF EXISTS categories                      CASCADE;
DROP TABLE IF EXISTS tareas                          CASCADE;
DROP TABLE IF EXISTS system_configuration            CASCADE;
DROP TABLE IF EXISTS user_profiles                   CASCADE;
DROP TABLE IF EXISTS sucursales                      CASCADE;
DROP TABLE IF EXISTS users                           CASCADE;

DROP FUNCTION IF EXISTS get_user_role(uuid);

-- ============================================================
-- SECCION 1: EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECCION 2: TABLAS
-- ============================================================

-- 2.1  users
CREATE TABLE users (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  is_approved         BOOLEAN      DEFAULT false,
  reset_token         VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.2  sucursales
CREATE TABLE sucursales (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(150) UNIQUE NOT NULL,
  direccion      TEXT,
  telefono       VARCHAR(50),
  estado         VARCHAR(20)  DEFAULT 'activo'
                   CHECK (estado IN ('activo','inactivo')),
  imagen_url     TEXT,
  admin_local_id UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.3  user_profiles  (espejo de src/types/database.ts -> UserProfile)
CREATE TABLE user_profiles (
  id                    UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  role                  VARCHAR(50)  NOT NULL
                          CHECK (role IN (
                            'Administrator','Pharmacist','Warehouse_Keeper',
                            'Doctor','Nurse','Local_Admin'
                          )),
  department            VARCHAR(100),
  is_active             BOOLEAN      DEFAULT true,
  can_access_alto_costo BOOLEAN      DEFAULT false,
  sucursal_id           UUID         REFERENCES sucursales(id) ON DELETE SET NULL,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.4  categories
CREATE TABLE categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.5  medications  (espejo de src/types/database.ts -> Medication)
CREATE TABLE medications (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(50)  UNIQUE NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  generic_name          VARCHAR(200),
  category_id           UUID         REFERENCES categories(id) ON DELETE SET NULL,
  presentation          VARCHAR(100) NOT NULL,
  unit                  VARCHAR(100) NOT NULL,
  min_stock_level       INTEGER      NOT NULL DEFAULT 0,
  requires_prescription BOOLEAN      DEFAULT false,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.6  inventory_batches  (espejo de src/types/database.ts -> InventoryBatch)
--      Columnas extra usadas por server.cjs: location, status, sucursal_id
CREATE TABLE inventory_batches (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id    UUID           NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  batch_number     VARCHAR(100)   NOT NULL,
  quantity         INTEGER        NOT NULL DEFAULT 0,
  initial_quantity INTEGER        NOT NULL DEFAULT 0,
  unit_cost        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  expiration_date  DATE           NOT NULL,
  supplier         VARCHAR(200),
  entry_date       DATE           DEFAULT CURRENT_DATE,
  location         VARCHAR(100),
  status           VARCHAR(20)    DEFAULT 'active'
                     CHECK (status IN ('active','quarantine','expired','depleted')),
  sucursal_id      UUID           REFERENCES sucursales(id) ON DELETE SET NULL,
  created_by       UUID           REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (medication_id, batch_number, sucursal_id)
);

-- 2.7  inventory_movements  (espejo de src/types/database.ts -> InventoryMovement)
--      Columnas extra usadas por server.cjs: type, destination, reference_document, sucursal_id
CREATE TABLE inventory_movements (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id           UUID         REFERENCES inventory_batches(id) ON DELETE CASCADE,
  medication_id      UUID         REFERENCES medications(id) ON DELETE SET NULL,
  type               VARCHAR(20)  NOT NULL
                       CHECK (type IN ('in','out','adjustment','return')),
  quantity           INTEGER      NOT NULL,
  reason             VARCHAR(500) NOT NULL,
  recipient_name     VARCHAR(200),
  recipient_id       VARCHAR(100),
  department         VARCHAR(100),
  destination        VARCHAR(200),
  reference_document VARCHAR(100),
  notes              TEXT,
  performed_by       UUID         REFERENCES users(id) ON DELETE SET NULL,
  sucursal_id        UUID         REFERENCES sucursales(id) ON DELETE SET NULL,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.8  audit_logs  (espejo de src/types/database.ts -> AuditLog)
--      Columnas extra de server.cjs: action, entity_type, entity_id, details
--      Columnas alias de supabase migrations: action_type, table_name, record_id
CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  action_type VARCHAR(100),
  entity_type VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  entity_id   UUID,
  table_name  VARCHAR(100),
  record_id   UUID,
  details     JSONB,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.9  system_configuration  (espejo de src/types/database.ts -> SystemConfiguration)
--      Columnas extra de server.cjs: hospital_name, currency, low_stock_threshold_days,
--      require_batch_selection, allow_negative_inventory, membrete_line1, membrete_line2
CREATE TABLE system_configuration (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name            VARCHAR(200) NOT NULL DEFAULT 'Hospital Central',
  currency                 VARCHAR(10)  DEFAULT 'USD',
  low_stock_threshold_days INTEGER      DEFAULT 30,
  require_batch_selection  BOOLEAN      DEFAULT true,
  allow_negative_inventory BOOLEAN      DEFAULT false,
  membrete_line1           TEXT         DEFAULT 'Ministerio del Poder Popular para el Proceso Social de Trabajo',
  membrete_line2           TEXT         DEFAULT 'Instituto Venezolano de los Seguros Sociales',
  updated_by               UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.10  tareas
CREATE TABLE tareas (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         VARCHAR(255) NOT NULL,
  descripcion    TEXT,
  completada     BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id        UUID    REFERENCES users(id) ON DELETE CASCADE
);

-- 2.11  pacientes_alto_costo
CREATE TABLE pacientes_alto_costo (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_identidad  VARCHAR(50)  UNIQUE NOT NULL,
  nombre_completo      VARCHAR(200) NOT NULL,
  codigo_autorizacion  VARCHAR(100),
  historia_clinica_url VARCHAR(500),
  ciclos_totales       INTEGER      NOT NULL,
  ciclos_entregados    INTEGER      DEFAULT 0,
  estado               VARCHAR(20)  DEFAULT 'activo'
                         CHECK (estado IN ('activo','inactivo','completado')),
  sucursal_id          UUID         REFERENCES sucursales(id) ON DELETE SET NULL,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.12  historial_despachos_alto_costo
CREATE TABLE historial_despachos_alto_costo (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID    REFERENCES pacientes_alto_costo(id) ON DELETE CASCADE,
  medication_id UUID    REFERENCES medications(id) ON DELETE RESTRICT,
  batch_number  VARCHAR(100),
  cantidad      INTEGER NOT NULL,
  user_id       UUID    REFERENCES users(id) ON DELETE SET NULL,
  fecha_entrega TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notas         TEXT,
  sucursal_id   UUID    REFERENCES sucursales(id) ON DELETE SET NULL
);

-- ============================================================
-- SECCION 3: INDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_medications_category   ON medications(category_id);
CREATE INDEX IF NOT EXISTS idx_medications_code       ON medications(code);
CREATE INDEX IF NOT EXISTS idx_batches_medication     ON inventory_batches(medication_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiration     ON inventory_batches(expiration_date);
CREATE INDEX IF NOT EXISTS idx_batches_sucursal       ON inventory_batches(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_batches_status         ON inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_movements_batch        ON inventory_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_movements_medication   ON inventory_movements(medication_id);
CREATE INDEX IF NOT EXISTS idx_movements_sucursal     ON inventory_movements(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_movements_type         ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created_at   ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at       ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action           ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_profiles_sucursal      ON user_profiles(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_sucursal     ON pacientes_alto_costo(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_despachos_paciente     ON historial_despachos_alto_costo(paciente_id);

-- ============================================================
-- SECCION 4: FUNCION HELPER (evita recursion en RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = p_user_id;
$$;

-- ============================================================
-- SECCION 5: SEED - DATOS INICIALES
-- ============================================================

-- 5.1  Sucursales -------------------------------------------------
INSERT INTO sucursales (nombre, direccion, estado) VALUES
  ('Sede Principal', 'Hospital Central - Av. Principal Caracas',            'activo'),
  ('Sede Chacao',    'Clinica Municipal Chacao - Av. Francisco de Miranda', 'activo'),
  ('Sede Catia',     'Centro Clinico Catia - Av. Espana',                   'activo')
ON CONFLICT (nombre) DO NOTHING;

-- 5.2  Super Admin ------------------------------------------------
-- Contrasena: jjma2001
-- Hash bcrypt(jjma2001, 10) generado externamente.
-- Si el hash no coincide, usa el servidor para generar uno nuevo o
-- ejecuta: node -e "require('bcryptjs').hash('jjma2001',10).then(h=>console.log(h))"
INSERT INTO users (id, email, password_hash, is_approved)
VALUES (
  'bb000000-0000-0000-0000-000000000002',
  'joel.miranda2009@gmail.com',
  '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cF0gVdU8FKMdCBh5j.Gk9uy',
  true
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id)
VALUES (
  'bb000000-0000-0000-0000-000000000002',
  'Joel', 'Miranda', 'Administrator', 'IT / Direccion General', true,
  (SELECT id FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- 5.3  Usuarios demo (contrasena: 123456) -------------------------
-- Hash bcrypt(123456, 10):
DO $$
DECLARE
  v_hash         TEXT := '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  v_main_suc     UUID;
  v_chacao_suc   UUID;
  v_catia_suc    UUID;
  v_uid          UUID;
BEGIN
  SELECT id INTO v_main_suc   FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1;
  SELECT id INTO v_chacao_suc FROM sucursales WHERE nombre = 'Sede Chacao'    LIMIT 1;
  SELECT id INTO v_catia_suc  FROM sucursales WHERE nombre = 'Sede Catia'     LIMIT 1;

  -- Farmacentica (Sede Principal)
  INSERT INTO users (email, password_hash, is_approved)
  VALUES ('dra.elena.mendoza@ivss.gob.ve', v_hash, true)
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_uid FROM users WHERE email = 'dra.elena.mendoza@ivss.gob.ve';
  INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id)
  VALUES (v_uid, 'Elena', 'Mendoza', 'Pharmacist', 'Farmacia Hospitalaria Central', true, v_main_suc)
  ON CONFLICT (id) DO NOTHING;

  -- Almacenista (Sede Principal)
  INSERT INTO users (email, password_hash, is_approved)
  VALUES ('carlos.ruiz@ivss.gob.ve', v_hash, true)
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_uid FROM users WHERE email = 'carlos.ruiz@ivss.gob.ve';
  INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id)
  VALUES (v_uid, 'Carlos', 'Ruiz', 'Warehouse_Keeper', 'Almacen de Insumos', false, v_main_suc)
  ON CONFLICT (id) DO NOTHING;

  -- Doctor (Sede Chacao)
  INSERT INTO users (email, password_hash, is_approved)
  VALUES ('dr.roberto.silva@ivss.gob.ve', v_hash, true)
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_uid FROM users WHERE email = 'dr.roberto.silva@ivss.gob.ve';
  INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id)
  VALUES (v_uid, 'Roberto', 'Silva', 'Doctor', 'Oncologia Medica - Chacao', true, v_chacao_suc)
  ON CONFLICT (id) DO NOTHING;

  -- Enfermera (Sede Catia)
  INSERT INTO users (email, password_hash, is_approved)
  VALUES ('lic.maria.torres@ivss.gob.ve', v_hash, true)
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_uid FROM users WHERE email = 'lic.maria.torres@ivss.gob.ve';
  INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id)
  VALUES (v_uid, 'Maria', 'Torres', 'Nurse', 'Servicio de Urgencias - Catia', false, v_catia_suc)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 5.4  Categorias -------------------------------------------------
INSERT INTO categories (name, description) VALUES
  ('Analgesicos y Antiinflamatorios',  'Control del dolor y fiebre'),
  ('Antibioticos y Antiinfecciosos',   'Tratamiento de infecciones bacterianas'),
  ('Gastrointestinales',               'Protectores gastricos y digestivos'),
  ('Cardiovascular',                   'Antihipertensivos y antiarritmicos'),
  ('Diabetes y Endocrino',             'Insulinas e hipoglucemiantes'),
  ('Respiratorio',                     'Broncodilatadores y antasmaticos'),
  ('Soluciones e Inyectables',         'Soluciones parenterales y sueros'),
  ('Oncologicos (Alto Costo)',          'Tratamientos quimioterapeuticos y anticuerpos monoclonales'),
  ('Inmunosupresores (Alto Costo)',     'Biologicos y control de enfermedades autoinmunes')
ON CONFLICT (name) DO NOTHING;

-- 5.5  Medicamentos (20 frecuentes + 10 alto costo) ---------------
INSERT INTO medications
  (code, name, generic_name, presentation, unit, min_stock_level, requires_prescription, category_id)
VALUES
  ('MED-001','Acetaminofen (Paracetamol)','Paracetamol',                       'Tabletas 500mg',                'Caja x 20 Tab',       100,false,(SELECT id FROM categories WHERE name='Analgesicos y Antiinflamatorios')),
  ('MED-002','Ibuprofeno',               'Ibuprofeno',                          'Tabletas 400mg',                'Caja x 30 Tab',        80,false,(SELECT id FROM categories WHERE name='Analgesicos y Antiinflamatorios')),
  ('MED-003','Ketoprofeno Inyectable',   'Ketoprofeno',                         'Ampollas 100mg/2ml',            'Caja x 5 Amp',         50,true, (SELECT id FROM categories WHERE name='Analgesicos y Antiinflamatorios')),
  ('MED-004','Amoxicilina + Acido Clavulanico','Amoxicilina / Clavulanato',    'Tabletas 875/125mg',            'Caja x 14 Tab',        60,true, (SELECT id FROM categories WHERE name='Antibioticos y Antiinfecciosos')),
  ('MED-005','Ciprofloxacina',           'Ciprofloxacino',                      'Tabletas 500mg',                'Caja x 10 Tab',        50,true, (SELECT id FROM categories WHERE name='Antibioticos y Antiinfecciosos')),
  ('MED-006','Ceftriaxona Inyectable',   'Ceftriaxona Sodica',                  'Vial I.V. 1g',                  'Caja x 1 Vial',        40,true, (SELECT id FROM categories WHERE name='Antibioticos y Antiinfecciosos')),
  ('MED-007','Azitromicina',             'Azitromicina',                        'Tabletas 500mg',                'Caja x 3 Tab',         50,true, (SELECT id FROM categories WHERE name='Antibioticos y Antiinfecciosos')),
  ('MED-008','Omeprazol',                'Omeprazol',                           'Capsulas 20mg',                 'Caja x 28 Cap',       100,false,(SELECT id FROM categories WHERE name='Gastrointestinales')),
  ('MED-009','Pantoprazol',              'Pantoprazol',                         'Tabletas 40mg',                 'Caja x 14 Tab',        40,false,(SELECT id FROM categories WHERE name='Gastrointestinales')),
  ('MED-010','Losartan Potasico',        'Losartan',                            'Tabletas 50mg',                 'Caja x 30 Tab',        90,true, (SELECT id FROM categories WHERE name='Cardiovascular')),
  ('MED-011','Amlodipino',              'Amlodipino',                           'Tabletas 10mg',                 'Caja x 30 Tab',        70,true, (SELECT id FROM categories WHERE name='Cardiovascular')),
  ('MED-012','Enalapril',               'Enalapril Maleato',                    'Tabletas 20mg',                 'Caja x 30 Tab',        60,true, (SELECT id FROM categories WHERE name='Cardiovascular')),
  ('MED-013','Metformina',              'Metformina Clorhidrato',               'Tabletas 850mg',                'Caja x 30 Tab',       120,true, (SELECT id FROM categories WHERE name='Diabetes y Endocrino')),
  ('MED-014','Insulina NPH Humana',     'Insulina Humana NPH',                  'Vial 100 UI/ml (10ml)',         'Frasco Vial',          25,true, (SELECT id FROM categories WHERE name='Diabetes y Endocrino')),
  ('MED-015','Salbutamol Inhalador',    'Salbutamol Albuterol',                 'Aerosol 100mcg/dosis',          'Inhalador 200 dosis',  35,true, (SELECT id FROM categories WHERE name='Respiratorio')),
  ('MED-016','Dexametasona Inyectable', 'Dexametasona Fosfato',                 'Ampollas 4mg/1ml',              'Caja x 10 Amp',        45,true, (SELECT id FROM categories WHERE name='Respiratorio')),
  ('MED-017','Solucion Fisiologica 0.9%','Cloruro de Sodio 0.9%',              'Bolsa Infusion 500ml',          'Bolsa Flexible',      150,false,(SELECT id FROM categories WHERE name='Soluciones e Inyectables')),
  ('MED-018','Solucion Ringer Lactato', 'Ringer Lactato Solucion',              'Bolsa Infusion 500ml',          'Bolsa Flexible',      100,false,(SELECT id FROM categories WHERE name='Soluciones e Inyectables')),
  ('MED-019','Tramadol Inyectable',     'Tramadol Clorhidrato',                 'Ampollas 50mg/1ml',             'Caja x 5 Amp',         30,true, (SELECT id FROM categories WHERE name='Analgesicos y Antiinflamatorios')),
  ('MED-020','Diclofenac Sodico',       'Diclofenac',                          'Ampollas 75mg/3ml',             'Caja x 5 Amp',         50,true, (SELECT id FROM categories WHERE name='Analgesicos y Antiinflamatorios')),
  ('AC-001', 'Rituximab 500mg',         'Rituximab (Anticuerpo Monoclonal)',    'Frasco Vial 500mg/50ml',        'Frasco Vial I.V.',     10,true, (SELECT id FROM categories WHERE name='Oncologicos (Alto Costo)')),
  ('AC-002', 'Trastuzumab 440mg',       'Trastuzumab',                          'Frasco Vial Liofilizado 440mg', 'Frasco Vial',           8,true, (SELECT id FROM categories WHERE name='Oncologicos (Alto Costo)')),
  ('AC-003', 'Bevacizumab 400mg',       'Bevacizumab',                          'Frasco Vial 400mg/16ml',        'Frasco Vial',           6,true, (SELECT id FROM categories WHERE name='Oncologicos (Alto Costo)')),
  ('AC-004', 'Pembrolizumab 100mg',     'Pembrolizumab (Keytruda)',             'Frasco Vial 100mg/4ml',         'Frasco Vial',           5,true, (SELECT id FROM categories WHERE name='Oncologicos (Alto Costo)')),
  ('AC-005', 'Infliximab 100mg',        'Infliximab (Remicade)',                'Frasco Vial Liofilizado 100mg', 'Frasco Vial',          12,true, (SELECT id FROM categories WHERE name='Inmunosupresores (Alto Costo)')),
  ('AC-006', 'Tacrolimus 1mg',          'Tacrolimus (Prograf)',                 'Capsulas 1mg',                  'Caja x 50 Cap',        15,true, (SELECT id FROM categories WHERE name='Inmunosupresores (Alto Costo)')),
  ('AC-007', 'Adalimumab 40mg',         'Adalimumab (Humira)',                  'Pluma Pre-llenada 40mg/0.8ml',  'Caja x 2 Plumas',      10,true, (SELECT id FROM categories WHERE name='Inmunosupresores (Alto Costo)')),
  ('AC-008', 'Epoetina Alfa 4000 UI',   'Eritropoyetina Humana',               'Jeringa Pre-llenada 4000 UI',   'Caja x 6 Jeringas',    20,true, (SELECT id FROM categories WHERE name='Inmunosupresores (Alto Costo)')),
  ('AC-009', 'Filgrastim 300mcg',       'Filgrastim (Neupogen)',               'Jeringa Pre-llenada 300mcg/0.5ml','Caja x 5 Jeringas',  15,true, (SELECT id FROM categories WHERE name='Oncologicos (Alto Costo)')),
  ('AC-010', 'Bortezomib 3.5mg',        'Bortezomib (Velcade)',                'Frasco Vial Liofilizado 3.5mg', 'Frasco Vial',           6,true, (SELECT id FROM categories WHERE name='Oncologicos (Alto Costo)'))
ON CONFLICT (code) DO NOTHING;

-- 5.6  Lotes de Inventario (36 lotes, 3 sedes) --------------------
INSERT INTO inventory_batches
  (medication_id, batch_number, expiration_date, quantity, initial_quantity, unit_cost, supplier, location, status, sucursal_id)
VALUES
  -- SEDE PRINCIPAL
  ((SELECT id FROM medications WHERE code='MED-001'),'LOT-2026-ACET-01',      CURRENT_DATE+365, 450,450,  2.10,'Drogueria Nena C.A.',             'Estante A-1',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-001'),'LOT-2026-ACET-02',      CURRENT_DATE+180, 200,200,  2.10,'Laboratorios Calox International','Estante A-1',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-002'),'LOT-2026-IBU-01',       CURRENT_DATE+240, 320,320,  3.50,'FarmaSANO Venezuela',             'Estante A-2',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-003'),'LOT-2026-KETO-01',      CURRENT_DATE+400, 150,150,  5.80,'Laboratorios Leti C.A.',          'Estante A-3',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-004'),'LOT-2026-AMX-01',       CURRENT_DATE+300, 180,180,  8.90,'Drogueria Behrens',               'Estante B-1',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-005'),'LOT-2026-CIPRO-CRITICO',CURRENT_DATE+20,   15, 15,  6.40,'Drogueria Nena C.A.',             'Estante B-2',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-006'),'LOT-2026-CEFT-01',      CURRENT_DATE+25,   28, 28, 12.50,'Laboratorios Leti C.A.',          'Refrigerador R-1',         'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-008'),'LOT-2026-OMEP-01',      CURRENT_DATE+500, 600,600,  4.20,'Drogueria Behrens',               'Estante C-1',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-010'),'LOT-2026-LOSA-01',      CURRENT_DATE+420, 400,400,  3.80,'Laboratorios Calox International','Estante D-1',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-013'),'LOT-2026-METF-01',      CURRENT_DATE+450, 550,550,  4.50,'Drogueria Nena C.A.',             'Estante E-1',              'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-014'),'LOT-2026-INSU-VENC',    CURRENT_DATE+12,   12, 12, 18.00,'Laboratorios Leti C.A.',          'Cava Refrigerada 1',       'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-017'),'LOT-2026-SOL-FIS-01',   CURRENT_DATE+600, 850,850,  1.80,'Drogueria Vargas',                'Almacen Central Palet 1',  'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='MED-019'),'LOT-2026-TRAM-01',      CURRENT_DATE+18,   45, 45,  7.20,'Drogueria Behrens',               'Gabinete Controlado A',    'active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='AC-001'), 'LOT-2026-RITUX-01',     CURRENT_DATE+280,  25, 25,850.00,'Drogueria Especializada IVSS',   'Cava Biologicos - Pos. 01','active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='AC-002'), 'LOT-2026-TRAST-01',     CURRENT_DATE+300,  18, 18,1200.00,'Drogueria Especializada IVSS',  'Cava Biologicos - Pos. 02','active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ((SELECT id FROM medications WHERE code='AC-005'), 'LOT-2026-INFLI-01',     CURRENT_DATE+340,  30, 30,620.00,'Drogueria Especializada IVSS',   'Cava Biologicos - Pos. 05','active',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  -- SEDE CHACAO
  ((SELECT id FROM medications WHERE code='MED-001'),'LOT-2026-ACET-CHA',     CURRENT_DATE+320, 250,250,  2.10,'Drogueria Nena C.A.',             'Estante 1 - Chacao',       'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='MED-004'),'LOT-2026-AMX-CHA',      CURRENT_DATE+280,  95, 95,  8.90,'Drogueria Behrens',               'Estante 2 - Chacao',       'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='MED-007'),'LOT-2026-AZIT-CHA',     CURRENT_DATE+140,  18, 18,  7.80,'FarmaSANO Venezuela',             'Estante 3 - Chacao',       'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='MED-011'),'LOT-2026-AMLO-CHA',     CURRENT_DATE+360, 180,180,  2.90,'FarmaSANO Venezuela',             'Estante 4 - Chacao',       'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='MED-015'),'LOT-2026-SALB-CHA',     CURRENT_DATE+290,  65, 65,  9.50,'FarmaSANO Venezuela',             'Estante 5 - Chacao',       'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='MED-018'),'LOT-2026-RING-CHA',     CURRENT_DATE+520, 340,340,  2.10,'Drogueria Vargas',                'Almacen Chacao - Palet 1', 'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='AC-003'), 'LOT-2026-BEVAC-CHA',    CURRENT_DATE+210,  12, 12,980.00,'Drogueria Especializada IVSS',   'Cava Chacao - Pos. 01',    'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='AC-006'), 'LOT-2026-TACRO-CHA',    CURRENT_DATE+410,  35, 35,150.00,'Drogueria Especializada IVSS',   'Gabinete Especial Chacao', 'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ((SELECT id FROM medications WHERE code='AC-007'), 'LOT-2026-ADALI-CHA',    CURRENT_DATE+230,  15, 15,780.00,'Drogueria Especializada IVSS',   'Cava Chacao - Pos. 02',    'active',(SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  -- SEDE CATIA
  ((SELECT id FROM medications WHERE code='MED-002'),'LOT-2026-IBU-CAT',      CURRENT_DATE+220, 210,210,  3.50,'FarmaSANO Venezuela',             'Estante 1 - Catia',        'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='MED-003'),'LOT-2026-KETO-CAT',     CURRENT_DATE+380,  85, 85,  5.80,'Laboratorios Leti C.A.',          'Estante 2 - Catia',        'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='MED-009'),'LOT-2026-PANT-CAT',     CURRENT_DATE+300,  75, 75,  6.10,'Drogueria Nena C.A.',             'Estante 3 - Catia',        'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='MED-012'),'LOT-2026-ENAL-CAT',     CURRENT_DATE+270, 140,140,  3.10,'Drogueria Behrens',               'Estante 4 - Catia',        'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='MED-016'),'LOT-2026-DEXA-CAT',     CURRENT_DATE+340, 110,110,  4.00,'Laboratorios Calox International','Estante 5 - Catia',        'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='MED-017'),'LOT-2026-SOL-FIS-CAT',  CURRENT_DATE+560, 420,420,  1.80,'Drogueria Vargas',                'Almacen Catia - Palet 1',  'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='MED-020'),'LOT-2026-DICL-CAT',     CURRENT_DATE+330, 160,160,  3.40,'Laboratorios Leti C.A.',          'Estante 6 - Catia',        'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='AC-004'), 'LOT-2026-PEMBRO-CAT',   CURRENT_DATE+180,   6,  6,2400.00,'Drogueria Especializada IVSS',  'Cava Catia - Pos. 01',     'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='AC-008'), 'LOT-2026-EPOET-CAT',    CURRENT_DATE+270,  45, 45, 45.00,'Drogueria Especializada IVSS',   'Cava Catia - Pos. 02',     'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='AC-009'), 'LOT-2026-FILGR-CAT',    CURRENT_DATE+310,  30, 30, 65.00,'Drogueria Especializada IVSS',   'Cava Catia - Pos. 03',     'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ((SELECT id FROM medications WHERE code='AC-010'), 'LOT-2026-BORTE-CAT',    CURRENT_DATE+200,   8,  8,1100.00,'Drogueria Especializada IVSS',  'Cava Catia - Pos. 04',     'active',(SELECT id FROM sucursales WHERE nombre='Sede Catia'))
;

-- 5.7  Movimientos de apertura (un ingreso por lote) --------------
INSERT INTO inventory_movements
  (batch_id, medication_id, type, quantity, reason, destination, reference_document, performed_by, sucursal_id, created_at)
SELECT
  b.id,
  b.medication_id,
  'in',
  b.quantity,
  'Ingreso inicial - Carga de apertura del sistema',
  'Almacen Central de Recepcion',
  'DOC-IVSS-APERTURA-' || LPAD(ROW_NUMBER() OVER (ORDER BY b.created_at)::text, 4, '0'),
  'bb000000-0000-0000-0000-000000000002',
  b.sucursal_id,
  NOW() - INTERVAL '25 days'
FROM inventory_batches b;

-- 5.8  Pacientes de Alto Costo ------------------------------------
INSERT INTO pacientes_alto_costo
  (documento_identidad, nombre_completo, codigo_autorizacion, ciclos_totales, ciclos_entregados, estado, sucursal_id)
VALUES
  ('V-14892301','Maria Alejandra Benitez',   'AUT-IVSS-2026-901', 6, 4,'activo',   (SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ('V-11450922','Jose Luis Rodriguez',       'AUT-IVSS-2026-902', 8, 6,'activo',   (SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ('V-16780114','Carmen Rosa Mendoza',       'AUT-IVSS-2026-903', 6, 6,'completado',(SELECT id FROM sucursales WHERE nombre='Sede Principal')),
  ('V-09340551','Carlos Eduardo Gutierrez',  'AUT-IVSS-2026-904',12, 2,'activo',   (SELECT id FROM sucursales WHERE nombre='Sede Catia')),
  ('V-19200418','Ana Patricia Colmenares',   'AUT-IVSS-2026-905', 6, 1,'activo',   (SELECT id FROM sucursales WHERE nombre='Sede Chacao')),
  ('V-13654890','Roberto Antonio Morales',   'AUT-IVSS-2026-906', 8, 3,'activo',   (SELECT id FROM sucursales WHERE nombre='Sede Catia'))
ON CONFLICT (documento_identidad) DO NOTHING;

-- 5.9  Historial de despachos de Alto Costo -----------------------
INSERT INTO historial_despachos_alto_costo
  (paciente_id, medication_id, batch_number, cantidad, user_id, fecha_entrega, notas, sucursal_id)
SELECT
  p.id,
  (SELECT id FROM medications WHERE code='AC-001'),
  'LOT-2026-RITUX-01',
  1,
  'bb000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '20 days',
  'Despacho autorizado - Rituximab 500mg',
  p.sucursal_id
FROM pacientes_alto_costo p
WHERE p.ciclos_entregados >= 1
LIMIT 4;

-- 5.10  Tareas del sistema ----------------------------------------
INSERT INTO tareas (titulo, descripcion, completada, fecha_creacion, user_id) VALUES
  ('Auditoria mensual lotes Alto Costo',       'Verificar inventario fisico vs sistema con el comisionado IVSS',         true, NOW()-INTERVAL '25 days','bb000000-0000-0000-0000-000000000002'),
  ('Control de insulinas en cava refrigerada', 'Confirmar cadena de frio entre 2C y 8C y registrar planilla',            true, NOW()-INTERVAL '20 days','bb000000-0000-0000-0000-000000000002'),
  ('Reporte consolidado de consumo mensual',   'Generar reporte PDF con membrete oficial IVSS de las 3 sedes',           true, NOW()-INTERVAL '10 days','bb000000-0000-0000-0000-000000000002'),
  ('Verificacion de vencimientos proximos',    'Revision Ciprofloxacina (Sede Principal) y Ceftriaxona',                 true, NOW()-INTERVAL '5 days', 'bb000000-0000-0000-0000-000000000002'),
  ('Recepcion pedido Drogueria Especializada', 'Ingresar nuevos lotes de Pembrolizumab y Tacrolimus',                   false, NOW()-INTERVAL '3 days', 'bb000000-0000-0000-0000-000000000002'),
  ('Reorganizacion soluciones parenterales',   'Disponer palet 3 en el almacen principal (Fisiologica 0.9%)',            false, NOW()-INTERVAL '2 days', 'bb000000-0000-0000-0000-000000000002'),
  ('Actualizacion expedientes Alto Costo',     'Revisar autorizaciones de ciclos vencidos',                              false, NOW()-INTERVAL '1 day',  'bb000000-0000-0000-0000-000000000002'),
  ('Capacitacion personal - modulo Entregas',  'Induccion nuevo personal sanitario sobre el sistema MediControl Pro',   false, NOW(),                   'bb000000-0000-0000-0000-000000000002');

-- 5.11  Configuracion del sistema ---------------------------------
INSERT INTO system_configuration
  (hospital_name, currency, low_stock_threshold_days, require_batch_selection, allow_negative_inventory, membrete_line1, membrete_line2)
VALUES
  ('Hospital Central IVSS','USD',30,true,false,
   'Ministerio del Poder Popular para el Proceso Social de Trabajo',
   'Instituto Venezolano de los Seguros Sociales')
ON CONFLICT DO NOTHING;

-- 5.12  Audit log inicial -----------------------------------------
INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address, created_at) VALUES
  ('bb000000-0000-0000-0000-000000000002','USER_LOGIN',      'AUTH',         '{"email":"joel.miranda2009@gmail.com","role":"Administrator","sucursal":"Sede Principal"}', '127.0.0.1', NOW()-INTERVAL '30 days'),
  ('bb000000-0000-0000-0000-000000000002','STOCK_ENTRY',     'INVENTORY',    '{"medication":"Rituximab 500mg","batch":"LOT-2026-RITUX-01","quantity":25}',               '127.0.0.1', NOW()-INTERVAL '25 days'),
  ('bb000000-0000-0000-0000-000000000002','PACIENTE_REGISTRO','ALTO_COSTO',  '{"paciente":"Maria Alejandra Benitez","cedula":"V-14892301","ciclos_totales":6}',           '127.0.0.1', NOW()-INTERVAL '20 days'),
  ('bb000000-0000-0000-0000-000000000002','SETTINGS_UPDATE', 'CONFIGURATION','{"setting":"threshold_days","value":30,"updated_by":"Joel Miranda"}',                      '127.0.0.1', NOW()-INTERVAL '5 days'),
  ('bb000000-0000-0000-0000-000000000002','REPORT_GENERATE', 'REPORTS',      '{"report_type":"Consolidado Mensual PDF IVSS","format":"PDF"}',                            '127.0.0.1', NOW()-INTERVAL '1 day');

-- ============================================================
-- SECCION 6: VERIFICACION FINAL (conteo por tabla)
-- ============================================================

SELECT 'users'                         AS tabla, COUNT(*) AS registros FROM users
UNION ALL SELECT 'sucursales',                   COUNT(*)              FROM sucursales
UNION ALL SELECT 'user_profiles',                COUNT(*)              FROM user_profiles
UNION ALL SELECT 'categories',                   COUNT(*)              FROM categories
UNION ALL SELECT 'medications',                  COUNT(*)              FROM medications
UNION ALL SELECT 'inventory_batches',            COUNT(*)              FROM inventory_batches
UNION ALL SELECT 'inventory_movements',          COUNT(*)              FROM inventory_movements
UNION ALL SELECT 'pacientes_alto_costo',         COUNT(*)              FROM pacientes_alto_costo
UNION ALL SELECT 'historial_despachos',          COUNT(*)              FROM historial_despachos_alto_costo
UNION ALL SELECT 'tareas',                       COUNT(*)              FROM tareas
UNION ALL SELECT 'audit_logs',                   COUNT(*)              FROM audit_logs
UNION ALL SELECT 'system_configuration',         COUNT(*)              FROM system_configuration
ORDER BY 1;

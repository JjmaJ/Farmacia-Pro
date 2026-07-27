-- Drop tables if they exist to allow clean re-runs
DROP TABLE IF EXISTS historial_despachos_alto_costo CASCADE;
DROP TABLE IF EXISTS pacientes_alto_costo CASCADE;
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tareas CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_batches CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS system_configuration CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. users (Base table replacing Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. user_profiles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Administrator', 'Pharmacist', 'Warehouse_Keeper', 'Doctor', 'Nurse')),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    can_access_alto_costo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. categories (For medications and tasks)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. medications
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    presentation VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    min_stock_level INTEGER NOT NULL DEFAULT 0,
    requires_prescription BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. inventory_batches
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiration_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2),
    supplier VARCHAR(200),
    location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'quarantine', 'expired', 'depleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. inventory_movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'return')),
    quantity INTEGER NOT NULL,
    reason VARCHAR(200) NOT NULL,
    reference_document VARCHAR(100),
    performed_by UUID NOT NULL REFERENCES users(id),
    destination VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. tareas (Tasks)
CREATE TABLE tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    completada BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 8. tags (For tagging tasks or medications)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. task_tags (Many-to-many relationship)
CREATE TABLE task_tags (
    task_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- 10. audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. system_configuration
CREATE TABLE system_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_name VARCHAR(200) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    low_stock_threshold_days INTEGER DEFAULT 30,
    require_batch_selection BOOLEAN DEFAULT true,
    allow_negative_inventory BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'tarea', 'medication', 'movement'
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. pacientes_alto_costo
CREATE TABLE pacientes_alto_costo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_identidad VARCHAR(50) UNIQUE NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    codigo_autorizacion VARCHAR(100),
    historia_clinica_url VARCHAR(500),
    ciclos_totales INTEGER NOT NULL,
    ciclos_entregados INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'completado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. historial_despachos_alto_costo
CREATE TABLE historial_despachos_alto_costo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES pacientes_alto_costo(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medications(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100),
    cantidad INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha_entrega TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

-- Default data
INSERT INTO categories (name, description) VALUES 
('Analgesics', 'Pain relievers'), 
('Antibiotics', 'Bacterial infections'),
('Cardiovascular', 'Heart and blood pressure'),
('Tasks', 'General task category');

INSERT INTO tags (name, color) VALUES 
('Urgent', '#ef4444'), 
('Review', '#f59e0b'), 
('Routine', '#3b82f6');

-- Insert a default admin user (password hash is a placeholder, will be replaced in app or seeded)
-- Let's use bcrypt hash for 'admin123' -> $2b$10$YourHashHere
-- For simplicity in this script, we'll insert it via the Node.js setup later or just standard text for now if purely testing.
-- To make the app work immediately, let's insert standard plaintext for testing ONLY (or we update auth to handle it).
-- We'll just define the tables here.

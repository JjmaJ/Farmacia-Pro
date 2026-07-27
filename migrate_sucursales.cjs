const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('⏳ Iniciando migración para soporte multi-sucursal...');
    await client.query('BEGIN');

    // 1. Crear tabla sucursales
    console.log('Creating table sucursales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sucursales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(150) UNIQUE NOT NULL,
        direccion TEXT,
        estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Insertar sucursales por defecto
    console.log('Seeding default branches...');
    await client.query(`
      INSERT INTO sucursales (nombre, direccion, estado) VALUES
      ('Sede Principal', 'Hospital Central - Av. Principal Caracas', 'activo'),
      ('Sede Chacao', 'Clínica Municipal Chacao - Av. Francisco de Miranda', 'activo'),
      ('Sede Catia', 'Centro Clínico Catia - Av. España', 'activo')
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // 3. Añadir columna sucursal_id a las tablas correspondientes
    console.log('Adding sucursal_id columns and foreign keys...');
    await client.query(`
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;
      ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;
      ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;
      ALTER TABLE pacientes_alto_costo ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;
      ALTER TABLE historial_despachos_alto_costo ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;
    `);

    // 4. Asignar todos los registros existentes a la Sede Principal
    console.log('Migrating existing records to Sede Principal...');
    await client.query(`
      UPDATE user_profiles SET sucursal_id = (SELECT id FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE inventory_batches SET sucursal_id = (SELECT id FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE inventory_movements SET sucursal_id = (SELECT id FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE pacientes_alto_costo SET sucursal_id = (SELECT id FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE historial_despachos_alto_costo SET sucursal_id = (SELECT id FROM sucursales WHERE nombre = 'Sede Principal' LIMIT 1) WHERE sucursal_id IS NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ ¡Migración de sucursales completada con éxito!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error ejecutando la migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

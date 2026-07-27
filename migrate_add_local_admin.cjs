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
    console.log('⏳ Iniciando migración: admin_local + rol Local_Admin...');
    await client.query('BEGIN');

    // 1. Añadir columna admin_local_id a sucursales (si no existe)
    console.log('📌 Añadiendo columna admin_local_id a sucursales...');
    await client.query(`
      ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS admin_local_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 2. Añadir columna telefono a sucursales (si no existe)
    console.log('📌 Añadiendo columna telefono a sucursales...');
    await client.query(`
      ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
    `);

    // 3. Ampliar el CHECK constraint de user_profiles.role para incluir Local_Admin
    // Primero eliminamos el constraint existente y creamos uno nuevo
    console.log('📌 Actualizando CHECK constraint de roles en user_profiles...');
    await client.query(`
      ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
    `);
    await client.query(`
      ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('Administrator', 'Pharmacist', 'Warehouse_Keeper', 'Doctor', 'Nurse', 'Local_Admin'));
    `);

    await client.query('COMMIT');
    console.log('✅ ¡Migración completada con éxito!');
    console.log('   - Columna admin_local_id añadida a sucursales');
    console.log('   - Columna telefono añadida a sucursales');
    console.log('   - Rol Local_Admin habilitado en user_profiles');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error ejecutando la migración:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Puede que la migración ya fue ejecutada anteriormente.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

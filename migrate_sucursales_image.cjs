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
    console.log('⏳ Iniciando migración para soporte de imágenes en sucursales...');
    await client.query('BEGIN');

    // Añadir columna imagen_url a la tabla sucursales
    console.log('Añadiendo columna imagen_url...');
    await client.query(`
      ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS imagen_url TEXT;
    `);

    await client.query('COMMIT');
    console.log('✅ ¡Columna imagen_url añadida con éxito a la tabla sucursales!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error ejecutando la migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

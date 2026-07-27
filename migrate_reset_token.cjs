const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
});

async function run() {
  try {
    console.log('Adding reset_token column to users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
    console.log('reset_token column added or already exists.');

    console.log('Adding reset_token_expires column to users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;');
    console.log('reset_token_expires column added or already exists.');
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();

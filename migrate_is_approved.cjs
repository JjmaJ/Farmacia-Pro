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

async function run() {
  try {
    console.log('Adding is_approved column to users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;');
    console.log('Column added.');
    
    console.log('Updating existing users to be approved...');
    await pool.query('UPDATE users SET is_approved = true;');
    console.log('Existing users updated.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();

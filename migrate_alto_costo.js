import pool from './db.js';

async function migrate() {
  try {
    console.log('Adding can_access_alto_costo column...');
    await pool.query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS can_access_alto_costo BOOLEAN DEFAULT false;');
    console.log('✅ Column added successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();

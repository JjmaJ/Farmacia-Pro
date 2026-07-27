require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function reset() {
  const newHash = await bcrypt.hash('jjma2001', 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2',
    [newHash, 'joel.miranda2009@gmail.com']
  );
  console.log('✅ Contraseña del Super Admin restablecida correctamente a: jjma2001');
  await pool.end();
}

reset().catch(async e => {
  console.error('Error:', e.message);
  await pool.end();
});

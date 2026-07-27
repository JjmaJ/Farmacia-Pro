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

async function check() {
  const result = await pool.query(
    'SELECT id, email, password_hash, is_approved, reset_token FROM users WHERE email = $1',
    ['joel.miranda2009@gmail.com']
  );

  if (result.rows.length === 0) {
    console.log('USUARIO NO ENCONTRADO EN LA BD');
    await pool.end();
    return;
  }

  const u = result.rows[0];
  console.log('=== ESTADO ACTUAL DEL SUPER ADMIN EN BD ===');
  console.log('Email:', u.email);
  console.log('Aprobado (is_approved):', u.is_approved);
  console.log('Tiene token de reset activo:', u.reset_token ? 'Si' : 'No');
  console.log('Hash guardado (primeros 40 chars):', u.password_hash.substring(0, 40));

  const isBcrypt = u.password_hash.startsWith('$2');
  console.log('Tipo de hash:', isBcrypt ? 'bcrypt (cifrado)' : 'texto plano');

  if (isBcrypt) {
    const matchOrig = await bcrypt.compare('jjma2001', u.password_hash);
    console.log('Coincide con la original jjma2001?:', matchOrig ? 'SI' : 'NO');
  } else {
    console.log('Password en texto plano:', u.password_hash);
    console.log('Coincide con jjma2001?:', u.password_hash === 'jjma2001');
  }

  await pool.end();
}

check().catch(async e => {
  console.error('Error:', e.message);
  await pool.end();
});

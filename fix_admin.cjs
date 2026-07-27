const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

const bcrypt = require('bcryptjs');

async function checkAndFixAdmin() {
  const email = 'joel.miranda2009@gmail.com';
  const password = 'jjma2001';

  console.log('Verificando usuario admin en Supabase...');

  // 1. Check if user exists
  const existing = await pool.query(
    'SELECT id, email, is_approved, password_hash FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length === 0) {
    console.log('Usuario NO encontrado. Creando...');
    const hash = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, is_approved) VALUES ($1, $2, true) RETURNING id',
      [email, hash]
    );
    const userId = newUser.rows[0].id;
    console.log('Usuario creado con ID:', userId);

    await pool.query(
      `INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo)
       VALUES ($1, 'Joel', 'Miranda', 'Administrator', 'IT / Direccion General', true)
       ON CONFLICT (id) DO NOTHING`,
      [userId]
    );
    console.log('Perfil de administrador creado.');

  } else {
    const user = existing.rows[0];
    console.log('Usuario ENCONTRADO:', { id: user.id, email: user.email, is_approved: user.is_approved });

    // 2. Verify password match
    const match = await bcrypt.compare(password, user.password_hash);
    console.log('Hash en BD:', user.password_hash.substring(0, 30) + '...');
    console.log('Contrasena correcta:', match);

    if (!match) {
      console.log('El hash NO coincide. Regenerando hash con contrasena correcta...');
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      console.log('Hash actualizado correctamente.');
    }

    // 3. Ensure user is approved
    if (!user.is_approved) {
      await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [user.id]);
      console.log('Usuario marcado como aprobado (is_approved = true).');
    }

    // 4. Ensure profile exists
    const profile = await pool.query('SELECT id, role FROM user_profiles WHERE id = $1', [user.id]);
    if (profile.rows.length === 0) {
      await pool.query(
        `INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo)
         VALUES ($1, 'Joel', 'Miranda', 'Administrator', 'IT / Direccion General', true)`,
        [user.id]
      );
      console.log('Perfil creado (faltaba).');
    } else {
      console.log('Perfil OK:', profile.rows[0]);
    }
  }

  console.log('\nListo. Intenta iniciar sesion de nuevo con:');
  console.log('  Email:', email);
  console.log('  Contrasena:', password);
  await pool.end();
}

checkAndFixAdmin().catch(err => {
  console.error('Error:', err.message);
  pool.end();
});

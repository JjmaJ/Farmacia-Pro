const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function reset() {
  await pool.query('DELETE FROM users');
  const hash = await bcrypt.hash('admin123', 10);
  const r = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ('admin@medicontrol.com', $1) RETURNING id",
    [hash]
  );
  await pool.query(
    "INSERT INTO user_profiles (id, first_name, last_name, role, department) VALUES ($1, 'Admin', 'System', 'Administrator', 'IT')",
    [r.rows[0].id]
  );
  console.log('Admin ready.');
  pool.end();
}

reset();

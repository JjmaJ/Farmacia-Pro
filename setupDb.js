import fs from 'fs';
import pool from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');

  try {
    console.log('Iniciando configuración de la base de datos...');
    await pool.query(sql);

    // Insertar el usuario administrador por defecto
    const checkUser = await pool.query("SELECT * FROM users WHERE email = 'admin@medicontrol.com'");
    if (checkUser.rows.length === 0) {
      const userIdRes = await pool.query(`
        INSERT INTO users (id, email, password_hash) 
        VALUES (gen_random_uuid(), 'admin@medicontrol.com', 'admin123')
        RETURNING id
      `);

      const userId = userIdRes.rows[0].id;

      await pool.query(`
        INSERT INTO user_profiles (id, first_name, last_name, role, department)
        VALUES ($1, 'Admin', 'System', 'Administrator', 'IT')
      `, [userId]);

      console.log('✅ Administrador insertado: admin@medicontrol.com / admin123');
    }

    console.log('✅ Esquema de base de datos creado exitosamente.');
  } catch (err) {
    console.error('❌ Error al ejecutar database.sql:', err.message);
  } finally {
    await pool.end();
  }
}

setupDatabase();

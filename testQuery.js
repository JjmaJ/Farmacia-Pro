import pool from './db.js';

async function performTestQuery() {
  console.log('Connecting to the PostgreSQL database...');
  try {
    // Basic test query
    const result = await pool.query('SELECT NOW() as current_time, current_user;');
    
    console.log('✅ Connection successful!');
    console.log('Result from DB:', result.rows[0]);
  } catch (err) {
    console.error('❌ Error connecting to the database or executing query:');
    console.error(err.message);
  } finally {
    console.log('Closing the database connection pool...');
    await pool.end();
  }
}

performTestQuery();

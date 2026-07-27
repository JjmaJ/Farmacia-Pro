const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
});

const medications = [
  { name: 'Acetaminofén', generic: 'Paracetamol', category: 'Analgésicos', presentation: 'Tabletas 500mg' },
  { name: 'Ibuprofeno', generic: 'Ibuprofeno', category: 'Analgésicos', presentation: 'Cápsulas 400mg' },
  { name: 'Amoxicilina', generic: 'Amoxicilina', category: 'Antibióticos', presentation: 'Cápsulas 500mg' },
  { name: 'Atorvastatina', generic: 'Atorvastatina', category: 'Cardiovascular', presentation: 'Tabletas 20mg' },
  { name: 'Metformina', generic: 'Metformina', category: 'Diabetes', presentation: 'Tabletas 850mg' },
  { name: 'Lisinopril', generic: 'Lisinopril', category: 'Cardiovascular', presentation: 'Tabletas 10mg' },
  { name: 'Levotiroxina', generic: 'Levotiroxina', category: 'Endocrino', presentation: 'Tabletas 100mcg' },
  { name: 'Amlodipino', generic: 'Amlodipino', category: 'Cardiovascular', presentation: 'Tabletas 5mg' },
  { name: 'Metoprolol', generic: 'Metoprolol', category: 'Cardiovascular', presentation: 'Tabletas 50mg' },
  { name: 'Omeprazol', generic: 'Omeprazol', category: 'Gastrointestinal', presentation: 'Cápsulas 20mg' },
  { name: 'Salbutamol', generic: 'Albuterol', category: 'Respiratorio', presentation: 'Inhalador 100mcg' },
  { name: 'Simvastatina', generic: 'Simvastatina', category: 'Cardiovascular', presentation: 'Tabletas 20mg' },
  { name: 'Losartán', generic: 'Losartán', category: 'Cardiovascular', presentation: 'Tabletas 50mg' },
  { name: 'Gabapentina', generic: 'Gabapentina', category: 'Neurológico', presentation: 'Cápsulas 300mg' },
  { name: 'Hidroclorotiazida', generic: 'Hidroclorotiazida', category: 'Cardiovascular', presentation: 'Tabletas 25mg' },
  { name: 'Sertralina', generic: 'Sertralina', category: 'Psicotrópicos', presentation: 'Tabletas 50mg' },
  { name: 'Montelukast', generic: 'Montelukast', category: 'Respiratorio', presentation: 'Tabletas 10mg' },
  { name: 'Fluticasona', generic: 'Fluticasona', category: 'Respiratorio', presentation: 'Spray Nasal' },
  { name: 'Amoxicilina/Clavulanato', generic: 'Amoxicilina + Ácido Clavulánico', category: 'Antibióticos', presentation: 'Tabletas 875/125mg' },
  { name: 'Furosemida', generic: 'Furosemida', category: 'Cardiovascular', presentation: 'Tabletas 40mg' },
  { name: 'Pantoprazol', generic: 'Pantoprazol', category: 'Gastrointestinal', presentation: 'Tabletas 40mg' },
  { name: 'Escitalopram', generic: 'Escitalopram', category: 'Psicotrópicos', presentation: 'Tabletas 10mg' },
  { name: 'Pravastatina', generic: 'Pravastatina', category: 'Cardiovascular', presentation: 'Tabletas 20mg' },
  { name: 'Bupropión', generic: 'Bupropión', category: 'Psicotrópicos', presentation: 'Tabletas 150mg' },
  { name: 'Rosuvastatina', generic: 'Rosuvastatina', category: 'Cardiovascular', presentation: 'Tabletas 10mg' },
  { name: 'Duloxetina', generic: 'Duloxetina', category: 'Psicotrópicos', presentation: 'Cápsulas 30mg' },
  { name: 'Meloxicam', generic: 'Meloxicam', category: 'Analgésicos', presentation: 'Tabletas 15mg' },
  { name: 'Quetiapina', generic: 'Quetiapina', category: 'Psicotrópicos', presentation: 'Tabletas 25mg' },
  { name: 'Venlafaxina', generic: 'Venlafaxina', category: 'Psicotrópicos', presentation: 'Cápsulas 75mg' },
  { name: 'Zolpidem', generic: 'Zolpidem', category: 'Psicotrópicos', presentation: 'Tabletas 10mg' },
  { name: 'Warfarina', generic: 'Warfarina', category: 'Cardiovascular', presentation: 'Tabletas 5mg' },
  { name: 'Prednisona', generic: 'Prednisona', category: 'Antiinflamatorios', presentation: 'Tabletas 5mg' },
  { name: 'Clopidogrel', generic: 'Clopidogrel', category: 'Cardiovascular', presentation: 'Tabletas 75mg' },
  { name: 'Azitromicina', generic: 'Azitromicina', category: 'Antibióticos', presentation: 'Tabletas 500mg' },
  { name: 'Tadalafilo', generic: 'Tadalafilo', category: 'Urología', presentation: 'Tabletas 20mg' },
  { name: 'Alprazolam', generic: 'Alprazolam', category: 'Psicotrópicos', presentation: 'Tabletas 0.5mg' },
  { name: 'Clonazepam', generic: 'Clonazepam', category: 'Psicotrópicos', presentation: 'Tabletas 2mg' },
  { name: 'Lorazepam', generic: 'Lorazepam', category: 'Psicotrópicos', presentation: 'Tabletas 1mg' },
  { name: 'Diazepam', generic: 'Diazepam', category: 'Psicotrópicos', presentation: 'Tabletas 5mg' },
  { name: 'Carvedilol', generic: 'Carvedilol', category: 'Cardiovascular', presentation: 'Tabletas 6.25mg' },
  { name: 'Tamsulosina', generic: 'Tamsulosina', category: 'Urología', presentation: 'Cápsulas 0.4mg' },
  { name: 'Atenolol', generic: 'Atenolol', category: 'Cardiovascular', presentation: 'Tabletas 50mg' },
  { name: 'Ciclobenzaprina', generic: 'Ciclobenzaprina', category: 'Relajantes', presentation: 'Tabletas 10mg' },
  { name: 'Metilprednisolona', generic: 'Metilprednisolona', category: 'Antiinflamatorios', presentation: 'Tabletas 4mg' },
  { name: 'Alopurinol', generic: 'Alopurinol', category: 'Gota', presentation: 'Tabletas 300mg' },
  { name: 'Hidrocodona/Acetaminofén', generic: 'Hidrocodona + Paracetamol', category: 'Analgésicos', presentation: 'Tabletas 5/325mg' },
  { name: 'Oxicodona', generic: 'Oxicodona', category: 'Analgésicos', presentation: 'Tabletas 10mg' },
  { name: 'Tramadol', generic: 'Tramadol', category: 'Analgésicos', presentation: 'Cápsulas 50mg' },
  { name: 'Insulina Glargina', generic: 'Insulina Glargina', category: 'Diabetes', presentation: 'Pluma Pre-cargada' },
  { name: 'Enoxaparina', generic: 'Enoxaparina', category: 'Cardiovascular', presentation: 'Inyectable 40mg' }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Iniciando siembra de medicamentos...');

    for (const med of medications) {
      // 1. Get or create category
      let categoryId;
      const catRes = await client.query('SELECT id FROM categories WHERE name = $1', [med.category]);
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
      } else {
        const newCat = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [med.category]);
        categoryId = newCat.rows[0].id;
      }

      // 2. Insert medication
      const code = `SEED-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const medRes = await client.query(
        'INSERT INTO medications (code, name, generic_name, presentation, unit, min_stock_level, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [code, med.name, med.generic, med.presentation, med.presentation, 20, categoryId]
      );
      const medId = medRes.rows[0].id;

      // 3. Insert initial batch
      const batchNum = `LOT-${Math.floor(Math.random() * 900) + 100}`;
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 2);

      await client.query(
        'INSERT INTO inventory_batches (medication_id, batch_number, expiration_date, quantity, unit_cost, supplier) VALUES ($1, $2, $3, $4, $5, $6)',
        [medId, batchNum, expDate, 100, 5.50, 'Proveedor General']
      );
    }

    await client.query('COMMIT');
    console.log('✅ 50 medicamentos y lotes insertados correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la siembra:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();

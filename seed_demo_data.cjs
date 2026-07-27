const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'medicontrol',
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

// Helper to generate random date within last N days
function getRandomDateInPastDays(maxDaysAgo, minDaysAgo = 0) {
  const now = new Date();
  const diffDays = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
  const hours = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM
  const minutes = Math.floor(Math.random() * 60);
  const date = new Date(now.getTime() - diffDays * 24 * 60 * 60 * 1000);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Helper to add future days to a date
function getFutureDate(daysInFuture) {
  const date = new Date();
  date.setDate(date.getDate() + daysInFuture);
  return date;
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🚀 Iniciando Carga Masiva de Datos Demo Multisede (Simulación 1 Mes)...');
    await client.query('BEGIN');

    // 1. Asegurar Sedes
    console.log('📦 1/8 Configurando Sedes...');
    const sucursalesData = [
      { nombre: 'Sede Principal', direccion: 'Hospital Central - Av. Principal Caracas', estado: 'activo' },
      { nombre: 'Sede Chacao', direccion: 'Clínica Municipal Chacao - Av. Francisco de Miranda', estado: 'activo' },
      { nombre: 'Sede Catia', direccion: 'Centro Clínico Catia - Av. España', estado: 'activo' }
    ];

    const sucursalMap = {};
    const sucursalList = [];
    for (const suc of sucursalesData) {
      let res = await client.query('SELECT id FROM sucursales WHERE nombre = $1', [suc.nombre]);
      let sucId;
      if (res.rows.length === 0) {
        res = await client.query(
          'INSERT INTO sucursales (nombre, direccion, estado) VALUES ($1, $2, $3) RETURNING id',
          [suc.nombre, suc.direccion, suc.estado]
        );
        sucId = res.rows[0].id;
      } else {
        sucId = res.rows[0].id;
      }
      sucursalMap[suc.nombre] = sucId;
      sucursalList.push({ id: sucId, nombre: suc.nombre });
    }

    const mainSucursalId = sucursalMap['Sede Principal'];
    const chacaoSucursalId = sucursalMap['Sede Chacao'];
    const catiaSucursalId = sucursalMap['Sede Catia'];

    // 2. Usuarios del sistema
    console.log('👥 2/8 Creando Usuarios y Roles...');
    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    const usersToCreate = [
      {
        email: 'joel.miranda2009@gmail.com',
        pass: await bcrypt.hash('jjma2001', 10),
        first_name: 'Joel',
        last_name: 'Miranda',
        role: 'Administrator',
        department: 'IT / Dirección General',
        can_access_alto_costo: true,
        sucursal_id: mainSucursalId
      },
      {
        email: 'dra.elena.mendoza@ivss.gob.ve',
        pass: defaultPasswordHash,
        first_name: 'Elena',
        last_name: 'Mendoza',
        role: 'Pharmacist',
        department: 'Farmacia Hospitalaria Central',
        can_access_alto_costo: true,
        sucursal_id: mainSucursalId
      },
      {
        email: 'carlos.ruiz@ivss.gob.ve',
        pass: defaultPasswordHash,
        first_name: 'Carlos',
        last_name: 'Ruiz',
        role: 'Warehouse_Keeper',
        department: 'Almacén de Insumos',
        can_access_alto_costo: false,
        sucursal_id: mainSucursalId
      },
      {
        email: 'dr.roberto.silva@ivss.gob.ve',
        pass: defaultPasswordHash,
        first_name: 'Roberto',
        last_name: 'Silva',
        role: 'Doctor',
        department: 'Oncología Médica - Chacao',
        can_access_alto_costo: true,
        sucursal_id: chacaoSucursalId
      },
      {
        email: 'lic.maria.torres@ivss.gob.ve',
        pass: defaultPasswordHash,
        first_name: 'María',
        last_name: 'Torres',
        role: 'Nurse',
        department: 'Servicio de Urgencias - Catia',
        can_access_alto_costo: false,
        sucursal_id: catiaSucursalId
      }
    ];

    const userMap = {};
    for (const u of usersToCreate) {
      let userRes = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      let userId;
      if (userRes.rows.length === 0) {
        const newUser = await client.query(
          'INSERT INTO users (email, password_hash, is_approved) VALUES ($1, $2, true) RETURNING id',
          [u.email, u.pass]
        );
        userId = newUser.rows[0].id;
      } else {
        userId = userRes.rows[0].id;
      }
      userMap[u.email] = userId;

      await client.query(
        `INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           role = EXCLUDED.role,
           department = EXCLUDED.department,
           can_access_alto_costo = EXCLUDED.can_access_alto_costo,
           sucursal_id = EXCLUDED.sucursal_id`,
        [userId, u.first_name, u.last_name, u.role, u.department, u.can_access_alto_costo, u.sucursal_id]
      );
    }

    const adminUserId = userMap['joel.miranda2009@gmail.com'];
    const pharmacistUserId = userMap['dra.elena.mendoza@ivss.gob.ve'];
    const warehouseUserId = userMap['carlos.ruiz@ivss.gob.ve'];

    // 3. Categorías
    console.log('🏷️ 3/8 Configurando Categorías...');
    const categoriesData = [
      { name: 'Analgésicos y Antiinflamatorios', desc: 'Control del dolor y fiebre' },
      { name: 'Antibióticos y Antiinfecciosos', desc: 'Tratamiento de infecciones bacterianas' },
      { name: 'Gastrointestinales', desc: 'Protectores gástricos y digestivos' },
      { name: 'Cardiovascular', desc: 'Antihipertensivos y antiarrítmicos' },
      { name: 'Diabetes y Endocrino', desc: 'Insulinas e hipoglucemiantes' },
      { name: 'Respiratorio', desc: 'Broncodilatadores y antiasmáticos' },
      { name: 'Soluciones e Inyectables', desc: 'Soluciones parenterales y sueros' },
      { name: 'Oncológicos (Alto Costo)', desc: 'Tratamientos quimioterapéuticos y anticuerpos monoclonales' },
      { name: 'Inmunosupresores (Alto Costo)', desc: 'Biológicos y control de enfermedades autoinmunes' }
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      let res = await client.query('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (res.rows.length === 0) {
        res = await client.query(
          'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
          [cat.name, cat.desc]
        );
      }
      categoryMap[cat.name] = res.rows[0].id;
    }

    // 4. Medicamentos (20 Frecuentes + 10 Alto Costo)
    console.log('💊 4/8 Insertando Catálogo de Medicamentos (30 Ítems)...');
    const medicationsData = [
      // 20 Medicamentos Frecuentes
      { code: 'MED-001', name: 'Acetaminofén (Paracetamol)', generic: 'Paracetamol', presentation: 'Tabletas 500mg', unit: 'Caja x 20 Tab', category: 'Analgésicos y Antiinflamatorios', min_stock: 100 },
      { code: 'MED-002', name: 'Ibuprofeno', generic: 'Ibuprofeno', presentation: 'Tabletas 400mg', unit: 'Caja x 30 Tab', category: 'Analgésicos y Antiinflamatorios', min_stock: 80 },
      { code: 'MED-003', name: 'Ketoprofeno Inyectable', generic: 'Ketoprofeno', presentation: 'Ampollas 100mg/2ml', unit: 'Caja x 5 Amp', category: 'Analgésicos y Antiinflamatorios', min_stock: 50 },
      { code: 'MED-004', name: 'Amoxicilina + Ácido Clavulánico', generic: 'Amoxicilina / Clavulanato', presentation: 'Tabletas 875/125mg', unit: 'Caja x 14 Tab', category: 'Antibióticos y Antiinfecciosos', min_stock: 60 },
      { code: 'MED-005', name: 'Ciprofloxacina', generic: 'Ciprofloxacino', presentation: 'Tabletas 500mg', unit: 'Caja x 10 Tab', category: 'Antibióticos y Antiinfecciosos', min_stock: 50 },
      { code: 'MED-006', name: 'Ceftriaxona Inyectable', generic: 'Ceftriaxona Sódica', presentation: 'Vial I.V. 1g', unit: 'Caja x 1 Vial', category: 'Antibióticos y Antiinfecciosos', min_stock: 40 },
      { code: 'MED-007', name: 'Azitromicina', generic: 'Azitromicina', presentation: 'Tabletas 500mg', unit: 'Caja x 3 Tab', category: 'Antibióticos y Antiinfecciosos', min_stock: 50 },
      { code: 'MED-008', name: 'Omeprazol', generic: 'Omeprazol', presentation: 'Cápsulas 20mg', unit: 'Caja x 28 Cáp', category: 'Gastrointestinales', min_stock: 100 },
      { code: 'MED-009', name: 'Pantoprazol', generic: 'Pantoprazol', presentation: 'Tabletas 40mg', unit: 'Caja x 14 Tab', category: 'Gastrointestinales', min_stock: 40 },
      { code: 'MED-010', name: 'Losartán Potásico', generic: 'Losartán', presentation: 'Tabletas 50mg', unit: 'Caja x 30 Tab', category: 'Cardiovascular', min_stock: 90 },
      { code: 'MED-011', name: 'Amlodipino', generic: 'Amlodipino', presentation: 'Tabletas 10mg', unit: 'Caja x 30 Tab', category: 'Cardiovascular', min_stock: 70 },
      { code: 'MED-012', name: 'Enalapril', generic: 'Enalapril Maleato', presentation: 'Tabletas 20mg', unit: 'Caja x 30 Tab', category: 'Cardiovascular', min_stock: 60 },
      { code: 'MED-013', name: 'Metformina', generic: 'Metformina Clorhidrato', presentation: 'Tabletas 850mg', unit: 'Caja x 30 Tab', category: 'Diabetes y Endocrino', min_stock: 120 },
      { code: 'MED-014', name: 'Insulina NPH Humana', generic: 'Insulina Humana NPH', presentation: 'Vial 100 UI/ml (10ml)', unit: 'Frasco Vial', category: 'Diabetes y Endocrino', min_stock: 25 },
      { code: 'MED-015', name: 'Salbutamol Inhalador', generic: 'Salbutamol Albuterol', presentation: 'Aerosol 100mcg/dosis', unit: 'Inhalador 200 dosis', category: 'Respiratorio', min_stock: 35 },
      { code: 'MED-016', name: 'Dexametasona Inyectable', generic: 'Dexametasona Fosfato', presentation: 'Ampollas 4mg/1ml', unit: 'Caja x 10 Amp', category: 'Respiratorio', min_stock: 45 },
      { code: 'MED-017', name: 'Solución Fisiológica 0.9%', generic: 'Cloruro de Sodio 0.9%', presentation: 'Bolsa Infusión 500ml', unit: 'Bolsa Flexible', category: 'Soluciones e Inyectables', min_stock: 150 },
      { code: 'MED-018', name: 'Solución Ringer Lactato', generic: 'Ringer Lactato Solución', presentation: 'Bolsa Infusión 500ml', unit: 'Bolsa Flexible', category: 'Soluciones e Inyectables', min_stock: 100 },
      { code: 'MED-019', name: 'Tramadol Inyectable', generic: 'Tramadol Clorhidrato', presentation: 'Ampollas 50mg/1ml', unit: 'Caja x 5 Amp', category: 'Analgésicos y Antiinflamatorios', min_stock: 30 },
      { code: 'MED-020', name: 'Diclofenac Sódico', generic: 'Diclofenac', presentation: 'Ampollas 75mg/3ml', unit: 'Caja x 5 Amp', category: 'Analgésicos y Antiinflamatorios', min_stock: 50 },

      // 10 Medicamentos de Alto Costo
      { code: 'AC-001', name: 'Rituximab 500mg', generic: 'Rituximab (Anticuerpo Monoclonal)', presentation: 'Frasco Vial 500mg/50ml', unit: 'Frasco Vial I.V.', category: 'Oncológicos (Alto Costo)', min_stock: 10 },
      { code: 'AC-002', name: 'Trastuzumab 440mg', generic: 'Trastuzumab', presentation: 'Frasco Vial Liofilizado 440mg', unit: 'Frasco Vial', category: 'Oncológicos (Alto Costo)', min_stock: 8 },
      { code: 'AC-003', name: 'Bevacizumab 400mg', generic: 'Bevacizumab', presentation: 'Frasco Vial 400mg/16ml', unit: 'Frasco Vial', category: 'Oncológicos (Alto Costo)', min_stock: 6 },
      { code: 'AC-004', name: 'Pembrolizumab 100mg', generic: 'Pembrolizumab (Keytruda)', presentation: 'Frasco Vial 100mg/4ml', unit: 'Frasco Vial', category: 'Oncológicos (Alto Costo)', min_stock: 5 },
      { code: 'AC-005', name: 'Infliximab 100mg', generic: 'Infliximab (Remicade)', presentation: 'Frasco Vial Liofilizado 100mg', unit: 'Frasco Vial', category: 'Inmunosupresores (Alto Costo)', min_stock: 12 },
      { code: 'AC-006', name: 'Tacrolimus 1mg', generic: 'Tacrolimus (Prograf)', presentation: 'Cápsulas 1mg', unit: 'Caja x 50 Cáp', category: 'Inmunosupresores (Alto Costo)', min_stock: 15 },
      { code: 'AC-007', name: 'Adalimumab 40mg', generic: 'Adalimumab (Humira)', presentation: 'Pluma Pre-llenada 40mg/0.8ml', unit: 'Caja x 2 Plumas', category: 'Inmunosupresores (Alto Costo)', min_stock: 10 },
      { code: 'AC-008', name: 'Epoetina Alfa 4000 UI', generic: 'Eritropoyetina Humana', presentation: 'Jeringa Pre-llenada 4000 UI', unit: 'Caja x 6 Jeringas', category: 'Inmunosupresores (Alto Costo)', min_stock: 20 },
      { code: 'AC-009', name: 'Filgrastim 300mcg', generic: 'Filgrastim (Neupogen)', presentation: 'Jeringa Pre-llenada 300mcg/0.5ml', unit: 'Caja x 5 Jeringas', category: 'Oncológicos (Alto Costo)', min_stock: 15 },
      { code: 'AC-010', name: 'Bortezomib 3.5mg', generic: 'Bortezomib (Velcade)', presentation: 'Frasco Vial Liofilizado 3.5mg', unit: 'Frasco Vial', category: 'Oncológicos (Alto Costo)', min_stock: 6 }
    ];

    const medicationMap = {};
    for (const m of medicationsData) {
      const catId = categoryMap[m.category];
      let res = await client.query('SELECT id FROM medications WHERE code = $1', [m.code]);
      let medId;
      if (res.rows.length === 0) {
        res = await client.query(
          `INSERT INTO medications (code, name, generic_name, presentation, unit, min_stock_level, category_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [m.code, m.name, m.generic, m.presentation, m.unit, m.min_stock, catId]
        );
        medId = res.rows[0].id;
      } else {
        medId = res.rows[0].id;
        await client.query(
          `UPDATE medications SET name = $1, generic_name = $2, presentation = $3, unit = $4, min_stock_level = $5, category_id = $6 WHERE id = $7`,
          [m.name, m.generic, m.presentation, m.unit, m.min_stock, catId, medId]
        );
      }
      medicationMap[m.code] = { id: medId, name: m.name, code: m.code };
    }

    // 5. Lotes e Inventario (Distribuidos en las 3 Sedes)
    console.log('📦 5/8 Generando Lotes de Inventario Multisede (Principal, Chacao, Catia)...');
    
    // Clear previous demo batches & movements to build a clean set
    await client.query('DELETE FROM inventory_movements');
    await client.query('DELETE FROM inventory_batches');

    const createdBatches = [];

    const batchSpecs = [
      // Sede Principal
      { code: 'MED-001', batch: 'LOT-2026-ACET-01', qty: 450, cost: 2.10, expDays: 365, supplier: 'Droguería Nena C.A.', loc: 'Estante A-1', sucId: mainSucursalId },
      { code: 'MED-001', batch: 'LOT-2026-ACET-02', qty: 200, cost: 2.10, expDays: 180, supplier: 'Laboratorios Calox International', loc: 'Estante A-1', sucId: mainSucursalId },
      { code: 'MED-002', batch: 'LOT-2026-IBU-01', qty: 320, cost: 3.50, expDays: 240, supplier: 'FarmaSANO Venezuela', loc: 'Estante A-2', sucId: mainSucursalId },
      { code: 'MED-003', batch: 'LOT-2026-KETO-01', qty: 150, cost: 5.80, expDays: 400, supplier: 'Laboratorios Leti C.A.', loc: 'Estante A-3', sucId: mainSucursalId },
      { code: 'MED-004', batch: 'LOT-2026-AMX-01', qty: 180, cost: 8.90, expDays: 300, supplier: 'Droguería Behrens', loc: 'Estante B-1', sucId: mainSucursalId },
      { code: 'MED-005', batch: 'LOT-2026-CIPRO-CRITICO', qty: 15, cost: 6.40, expDays: 20, supplier: 'Droguería Nena C.A.', loc: 'Estante B-2', sucId: mainSucursalId },
      { code: 'MED-006', batch: 'LOT-2026-CEFT-01', qty: 28, cost: 12.50, expDays: 25, supplier: 'Laboratorios Leti C.A.', loc: 'Refrigerador R-1', sucId: mainSucursalId },
      { code: 'MED-008', batch: 'LOT-2026-OMEP-01', qty: 600, cost: 4.20, expDays: 500, supplier: 'Droguería Behrens', loc: 'Estante C-1', sucId: mainSucursalId },
      { code: 'MED-010', batch: 'LOT-2026-LOSA-01', qty: 400, cost: 3.80, expDays: 420, supplier: 'Laboratorios Calox International', loc: 'Estante D-1', sucId: mainSucursalId },
      { code: 'MED-013', batch: 'LOT-2026-METF-01', qty: 550, cost: 4.50, expDays: 450, supplier: 'Droguería Nena C.A.', loc: 'Estante E-1', sucId: mainSucursalId },
      { code: 'MED-014', batch: 'LOT-2026-INSU-VENC', qty: 12, cost: 18.00, expDays: 12, supplier: 'Laboratorios Leti C.A.', loc: 'Cava Refrigerada 1', sucId: mainSucursalId },
      { code: 'MED-017', batch: 'LOT-2026-SOL-FIS-01', qty: 850, cost: 1.80, expDays: 600, supplier: 'Droguería Vargas', loc: 'Almacén Central Palet 1', sucId: mainSucursalId },
      { code: 'MED-019', batch: 'LOT-2026-TRAM-01', qty: 45, cost: 7.20, expDays: 18, supplier: 'Droguería Behrens', loc: 'Gabinete Controlado A', sucId: mainSucursalId },
      { code: 'AC-001', batch: 'LOT-2026-RITUX-01', qty: 25, cost: 850.00, expDays: 280, supplier: 'Droguería Especializada IVSS', loc: 'Cava de Biológicos - Pos. 01', sucId: mainSucursalId },
      { code: 'AC-002', batch: 'LOT-2026-TRAST-01', qty: 18, cost: 1200.00, expDays: 300, supplier: 'Droguería Especializada IVSS', loc: 'Cava de Biológicos - Pos. 02', sucId: mainSucursalId },
      { code: 'AC-005', batch: 'LOT-2026-INFLI-01', qty: 30, cost: 620.00, expDays: 340, supplier: 'Droguería Especializada IVSS', loc: 'Cava de Biológicos - Pos. 05', sucId: mainSucursalId },

      // Sede Chacao
      { code: 'MED-001', batch: 'LOT-2026-ACET-CHA', qty: 250, cost: 2.10, expDays: 320, supplier: 'Droguería Nena C.A.', loc: 'Estante 1 - Chacao', sucId: chacaoSucursalId },
      { code: 'MED-004', batch: 'LOT-2026-AMX-CHA', qty: 95, cost: 8.90, expDays: 280, supplier: 'Droguería Behrens', loc: 'Estante 2 - Chacao', sucId: chacaoSucursalId },
      { code: 'MED-007', batch: 'LOT-2026-AZIT-CHA', qty: 18, cost: 7.80, expDays: 140, supplier: 'FarmaSANO Venezuela', loc: 'Estante 3 - Chacao', sucId: chacaoSucursalId }, // <50u
      { code: 'MED-011', batch: 'LOT-2026-AMLO-CHA', qty: 180, cost: 2.90, expDays: 360, supplier: 'FarmaSANO Venezuela', loc: 'Estante 4 - Chacao', sucId: chacaoSucursalId },
      { code: 'MED-015', batch: 'LOT-2026-SALB-CHA', qty: 65, cost: 9.50, expDays: 290, supplier: 'FarmaSANO Venezuela', loc: 'Estante 5 - Chacao', sucId: chacaoSucursalId },
      { code: 'MED-018', batch: 'LOT-2026-RING-CHA', qty: 340, cost: 2.10, expDays: 520, supplier: 'Droguería Vargas', loc: 'Almacén Chacao - Palet 1', sucId: chacaoSucursalId },
      { code: 'AC-003', batch: 'LOT-2026-BEVAC-CHA', qty: 12, cost: 980.00, expDays: 210, supplier: 'Droguería Especializada IVSS', loc: 'Cava Chacao - Pos. 01', sucId: chacaoSucursalId },
      { code: 'AC-006', batch: 'LOT-2026-TACRO-CHA', qty: 35, cost: 150.00, expDays: 410, supplier: 'Droguería Especializada IVSS', loc: 'Gabinete Especial Chacao', sucId: chacaoSucursalId },
      { code: 'AC-007', batch: 'LOT-2026-ADALI-CHA', qty: 15, cost: 780.00, expDays: 230, supplier: 'Droguería Especializada IVSS', loc: 'Cava Chacao - Pos. 02', sucId: chacaoSucursalId },

      // Sede Catia
      { code: 'MED-002', batch: 'LOT-2026-IBU-CAT', qty: 210, cost: 3.50, expDays: 220, supplier: 'FarmaSANO Venezuela', loc: 'Estante 1 - Catia', sucId: catiaSucursalId },
      { code: 'MED-003', batch: 'LOT-2026-KETO-CAT', qty: 85, cost: 5.80, expDays: 380, supplier: 'Laboratorios Leti C.A.', loc: 'Estante 2 - Catia', sucId: catiaSucursalId },
      { code: 'MED-009', batch: 'LOT-2026-PANT-CAT', qty: 75, cost: 6.10, expDays: 300, supplier: 'Droguería Nena C.A.', loc: 'Estante 3 - Catia', sucId: catiaSucursalId },
      { code: 'MED-012', batch: 'LOT-2026-ENAL-CAT', qty: 140, cost: 3.10, expDays: 270, supplier: 'Droguería Behrens', loc: 'Estante 4 - Catia', sucId: catiaSucursalId },
      { code: 'MED-016', batch: 'LOT-2026-DEXA-CAT', qty: 110, cost: 4.00, expDays: 340, supplier: 'Laboratorios Calox International', loc: 'Estante 5 - Catia', sucId: catiaSucursalId },
      { code: 'MED-017', batch: 'LOT-2026-SOL-FIS-CAT', qty: 420, cost: 1.80, expDays: 560, supplier: 'Droguería Vargas', loc: 'Almacén Catia - Palet 1', sucId: catiaSucursalId },
      { code: 'MED-020', batch: 'LOT-2026-DICL-CAT', qty: 160, cost: 3.40, expDays: 330, supplier: 'Laboratorios Leti C.A.', loc: 'Estante 6 - Catia', sucId: catiaSucursalId },
      { code: 'AC-004', batch: 'LOT-2026-PEMBRO-CAT', qty: 6, cost: 2400.00, expDays: 180, supplier: 'Droguería Especializada IVSS', loc: 'Cava Catia - Pos. 01', sucId: catiaSucursalId },
      { code: 'AC-008', batch: 'LOT-2026-EPOET-CAT', qty: 45, cost: 45.00, expDays: 270, supplier: 'Droguería Especializada IVSS', loc: 'Cava Catia - Pos. 02', sucId: catiaSucursalId },
      { code: 'AC-009', batch: 'LOT-2026-FILGR-CAT', qty: 30, cost: 65.00, expDays: 310, supplier: 'Droguería Especializada IVSS', loc: 'Cava Catia - Pos. 03', sucId: catiaSucursalId },
      { code: 'AC-010', batch: 'LOT-2026-BORTE-CAT', qty: 8, cost: 1100.00, expDays: 200, supplier: 'Droguería Especializada IVSS', loc: 'Cava Catia - Pos. 04', sucId: catiaSucursalId }
    ];

    for (const b of batchSpecs) {
      const med = medicationMap[b.code];
      const expDate = getFutureDate(b.expDays);
      const res = await client.query(
        `INSERT INTO inventory_batches
         (medication_id, batch_number, expiration_date, quantity, unit_cost, supplier, location, sucursal_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING id`,
        [med.id, b.batch, expDate, b.qty, b.cost, b.supplier, b.loc, b.sucId]
      );
      createdBatches.push({ id: res.rows[0].id, code: b.code, batch: b.batch, qty: b.qty, sucId: b.sucId });
    }

    // 6. Histórico de Movimientos (Últimos 30 Días Multisede)
    console.log('🔄 6/8 Generando Histórico de Transacciones Multisede de los Últimos 30 Días...');
    
    const destinations = [
      'Emergencia Adultos - Cubículo 4',
      'Unidad de Cuidados Intensivos (UCI)',
      'Quirófano Central - Sala 2',
      'Piso 3 - Pediatría Médica',
      'Servicio de Oncología Día',
      'Farmacia Interna de Guardia',
      'Consulta Externa de Cardiología',
      'Hospitalización Medicina Interna'
    ];

    const reasonsOut = [
      'Despacho para orden médica de paciente ingresado',
      'Suministro diario de stock de piso',
      'Atención de emergencia hospitalaria',
      'Administración de tratamiento esquematizado',
      'Traspaso a farmacia ambulatoria'
    ];

    // Generate 60 movements spread across past 30 days and all 3 sedes
    for (let i = 0; i < 60; i++) {
      const batchObj = createdBatches[i % createdBatches.length];
      const daysAgo = Math.floor((60 - i) * (30 / 60)); // Distributed from day 30 ago to today
      const date = getRandomDateInPastDays(daysAgo, Math.max(0, daysAgo - 1));

      let type, qty, reason, dest, user;
      const randType = Math.random();

      if (randType < 0.25) {
        // Entry / Purchase
        type = 'in';
        qty = Math.floor(Math.random() * 200) + 50;
        reason = 'Recepción de orden de compra programada';
        dest = 'Almacén Central de Recepción';
        user = warehouseUserId;
      } else if (randType < 0.90) {
        // Dispatch / Delivery
        type = 'out';
        qty = Math.floor(Math.random() * 20) + 2;
        reason = reasonsOut[Math.floor(Math.random() * reasonsOut.length)];
        dest = destinations[Math.floor(Math.random() * destinations.length)];
        user = pharmacistUserId;
      } else if (randType < 0.96) {
        // Adjustment / Damage
        type = 'adjustment';
        qty = -1 * (Math.floor(Math.random() * 3) + 1);
        reason = 'Ajuste por merma accidental / rotura de frasco ampolla en transporte';
        dest = 'Área de Desincorporación';
        user = pharmacistUserId;
      } else {
        // Return
        type = 'return';
        qty = Math.floor(Math.random() * 5) + 1;
        reason = 'Devolución de sobrante por alta médica de paciente';
        dest = 'Farmacia Central';
        user = warehouseUserId;
      }

      await client.query(
        `INSERT INTO inventory_movements
         (batch_id, type, quantity, reason, reference_document, performed_by, destination, sucursal_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          batchObj.id,
          type,
          qty,
          reason,
          `DOC-IVSS-${2026000 + i}`,
          user,
          dest,
          batchObj.sucId,
          date
        ]
      );
    }

    // 7. Pacientes y Despachos de Alto Costo (Multisede)
    console.log('🩺 7/8 Generando Fichas de Pacientes y Despachos de Alto Costo por Sede...');

    // Clean previous high cost patients & dispatches
    await client.query('DELETE FROM historial_despachos_alto_costo');
    await client.query('DELETE FROM pacientes_alto_costo');

    const highCostPatients = [
      { doc: 'V-14.892.301', name: 'María Alejandra Benítez', cod: 'AUT-IVSS-2026-901', ciclos: 6, entregados: 4, estado: 'activo', sucId: mainSucursalId },
      { doc: 'V-11.450.922', name: 'José Luis Rodríguez', cod: 'AUT-IVSS-2026-902', ciclos: 8, entregados: 6, estado: 'activo', sucId: chacaoSucursalId },
      { doc: 'V-16.780.114', name: 'Carmen Rosa Mendoza', cod: 'AUT-IVSS-2026-903', ciclos: 6, entregados: 6, estado: 'completado', sucId: mainSucursalId },
      { doc: 'V-09.340.551', name: 'Carlos Eduardo Gutiérrez', cod: 'AUT-IVSS-2026-904', ciclos: 12, entregados: 2, estado: 'activo', sucId: catiaSucursalId },
      { doc: 'V-19.200.418', name: 'Ana Patricia Colmenares', cod: 'AUT-IVSS-2026-905', ciclos: 6, entregados: 1, estado: 'activo', sucId: chacaoSucursalId },
      { doc: 'V-13.654.890', name: 'Roberto Antonio Morales', cod: 'AUT-IVSS-2026-906', ciclos: 8, entregados: 3, estado: 'activo', sucId: catiaSucursalId }
    ];

    const rituximabMed = medicationMap['AC-001'];
    const trastuzumabMed = medicationMap['AC-002'];
    const pembrolizumabMed = medicationMap['AC-004'];
    const tacrolimusMed = medicationMap['AC-006'];

    for (let pIdx = 0; pIdx < highCostPatients.length; pIdx++) {
      const p = highCostPatients[pIdx];
      const pRes = await client.query(
        `INSERT INTO pacientes_alto_costo
         (documento_identidad, nombre_completo, codigo_autorizacion, ciclos_totales, ciclos_entregados, estado, sucursal_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [p.doc, p.name, p.cod, p.ciclos, p.entregados, p.estado, p.sucId, getRandomDateInPastDays(28, 25)]
      );

      const pacienteId = pRes.rows[0].id;
      const assignedMed = [rituximabMed, trastuzumabMed, pembrolizumabMed, tacrolimusMed][pIdx % 4];

      // Add historical dispatches for delivered cycles
      for (let c = 1; c <= p.entregados; c++) {
        const dispatchDate = getRandomDateInPastDays(Math.max(1, 28 - c * 6), Math.max(0, 26 - c * 6));
        await client.query(
          `INSERT INTO historial_despachos_alto_costo
           (paciente_id, medication_id, batch_number, cantidad, user_id, fecha_entrega, notas, sucursal_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            pacienteId,
            assignedMed.id,
            `LOT-2026-AC-${pIdx + 1}`,
            1,
            pharmacistUserId,
            dispatchDate,
            `Despacho autorizado del Ciclo ${c} de ${p.ciclos} para tratamiento con ${assignedMed.name}`,
            p.sucId
          ]
        );
      }
    }

    // 8. Tareas y Registros de Auditoría
    console.log('📋 8/8 Creando Tareas del Sistema y Registros de Auditoría del Último Mes...');

    // Clean previous tasks & audit logs
    await client.query('DELETE FROM tareas');
    await client.query('DELETE FROM audit_logs');

    const tasksList = [
      { title: 'Auditoría mensual de lotes de Alto Costo (Rituximab / Trastuzumab)', desc: 'Verificar inventario físico vs sistema con el comisionado del IVSS', comp: true, daysAgo: 25 },
      { title: 'Conteo físico y control de insulinas en cava refrigerada', desc: 'Confirmar cadena de frío entre 2°C y 8°C y registrar planilla de control', comp: true, daysAgo: 20 },
      { title: 'Fumigación y sanitización semestral de estantes A y B en Sede Chacao', desc: 'Mantenimiento preventivo del área de almacenamiento de fármacos orales', comp: true, daysAgo: 15 },
      { title: 'Reporte consolidado de consumo mensual para Dirección Médica', desc: 'Generar reporte PDF con membrete oficial IVSS de las 3 sedes', comp: true, daysAgo: 10 },
      { title: 'Verificación de vencimientos próximos en Sede Principal y Catia', desc: 'Revisión en sistema de Ciprofloxacina y Ceftriaxona', comp: true, daysAgo: 5 },
      { title: 'Recepción y validación de pedido de la Droguería Especializada IVSS', desc: 'Ingresar nuevos lotes de Pembrolizumab y Tacrolimus', comp: false, daysAgo: 3 },
      { title: 'Reorganización de soluciones parenterales (Fisiológica 0.9%)', desc: 'Disponer palet 3 en el almacén principal', comp: false, daysAgo: 2 },
      { title: 'Actualización de expedientes digitales de pacientes de Alto Costo', desc: 'Revisar autorizaciones de ciclos vencidos', comp: false, daysAgo: 1 },
      { title: 'Capacitación del personal sobre el módulo de Control de Entregas', desc: 'Inducción al nuevo personal sanitario sobre el sistema MediControl Pro', comp: false, daysAgo: 0 }
    ];

    for (const t of tasksList) {
      await client.query(
        `INSERT INTO tareas (titulo, descripcion, completada, fecha_creacion, user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [t.title, t.desc, t.comp, getRandomDateInPastDays(t.daysAgo, t.daysAgo), adminUserId]
      );
    }

    // Insert 35 Realistic Audit Log Actions across past 30 days
    const auditActions = [
      { action: 'USER_LOGIN', entity: 'AUTH', details: { email: 'joel.miranda2009@gmail.com', role: 'Administrator', sucursal: 'Sede Principal' }, user: adminUserId },
      { action: 'USER_LOGIN', entity: 'AUTH', details: { email: 'dr.roberto.silva@ivss.gob.ve', role: 'Doctor', sucursal: 'Sede Chacao' }, user: userMap['dr.roberto.silva@ivss.gob.ve'] },
      { action: 'STOCK_ENTRY', entity: 'INVENTORY', details: { medication: 'Rituximab 500mg', batch: 'LOT-2026-RITUX-01', quantity: 25, supplier: 'Droguería Especializada' }, user: warehouseUserId },
      { action: 'DESPACHO', entity: 'DELIVERY', details: { medication: 'Acetaminofén 500mg', quantity: 50, destination: 'Emergencia Adultos' }, user: pharmacistUserId },
      { action: 'ALTO_COSTO_DESPACHO', entity: 'ALTO_COSTO', details: { paciente: 'María Alejandra Benítez', ciclo: 'Ciclo 4 de 6', medication: 'Rituximab 500mg' }, user: pharmacistUserId },
      { action: 'PACIENTE_REGISTRO', entity: 'ALTO_COSTO', details: { paciente: 'Ana Patricia Colmenares', cedula: 'V-19.200.418', ciclos_totales: 6 }, user: adminUserId },
      { action: 'STOCK_ADJUSTMENT', entity: 'INVENTORY', details: { medication: 'Ketoprofeno 100mg', quantity: -2, reason: 'Rotura accidental' }, user: pharmacistUserId },
      { action: 'CONFIG_UPDATE', entity: 'SETTINGS', details: { setting: 'threshold_days', value: 30, updated_by: 'Joel Miranda' }, user: adminUserId },
      { action: 'USER_LOGIN', entity: 'AUTH', details: { email: 'carlos.ruiz@ivss.gob.ve', role: 'Warehouse_Keeper', sucursal: 'Sede Principal' }, user: warehouseUserId },
      { action: 'REPORT_GENERATE', entity: 'REPORTS', details: { report_type: 'Consolidado Mensual PDF IVSS', format: 'PDF' }, user: adminUserId }
    ];

    for (let i = 0; i < 35; i++) {
      const act = auditActions[i % auditActions.length];
      const daysAgo = Math.floor((35 - i) * (30 / 35));
      const logDate = getRandomDateInPastDays(daysAgo, Math.max(0, daysAgo - 1));

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [act.user, act.action, act.entity, JSON.stringify(act.details), '192.168.1.105', logDate]
      );
    }

    await client.query('COMMIT');
    console.log('✨ ¡Carga Inicial de Datos Demo Multisede Completada Exitosamente!');
    console.log('📊 Resumen cargado:');
    console.log('   - 3 Sedes Activas (Sede Principal, Sede Chacao, Sede Catia)');
    console.log('   - 5 Usuarios con diferentes roles asignados a sedes');
    console.log('   - 30 Medicamentos (20 de consumo masivo + 10 de Alto Costo)');
    console.log('   - 36 Lotes distribuidos entre las 3 sedes');
    console.log('   - 60 Movimientos de inventario registrados en las 3 sedes');
    console.log('   - 6 Pacientes de Alto Costo con historial de despachos por sede');
    console.log('   - 9 Tareas del sistema');
    console.log('   - 35 Eventos de auditoría de actividad');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la carga de datos demo:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

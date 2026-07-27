const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-medicontrol-key';

// === HELMET SECURITY HEADERS ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://*.supabase.co", "https://media.giphy.com", "https://media4.giphy.com"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "https://*.supabase.co", "https://*.vercel.app", "https://*.onrender.com"],
    },
  },
}));

// === RATE LIMITING ===
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Increased limit per window for single-page app activity
  message: { error: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Never rate limit CORS preflight requests
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 login attempts per window
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// CORS configuration to allow credentials, all HTTP methods and headers for local development & Vercel deployment origins
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(.*\.vercel\.app|localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback allow in dev
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));
app.options(/.*/, cors()); // Enable pre-flight CORS for all routes (Express 5 compatible)
app.use(express.json());

// Database Pool (Using same env vars as db.js)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

// Nodemailer SMTP Transporter
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // false for port 587 (STARTTLS), true for 465 (SSL)
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certs in dev environment
  },
  requireTLS: process.env.SMTP_SECURE !== 'true', // Require STARTTLS for port 587
});

// Ensure Super Admin user exists in DB
async function ensureSuperAdminExists() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return;
  try {
    const res = await pool.query('SELECT id FROM users WHERE email = $1', [superAdminEmail]);
    let userId;
    if (res.rows.length === 0) {
      console.log(`[Startup] Super Admin ${superAdminEmail} not found in DB. Creating...`);
      const fixedId = 'bb000000-0000-0000-0000-000000000002';
      await pool.query(
        "INSERT INTO users (id, email, password_hash, is_approved) VALUES ($1, $2, $3, true) ON CONFLICT (email) DO NOTHING",
        [fixedId, superAdminEmail, process.env.SUPER_ADMIN_PASSWORD || 'jjma2001']
      );
      userId = fixedId;
    } else {
      userId = res.rows[0].id;
    }

    // Ensure the profile exists
    const profileRes = await pool.query('SELECT id FROM user_profiles WHERE id = $1', [userId]);
    if (profileRes.rows.length === 0) {
      // Find a sucursal to associate (e.g. Sede Principal or first available)
      const sucRes = await pool.query("SELECT id FROM sucursales ORDER BY created_at ASC LIMIT 1");
      const sucursalId = sucRes.rows.length > 0 ? sucRes.rows[0].id : null;
      
      await pool.query(
        `INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id) 
         VALUES ($1, 'Joel', 'Miranda', 'Administrator', 'IT/Dirección', true, $2)`,
        [userId, sucursalId]
      );
      console.log(`[Startup] Profile for Super Admin ${superAdminEmail} successfully created.`);
    }
  } catch (err) {
    console.error('[Startup] Error ensuring Super Admin exists:', err);
  }
}
ensureSuperAdminExists();

// === UPLOADS CONFIGURATION ===
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve static files securely with sandbox CSP and no-sniff headers
app.use('/uploads', express.static(uploadsDir, {
  fallthrough: false,
  setHeaders: (res, filePath) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; sandbox;");
  }
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a secure, unpredictable random hash
    const randomHash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomHash}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit (DoS mitigation)
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Solo se permiten imágenes JPEG, PNG, WEBP y archivos PDF.'));
    }
  }
});


// === MIDDLEWARE ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;

    // Dynamically resolve virtual/missing IDs for Super Admin to avoid FK violations
    if (req.user && (req.user.id === '00000000-0000-0000-0000-000000000000' || req.user.email === process.env.SUPER_ADMIN_EMAIL)) {
      try {
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'joel.miranda2009@gmail.com';
        const userDb = await pool.query('SELECT id FROM users WHERE email = $1', [superAdminEmail]);
        if (userDb.rows.length > 0) {
          req.user.id = userDb.rows[0].id;
        }
      } catch (dbErr) {
        console.error('Error resolving Super Admin ID in authenticateToken:', dbErr);
      }
    }

    next();
  });
};

const getEffectiveSucursalId = async (req) => {
  if (req.user) {
    return req.user.sucursal_id || null;
  }
  const res = await pool.query("SELECT id FROM sucursales ORDER BY created_at ASC LIMIT 1");
  return res.rows.length > 0 ? res.rows[0].id : null;
};

const isAdminUser = async (userId, userEmail) => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superAdminEmail && userEmail === superAdminEmail) {
    return true;
  }
  try {
    const profileRes = await pool.query('SELECT role FROM user_profiles WHERE id = $1', [userId]);
    return profileRes.rows[0] && ['Administrator', 'admin'].includes(profileRes.rows[0].role);
  } catch (err) {
    console.error('Error checking admin role:', err);
    return false;
  }
};

// === AUTHENTICATION ENDPOINTS ===
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  try {
    // Check for Super Admin configured in environment variables (bypasses DB)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (superAdminEmail && email === superAdminEmail) {
      // Only verify the password stored in the database (sole source of truth)
      let dbPasswordMatch = false;
      try {
        const userDb = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
        if (userDb.rows.length > 0) {
          const hash = userDb.rows[0].password_hash;
          dbPasswordMatch = await bcrypt.compare(password, hash).catch(() => false)
            || hash === password; // plaintext fallback
        }
      } catch (dbErr) {
        console.error('DB check failed for super admin:', dbErr.message);
      }

      if (dbPasswordMatch) {
        console.log(`Master Login successful for: ${email} (DB password verified)`);

        let userId = 'bb000000-0000-0000-0000-000000000002';
        try {
          const userDb = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
          if (userDb.rows.length > 0) userId = userDb.rows[0].id;
        } catch (dbErr) {
          console.error('Failed to look up super admin ID, using virtual ID:', dbErr.message);
        }

        // Record Audit Log for Super Admin Login
        await pool.query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, 'USER_LOGIN', 'AUTH', userId, JSON.stringify({ email, role: 'Administrator', sucursal: 'Acceso Global' }), req.ip]
        ).catch(e => console.error('Audit log login error:', e.message));

        const token = jwt.sign(
          { id: userId, email: superAdminEmail, role: 'Administrator', sucursal_id: null },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.status(200).json({
          session: { access_token: token },
          user: {
            id: userId,
            email: superAdminEmail,
            user_metadata: {
              first_name: 'Joel',
              last_name: 'Miranda',
              role: 'Administrator',
              department: 'IT/Dirección',
              can_access_alto_costo: true,
              sucursal_id: null,
              sucursal_nombre: 'Acceso Global'
            }
          }
        });
      } else {
        console.log(`Invalid password for Master User: ${email}`);
        await pool.query(
          'INSERT INTO audit_logs (action, entity_type, details, ip_address) VALUES ($1, $2, $3, $4)',
          ['USER_LOGIN_FAILED', 'AUTH', JSON.stringify({ email, reason: 'Contraseña incorrecta (Master)' }), req.ip]
        ).catch(() => {});
        return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      }
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      console.log(`User not found: ${email}`);
      await pool.query(
        'INSERT INTO audit_logs (action, entity_type, details, ip_address) VALUES ($1, $2, $3, $4)',
        ['USER_LOGIN_FAILED', 'AUTH', JSON.stringify({ email, reason: 'Usuario no registrado' }), req.ip]
      ).catch(() => {});
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const user = result.rows[0];

    // Fallback plain text check for our static admin insert, or bcrypt for new users
    const isPlainTextMatch = user.password_hash === password;
    const isBcryptMatch = !isPlainTextMatch && await bcrypt.compare(password, user.password_hash).catch(() => false);

    if (!isPlainTextMatch && !isBcryptMatch) {
      console.log(`Invalid password for user: ${email}`);
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'USER_LOGIN_FAILED', 'AUTH', JSON.stringify({ email, reason: 'Contraseña incorrecta' }), req.ip]
      ).catch(() => {});
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    if (!user.is_approved) {
      console.log(`User pending approval: ${email}`);
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'USER_LOGIN_FAILED', 'AUTH', JSON.stringify({ email, reason: 'Usuario pendiente de aprobación' }), req.ip]
      ).catch(() => {});
      return res.status(403).json({ error: 'User_Pending_Approval' });
    }

    // Get profile
    const profileRes = await pool.query(
      `SELECT p.*, s.nombre as sucursal_nombre 
       FROM user_profiles p 
       LEFT JOIN sucursales s ON p.sucursal_id = s.id 
       WHERE p.id = $1`,
      [user.id]
    );
    const profile = profileRes.rows[0] || {};

    console.log(`Login successful for: ${email}, role: ${profile.role}`);

    // Record Audit Log for User Login
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, 'USER_LOGIN', 'AUTH', user.id, JSON.stringify({ email, role: profile.role, sucursal: profile.sucursal_nombre || 'Sede Principal' }), req.ip]
    ).catch(e => console.error('Audit log login error:', e.message));

    const token = jwt.sign({ id: user.id, email: user.email, role: profile.role, sucursal_id: profile.sucursal_id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      session: { access_token: token },
      user: { id: user.id, email: user.email, user_metadata: profile }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to validate password complexity (minimum 6 characters, at least 1 number, and 1 special character)
function validatePasswordStrength(password) {
  if (!password || password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password);
  if (!hasNumber) {
    return 'La contraseña debe contener al menos un número.';
  }
  if (!hasSpecial) {
    return 'La contraseña debe contener al menos un carácter especial (ej. !, @, #, $, etc.).';
  }
  return null;
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name, role, department } = req.body;
  
  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hashedPassword]
      );
      const user = result.rows[0];

      const parts = (first_name || '').split(' ');
      const fName = first_name || 'Nuevo';
      const lName = last_name || 'Usuario';

      await client.query(
        'INSERT INTO user_profiles (id, first_name, last_name, role, department) VALUES ($1, $2, $3, $4, $5)',
        [user.id, fName, lName, role || 'Nurse', department || 'General']
      );

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Registrado con éxito. Pendiente de aprobación.',
        user: { id: user.id, email: user.email }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail && req.user.email === superAdminEmail) {
      let sucursalId = req.user.sucursal_id || null;
      let sucursalNombre = 'Acceso Global';

      if (sucursalId) {
        const sucRes = await pool.query('SELECT nombre FROM sucursales WHERE id = $1', [sucursalId]);
        if (sucRes.rows.length > 0) {
          sucursalNombre = sucRes.rows[0].nombre;
        } else {
          sucursalId = null;
        }
      }

      return res.status(200).json({
        user: {
          id: req.user.id,
          email: req.user.email,
          user_metadata: {
            first_name: 'Joel',
            last_name: 'Miranda',
            role: 'Administrator',
            department: 'IT/Dirección',
            can_access_alto_costo: true,
            sucursal_id: sucursalId,
            sucursal_nombre: sucursalNombre
          }
        }
      });
    }

    const userRes = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
    const profileRes = await pool.query(
      `SELECT p.*, s.nombre as sucursal_nombre 
       FROM user_profiles p 
       LEFT JOIN sucursales s ON p.sucursal_id = s.id 
       WHERE p.id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
        user_metadata: profileRes.rows[0] || {}
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es requerido.' });
  }

  try {
    // 1. Check if user exists in the database
    const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    if (userRes.rows.length === 0) {
      console.log(`[Password Reset Request] Email ${email} not found. Returning success for security.`);
      // For security, return success even if user not found, so users can't enumerate register status
      return res.status(200).json({ message: 'Se ha enviado un código de recuperación si la cuenta existe.' });
    }

    const user = userRes.rows[0];

    // 2. Generate a 6-digit numeric OTP code and expiration (1 hour)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // 3. Save to database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [code, expires, user.id]
    );

    // 4. Send recovery email with OTP code
    const mailOptions = {
      from: process.env.SMTP_FROM || '"MediControl Pro" <no-reply@medicontrol.com>',
      to: user.email,
      subject: 'Código de Recuperación - MediControl Pro',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff; color: #334155;">
          <h2 style="color: #0f172a; text-align: center; margin-top: 0;">MediControl Pro</h2>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p>Hola,</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en MediControl Pro.</p>
          <p>Tu código de verificación de un solo uso es el siguiente (el código es válido por 1 hora):</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f1f5f9; color: #0f172a; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 15px 30px; border-radius: 8px; border: 1px dashed #cbd5e1; display: inline-block;">
              ${code}
            </div>
          </div>
          <p style="color: #64748b; font-size: 14px; text-align: center;">Introduce este código en la aplicación para proceder a cambiar tu contraseña.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña seguirá siendo la misma.</p>
        </div>
      `,
    };

    await mailTransporter.sendMail(mailOptions);
    console.log(`[Password Reset OTP] Code successfully sent to ${email}`);

    res.status(200).json({ message: 'Se ha enviado un código de recuperación si la cuenta existe.' });

  } catch (err) {
    console.error('[Password Reset Error]:', err);
    res.status(500).json({ error: 'Error del servidor al procesar la recuperación de contraseña.' });
  }
});

app.post('/api/auth/update-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'El correo, el código y la nueva contraseña son requeridos.' });
  }

  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    // 1. Find user with email, valid token (code)
    const userRes = await pool.query(
      'SELECT id, reset_token_expires FROM users WHERE email = $1 AND reset_token = $2',
      [email, token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'El código de verificación es inválido.' });
    }

    const dbUser = userRes.rows[0];
    
    // Timezone-safe JavaScript date comparison (millisecond epoch comparison)
    const expiresDate = new Date(dbUser.reset_token_expires);
    if (expiresDate.getTime() < Date.now()) {
      return res.status(400).json({ error: 'El código de verificación ha expirado.' });
    }

    const userId = dbUser.id;

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update password and clear token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, userId]
    );

    console.log(`[Password Reset OTP Success] Password updated for user ID: ${userId}`);
    res.status(200).json({ message: 'Contraseña actualizada correctamente.' });

  } catch (err) {
    console.error('[Password Update Error]:', err);
    res.status(500).json({ error: 'Error del servidor al actualizar la contraseña.' });
  }
});

// === SWITCH SUCURSAL (Admin only) ===
app.patch('/api/auth/switch-sucursal', authenticateToken, async (req, res) => {
  const { sucursal_id } = req.body;
  const isGlobal = sucursal_id === null || sucursal_id === 'global' || sucursal_id === 'all';

  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdmin = superAdminEmail && req.user.email === superAdminEmail;

    let role = req.user.role || 'Administrator';
    let sucursalNombre = 'Acceso Global';
    let targetSucursalId = null;

    if (!isSuperAdmin) {
      // Verify requesting user is admin
      const profileRes = await pool.query(
        `SELECT role FROM user_profiles WHERE id = $1`,
        [req.user.id]
      );
      const profile = profileRes.rows[0];
      if (!profile || !['Administrator', 'admin'].includes(profile.role)) {
        return res.status(403).json({ error: 'Solo los administradores pueden cambiar de sucursal' });
      }
      role = profile.role;
    }

    if (!isGlobal) {
      // Verify sucursal exists
      const sucursalRes = await pool.query('SELECT id, nombre FROM sucursales WHERE id = $1', [sucursal_id]);
      if (sucursalRes.rows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });
      const sucursal = sucursalRes.rows[0];
      targetSucursalId = sucursal.id;
      sucursalNombre = sucursal.nombre;
    }

    // Update user_profiles with new sucursal_id for profile persistence
    await pool.query('UPDATE user_profiles SET sucursal_id = $1 WHERE id = $2', [targetSucursalId, req.user.id]).catch(() => {});

    // Generate new JWT with updated sucursal_id
    const newToken = jwt.sign(
      { id: req.user.id, email: req.user.email, role: role, sucursal_id: targetSucursalId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: isGlobal ? 'Acceso cambiado a Global (Todas las sedes)' : `Sucursal cambiada a: ${sucursalNombre}`,
      session: { access_token: newToken },
      sucursal: { id: targetSucursalId, nombre: sucursalNombre }
    });
  } catch (err) {
    console.error('Error switching sucursal:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Profile creation proxy (often called after register)
app.post('/api/user_profiles', authenticateToken, async (req, res) => {
  const { id, first_name, last_name, role, department, can_access_alto_costo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id || req.user.id, first_name, last_name, role, department, can_access_alto_costo || false]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user_profiles', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_profiles');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === UPLOAD ENDPOINT ===
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file format' });
  }
  const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.status(200).json({ url: fileUrl, filename: req.file.filename });
});

app.get('/api/sucursales', authenticateToken, async (req, res) => {
  try {
    // Incluir el nombre del admin local si está asignado
    const result = await pool.query(`
      SELECT s.*,
             u.email as admin_local_email,
             p.first_name as admin_local_nombre,
             p.last_name as admin_local_apellido
      FROM sucursales s
      LEFT JOIN users u ON s.admin_local_id = u.id
      LEFT JOIN user_profiles p ON s.admin_local_id = p.id
      ORDER BY s.nombre ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching branches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Crear nueva sede (solo admin)
app.post('/api/sucursales', authenticateToken, async (req, res) => {
  const { nombre, direccion, telefono, estado, imagen_url } = req.body;
  // Verificar que sea admin
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores pueden crear sedes' });
  }
  if (!nombre) return res.status(400).json({ error: 'El nombre de la sede es requerido' });
  try {
    const result = await pool.query(
      `INSERT INTO sucursales (nombre, direccion, telefono, estado, imagen_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre.trim(), direccion || null, telefono || null, estado || 'activo', imagen_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe una sede con ese nombre' });
    console.error('Error creating branch:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Editar sede (solo admin)
app.put('/api/sucursales/:id', authenticateToken, async (req, res) => {
  const { nombre, direccion, telefono, estado, imagen_url } = req.body;
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores pueden editar sedes' });
  }
  try {
    const result = await pool.query(
      `UPDATE sucursales SET nombre = COALESCE($1, nombre), direccion = COALESCE($2, direccion),
       telefono = COALESCE($3, telefono), estado = COALESCE($4, estado), imagen_url = COALESCE($5, imagen_url)
       WHERE id = $6 RETURNING *`,
      [nombre || null, direccion || null, telefono || null, estado || null, imagen_url || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe una sede con ese nombre' });
    console.error('Error updating branch:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Eliminar sede (solo admin)
app.delete('/api/sucursales/:id', authenticateToken, async (req, res) => {
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar sedes' });
  }
  try {
    const result = await pool.query('DELETE FROM sucursales WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
    res.status(200).json({ success: true, message: 'Sede eliminada correctamente' });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'No se puede eliminar: existen usuarios o datos asociados a esta sede' });
    console.error('Error deleting branch:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Asignar administrador local a una sede (solo admin principal)
app.patch('/api/sucursales/:id/admin', authenticateToken, async (req, res) => {
  const { user_id } = req.body;
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores principales pueden asignar administradores locales' });
  }
  try {
    // Actualizar la columna admin_local_id en sucursales
    const result = await pool.query(
      'UPDATE sucursales SET admin_local_id = $1 WHERE id = $2 RETURNING *',
      [user_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });

    // Si se asigna un usuario, actualizar su rol a Local_Admin
    if (user_id) {
      await pool.query(
        `UPDATE user_profiles SET role = 'Local_Admin', sucursal_id = $1 WHERE id = $2`,
        [req.params.id, user_id]
      );
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error assigning local admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === PACIENTES ALTO COSTO ENDPOINTS ===
app.get('/api/pacientes_alto_costo', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      `SELECT p.*, s.nombre as sucursal_nombre 
       FROM pacientes_alto_costo p
       LEFT JOIN sucursales s ON p.sucursal_id = s.id
       WHERE ($1::uuid IS NULL OR p.sucursal_id = $1)
       ORDER BY p.created_at DESC`,
      [effectiveSucursalId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/pacientes_alto_costo', authenticateToken, async (req, res) => {
  const { documento_identidad, nombre_completo, codigo_autorizacion, historia_clinica_url, ciclos_totales } = req.body;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    if (!effectiveSucursalId) {
      return res.status(400).json({ error: 'Debe seleccionar una sede activa/específica antes de registrar un paciente. Use el selector de sede en la barra de navegación.' });
    }
    const result = await pool.query(
      'INSERT INTO pacientes_alto_costo (documento_identidad, nombre_completo, codigo_autorizacion, historia_clinica_url, ciclos_totales, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [documento_identidad, nombre_completo, codigo_autorizacion, historia_clinica_url, parseInt(ciclos_totales) || 6, effectiveSucursalId]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El documento ya está registrado' });
    console.error('Error creating patient:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/pacientes_alto_costo/:id/despachos', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      `SELECT d.*, d.fecha_entrega as fecha_hora, m.name as medication_name,
              (u.first_name || ' ' || u.last_name) as nombre_completo,
              s.nombre as sucursal_nombre
       FROM historial_despachos_alto_costo d
       LEFT JOIN user_profiles u ON d.user_id = u.id
       LEFT JOIN medications m ON d.medication_id = m.id
       LEFT JOIN sucursales s ON d.sucursal_id = s.id
       WHERE d.paciente_id = $1 AND ($2::uuid IS NULL OR d.sucursal_id = $2)
       ORDER BY d.fecha_entrega DESC`,
      [req.params.id, effectiveSucursalId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching dispatch history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/pacientes_alto_costo/:id/despacho', authenticateToken, async (req, res) => {
  const { medication_id, batch_number, cantidad, notas } = req.body;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    if (!effectiveSucursalId) {
      return res.status(400).json({ error: 'Debe seleccionar una sede activa/específica antes de realizar un despacho. Use el selector de sede en la barra de navegación.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validar que el usuario que realiza la acción sea válido en la base de datos
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El usuario que realiza la acción (ID: ${req.user.id}) no existe en el sistema` });
      }

      const pacienteRes = await client.query(
        'UPDATE pacientes_alto_costo SET ciclos_entregados = ciclos_entregados + 1 WHERE id = $1 AND sucursal_id = $2 RETURNING *',
        [req.params.id, effectiveSucursalId]
      );

      if (pacienteRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Paciente no encontrado o no pertenece a esta sucursal' });
      }

      const paciente = pacienteRes.rows[0];
      if (paciente.estado === 'completado' || paciente.ciclos_entregados > paciente.ciclos_totales) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El tratamiento ya fue completado' });
      }

      if (paciente.ciclos_entregados === paciente.ciclos_totales) {
        await client.query("UPDATE pacientes_alto_costo SET estado = 'completado' WHERE id = $1 AND sucursal_id = $2", [req.params.id, effectiveSucursalId]);
      }

      const historialRes = await client.query(
        'INSERT INTO historial_despachos_alto_costo (paciente_id, medication_id, batch_number, cantidad, user_id, notas, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [req.params.id, medication_id, batch_number, cantidad, req.user.id, notas, effectiveSucursalId]
      );

      if (!medication_id || !batch_number || !cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Medicamento, lote y cantidad son requeridos' });
      }

      const batchRes = await client.query(
        'SELECT id, quantity FROM inventory_batches WHERE batch_number = $1 AND medication_id = $2 AND sucursal_id = $3',
        [batch_number, medication_id, effectiveSucursalId]
      );

      if (batchRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El lote especificado no existe para este medicamento en esta sucursal' });
      }

      const batch = batchRes.rows[0];
      const stockActual = parseInt(batch.quantity, 10);
      const cantidadSolicitada = parseInt(cantidad, 10);

      if (cantidadSolicitada > stockActual) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Stock insuficiente en el lote seleccionado para procesar el despacho' });
      }

      const batchId = batch.id;
      await client.query(
        'INSERT INTO inventory_movements (batch_id, type, quantity, reason, destination, performed_by, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [batchId, 'out', cantidad, 'Despacho Alto Costo', `Paciente Doc: ${paciente.documento_identidad}`, req.user.id, effectiveSucursalId]
      );

      await client.query(
        'UPDATE inventory_batches SET quantity = quantity - $1 WHERE id = $2 AND sucursal_id = $3',
        [cantidad, batchId, effectiveSucursalId]
      );

      // Registrar en audit_logs
      await client.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          'DESPACHO_ALTO_COSTO',
          'paciente_alto_costo',
          req.params.id,
          JSON.stringify({
            accion: 'DESPACHO_ALTO_COSTO',
            paciente: paciente.nombre_completo || req.params.id,
            documento: paciente.documento_identidad,
            ciclo_entregado: paciente.ciclos_entregados,
            cantidad,
            batch_number,
            medication_id,
            notas: notas || '—'
          })
        ]
      );

      await client.query('COMMIT');
      res.status(200).json({ paciente: pacienteRes.rows[0], despacho: historialRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error in despacho alto costo:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === TAREAS ENDPOINTS ===
app.get('/api/tareas', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tareas ORDER BY fecha_creacion DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tareas', authenticateToken, async (req, res) => {
  const { titulo, descripcion, completada } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tareas (titulo, descripcion, completada, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [titulo, descripcion, completada || false, req.user.id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tareas/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { completada } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tareas SET completada = $1 WHERE id = $2 RETURNING *',
      [completada, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tareas/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM tareas WHERE id = $1', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/medications', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(`
      SELECT m.*, c.name as category, 
             CAST(COALESCE((SELECT SUM(quantity) FROM inventory_batches WHERE medication_id = m.id AND ($1::uuid IS NULL OR sucursal_id = $1)), 0) AS INTEGER) as stock
      FROM medications m 
      LEFT JOIN categories c ON m.category_id = c.id 
      ORDER BY m.name ASC
    `, [effectiveSucursalId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching medications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/medications', authenticateToken, async (req, res) => {
  const { code, name, generic_name, presentation, unit, min_stock_level, requires_prescription, category } = req.body;
  try {
    let category_id = null;
    if (category) {
      const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category]);
      if (catRes.rows.length > 0) {
        category_id = catRes.rows[0].id;
      } else {
        const newCat = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [category]);
        category_id = newCat.rows[0].id;
      }
    }

    const result = await pool.query(
      'INSERT INTO medications (code, name, generic_name, presentation, unit, min_stock_level, requires_prescription, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [code, name, generic_name, presentation, unit || presentation, parseInt(min_stock_level) || 0, requires_prescription, category_id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating medication:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/medications/:id', authenticateToken, async (req, res) => {
  const { name, generic_name, presentation, min_stock_level, requires_prescription, category } = req.body;
  try {
    let category_id = null;
    if (category) {
      const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category]);
      if (catRes.rows.length > 0) {
        category_id = catRes.rows[0].id;
      } else {
        const newCat = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [category]);
        category_id = newCat.rows[0].id;
      }
    }

    const minStock = isNaN(parseInt(min_stock_level)) ? 0 : parseInt(min_stock_level);
    const requiresPresc = requires_prescription === true || requires_prescription === 'true';

    const result = await pool.query(
      'UPDATE medications SET name = $1, generic_name = $2, presentation = $3, unit = $4, min_stock_level = $5, requires_prescription = $6, category_id = $7 WHERE id = $8 RETURNING *',
      [name, generic_name, presentation, presentation, minStock, requiresPresc, category_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Convert back to match API shape
    const row = result.rows[0];
    row.category = category;

    res.status(200).json(row);
  } catch (err) {
    console.error('Error updating medication:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/medications/:id', authenticateToken, async (req, res) => {
  // === SOLO ADMINISTRADORES ===
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar medicamentos' });
  }

  const { motivo_eliminacion, notas_eliminacion } = req.body;
  if (!motivo_eliminacion) {
    return res.status(400).json({ error: 'El motivo de eliminación es requerido' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener datos del medicamento antes de eliminar
      const medData = await client.query(
        `SELECT m.*, CAST(COALESCE((SELECT SUM(quantity) FROM inventory_batches WHERE medication_id = m.id), 0) AS INTEGER) as stock_actual
         FROM medications m WHERE m.id = $1`,
        [req.params.id]
      );
      if (medData.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Medicamento no encontrado' });
      }
      const medInfo = medData.rows[0];

      // 0. Delete high-cost patient dispatches related to this medication
      await client.query('DELETE FROM historial_despachos_alto_costo WHERE medication_id = $1', [req.params.id]);

      // 1. Delete movements related to batches of this medication
      await client.query(`
          DELETE FROM inventory_movements 
          WHERE batch_id IN (SELECT id FROM inventory_batches WHERE medication_id = $1)
        `, [req.params.id]);

      // 2. Delete batches
      await client.query('DELETE FROM inventory_batches WHERE medication_id = $1', [req.params.id]);

      // 3. Delete medication
      const result = await client.query('DELETE FROM medications WHERE id = $1 RETURNING *', [req.params.id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Medication not found' });
      }

      // 4. Registrar en audit_logs con motivo y stock que había
      const detalles = JSON.stringify({
        accion: 'ELIMINACION_MEDICAMENTO',
        medicamento_nombre: medInfo.name,
        medicamento_generico: medInfo.generic_name,
        presentacion: medInfo.presentation,
        stock_al_eliminar: medInfo.stock_actual,
        motivo_eliminacion: motivo_eliminacion,
        notas_adicionales: notas_eliminacion || null,
        eliminado_por: req.user.email || req.user.id
      });
      await client.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'DELETE_MEDICATION', 'medication', req.params.id, detalles]
      );

      await client.query('COMMIT');
      res.status(200).json({ success: true, message: 'Medicamento y registros asociados eliminados correctamente' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting medication:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/medications/:id/stock', authenticateToken, async (req, res) => {
  const { quantity, reason, batch_number, expiration_date } = req.body;

  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    if (!effectiveSucursalId) {
      return res.status(400).json({
        error: 'Debe seleccionar una sucursal activa antes de registrar stock. Use el selector de sede en la barra de navegación.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validar que el usuario que realiza la acción sea válido en la base de datos
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El usuario que realiza la acción (ID: ${req.user.id}) no existe en el sistema` });
      }

      // 1. Find or create a default batch for this modification
      let batchRes = await client.query(
        "SELECT id FROM inventory_batches WHERE medication_id = $1 AND status = 'active' AND sucursal_id = $2 ORDER BY created_at DESC LIMIT 1",
        [req.params.id, effectiveSucursalId]
      );

      let batch_id;
      if (batchRes.rows.length > 0 && !batch_number) {
        batch_id = batchRes.rows[0].id;
      } else {
        // Create new batch if none exists or if a specific one is provided
        const newBatch = await client.query(
          'INSERT INTO inventory_batches (medication_id, batch_number, expiration_date, quantity, sucursal_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [
            req.params.id,
            batch_number || `ADJ-${Date.now().toString().slice(-6)}`,
            expiration_date || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
            0,
            effectiveSucursalId
          ]
        );
        batch_id = newBatch.rows[0].id;
      }

      // 2. Record the movement
      await client.query(
        'INSERT INTO inventory_movements (batch_id, type, quantity, reason, performed_by, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [batch_id, 'in', quantity, reason || 'Aumento de stock manual', req.user.id, effectiveSucursalId]
      );

      // 3. Update the batch quantity
      await client.query(
        'UPDATE inventory_batches SET quantity = quantity + $1 WHERE id = $2 AND sucursal_id = $3',
        [quantity, batch_id, effectiveSucursalId]
      );

      // Obtener nombre del medicamento para el log
      const medInfo = await client.query('SELECT name FROM medications WHERE id = $1', [req.params.id]);
      const medName = medInfo.rows[0]?.name || req.params.id;

      // Registrar en audit_logs
      await client.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          'STOCK_INGRESO',
          'medication',
          req.params.id,
          JSON.stringify({
            accion: 'INGRESO_DE_STOCK',
            medicamento: medName,
            cantidad_ingresada: quantity,
            lote: batch_number || 'Auto-generado',
            motivo: reason || 'Aumento de stock manual',
            sede: effectiveSucursalId
          })
        ]
      );

      await client.query('COMMIT');
      res.status(200).json({ success: true, message: 'Stock actualizado exitosamente' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === INVENTORY BATCHES ===
app.get('/api/inventory_batches', authenticateToken, async (req, res) => {
  const { medication_id } = req.query;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    let query = `
      SELECT ib.*, s.nombre as sucursal_nombre 
      FROM inventory_batches ib
      LEFT JOIN sucursales s ON ib.sucursal_id = s.id
      WHERE ($1::uuid IS NULL OR ib.sucursal_id = $1)
    `;
    const values = [effectiveSucursalId];

    if (medication_id) {
      query += ' AND ib.medication_id = $2';
      values.push(medication_id);
    }

    query += ' ORDER BY ib.expiration_date ASC';
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/inventory_batches', authenticateToken, async (req, res) => {
  const { medication_id, batch_number, expiration_date, quantity, unit_cost, supplier, location } = req.body;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    if (!effectiveSucursalId) {
      return res.status(400).json({ error: 'Debe seleccionar una sede activa/específica antes de registrar un lote. Use el selector de sede en la barra de navegación.' });
    }
    const validExpDate = expiration_date ? expiration_date : new Date(Date.now() + 31536000000).toISOString().split('T')[0];
    const result = await pool.query(
      'INSERT INTO inventory_batches (medication_id, batch_number, expiration_date, quantity, unit_cost, supplier, location, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [medication_id, batch_number, validExpDate, quantity || 0, unit_cost || 0, supplier, location, effectiveSucursalId]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Batch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/inventory_batches/:id', authenticateToken, async (req, res) => {
  // Update batch quantities
  const { quantity, status } = req.body;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const updates = [];
    const values = [];
    let query = 'UPDATE inventory_batches SET ';

    if (quantity !== undefined) {
      updates.push(`quantity = $${updates.length + 1}`);
      values.push(quantity);
    }
    if (status !== undefined) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }

    if (updates.length > 0) {
      query += updates.join(', ') + ` WHERE id = $${updates.length + 1} AND ($${updates.length + 2}::uuid IS NULL OR sucursal_id = $${updates.length + 2}) RETURNING *`;
      values.push(req.params.id, effectiveSucursalId);
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Batch not found or unauthorized' });
      res.status(200).json(result.rows[0]);
    } else {
      res.status(400).json({ error: 'No fields to update' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/inventory_batches/:id', authenticateToken, async (req, res) => {
  // === SOLO ADMINISTRADORES ===
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar lotes' });
  }

  const { motivo_eliminacion, notas_eliminacion } = req.body;
  if (!motivo_eliminacion) {
    return res.status(400).json({ error: 'El motivo de eliminación es requerido' });
  }

  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify batch ownership and get info before delete
      const checkBatch = await client.query(
        `SELECT ib.*, m.name as medication_name, m.generic_name as medication_generic
         FROM inventory_batches ib
         LEFT JOIN medications m ON ib.medication_id = m.id
         WHERE ib.id = $1 AND ($2::uuid IS NULL OR ib.sucursal_id = $2)`,
        [req.params.id, effectiveSucursalId]
      );
      if (checkBatch.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Lote no encontrado o sin acceso' });
      }
      const batchInfo = checkBatch.rows[0];

      // Delete associated movements first (Cascading manual)
      await client.query('DELETE FROM inventory_movements WHERE batch_id = $1 AND ($2::uuid IS NULL OR sucursal_id = $2)', [req.params.id, effectiveSucursalId]);
      const result = await client.query('DELETE FROM inventory_batches WHERE id = $1 AND ($2::uuid IS NULL OR sucursal_id = $2) RETURNING *', [req.params.id, effectiveSucursalId]);

      // Registrar en audit_logs con motivo y cantidad que había
      const detalles = JSON.stringify({
        accion: 'ELIMINACION_LOTE',
        lote_numero: batchInfo.batch_number,
        medicamento_nombre: batchInfo.medication_name,
        medicamento_generico: batchInfo.medication_generic,
        cantidad_al_eliminar: batchInfo.quantity,
        fecha_vencimiento_lote: batchInfo.expiration_date,
        motivo_eliminacion: motivo_eliminacion,
        notas_adicionales: notas_eliminacion || null,
        eliminado_por: req.user.email || req.user.id
      });
      await client.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'DELETE_BATCH', 'inventory_batch', req.params.id, detalles]
      );

      await client.query('COMMIT');
      res.status(200).json({ success: true, message: 'Lote y movimientos asociados eliminados correctamente', data: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting batch:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === INVENTORY MOVEMENTS ===
app.get('/api/inventory_movements', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(`
      SELECT m.*, b.medication_id, s.nombre as sucursal_nombre
      FROM inventory_movements m 
      LEFT JOIN inventory_batches b ON m.batch_id = b.id 
      LEFT JOIN sucursales s ON m.sucursal_id = s.id
      WHERE ($1::uuid IS NULL OR m.sucursal_id = $1)
      ORDER BY m.created_at DESC LIMIT 100
    `, [effectiveSucursalId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/inventory_movements', authenticateToken, async (req, res) => {
  const { batch_id, type, quantity, reason, destination, reference_document } = req.body;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    if (!effectiveSucursalId) {
      return res.status(400).json({ error: 'Debe seleccionar una sede activa/específica antes de registrar un movimiento de inventario o entrega. Use el selector de sede en la barra de navegación.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validar que el usuario que realiza la acción sea válido en la base de datos
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El usuario que realiza la acción (ID: ${req.user.id}) no existe en el sistema` });
      }

      // Verify batch ownership
      const checkBatch = await client.query(
        'SELECT id, quantity FROM inventory_batches WHERE id = $1 AND sucursal_id = $2',
        [batch_id, effectiveSucursalId]
      );
      if (checkBatch.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Lote no encontrado o sin acceso' });
      }

      // ===== BUG FIX: VALIDACIÓN DE STOCK ANTES DEL DESPACHO =====
      // Si el movimiento es de salida, verificar que hay suficiente stock
      const isOutbound = (type === 'out' || type === 'exit');
      if (isOutbound) {
        const stockActual = parseInt(checkBatch.rows[0].quantity, 10);
        const cantidadSolicitada = parseInt(quantity, 10);
        if (cantidadSolicitada > stockActual) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Stock insuficiente para procesar el despacho',
            stock_actual: stockActual,
            cantidad_solicitada: cantidadSolicitada
          });
        }
      }
      // ===========================================================

      const result = await client.query(
        'INSERT INTO inventory_movements (batch_id, type, quantity, reason, destination, reference_document, performed_by, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [batch_id, type, quantity, reason, destination, reference_document, req.user.id, effectiveSucursalId]
      );

      // Descuento automático de stock dentro de la misma transacción
      const operator = (type === 'in' || type === 'return') ? '+' : '-';
      await client.query(
        `UPDATE inventory_batches SET quantity = quantity ${operator} $1 WHERE id = $2 AND sucursal_id = $3`,
        [quantity, batch_id, effectiveSucursalId]
      );

      // Obtener info del lote y medicamento para el log
      const batchInfo = await client.query(
        `SELECT ib.batch_number, m.name as med_name FROM inventory_batches ib
         JOIN medications m ON ib.medication_id = m.id WHERE ib.id = $1`,
        [batch_id]
      );
      const bInfo = batchInfo.rows[0] || {};
      const tipoAccion = (type === 'out' || type === 'exit') ? 'DESPACHO_ENTREGA' : (type === 'in' ? 'INGRESO_MOVIMIENTO' : 'AJUSTE_INVENTARIO');

      // Registrar en audit_logs
      await client.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          tipoAccion,
          'inventory_movement',
          result.rows[0].id,
          JSON.stringify({
            accion: tipoAccion,
            medicamento: bInfo.med_name || 'Desconocido',
            lote: bInfo.batch_number || batch_id,
            tipo_movimiento: type,
            cantidad: quantity,
            motivo: reason || '—',
            destino: destination || '—'
          })
        ]
      );

      await client.query('COMMIT');
      res.status(200).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error recording movement:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/inventory_movements/:id', authenticateToken, async (req, res) => {
  const { reason, destination, reference_document } = req.body;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      'UPDATE inventory_movements SET reason = COALESCE($1, reason), destination = COALESCE($2, destination), reference_document = COALESCE($3, reference_document) WHERE id = $4 AND ($5::uuid IS NULL OR sucursal_id = $5) RETURNING *',
      [reason, destination, reference_document, req.params.id, effectiveSucursalId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Movement not found or unauthorized' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/inventory_movements/:id', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query('DELETE FROM inventory_movements WHERE id = $1 AND ($2::uuid IS NULL OR sucursal_id = $2) RETURNING *', [req.params.id, effectiveSucursalId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Movement not found or unauthorized' });
    res.status(200).json({ success: true, message: 'Movement deleted', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === AUDIT LOGS (Con Paginación y Filtros) ===
app.get('/api/audit_logs', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '15', 10)));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const actionFilter = (req.query.action || 'ALL').trim();

    const params = [];
    const whereClauses = [];

    if (search) {
      params.push(`%${search}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        al.action ILIKE $${searchIdx} OR
        al.entity_type ILIKE $${searchIdx} OR
        u.email ILIKE $${searchIdx} OR
        (p.first_name || ' ' || p.last_name) ILIKE $${searchIdx}
      )`);
    }

    if (actionFilter && actionFilter !== 'ALL') {
      if (actionFilter === 'DELETE_MEDICATION') {
        whereClauses.push(`(al.action = 'DELETE_MEDICATION' OR al.action = 'DELETE_BATCH')`);
      } else {
        params.push(actionFilter);
        whereClauses.push(`al.action = $${params.length}`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total Count Query
    const countRes = await pool.query(`
      SELECT COUNT(*)::integer as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN user_profiles p ON al.user_id = p.id
      ${whereSql}
    `, params);
    const total = countRes.rows[0]?.total || 0;

    // Paginated Rows Query
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const queryParams = [...params, limit, offset];

    const dataRes = await pool.query(`
      SELECT al.*,
             COALESCE(p.first_name || ' ' || p.last_name, u.email, 'Usuario Sistema') as usuario_nombre,
             u.email as usuario_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN user_profiles p ON al.user_id = p.id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, queryParams);

    res.status(200).json({
      logs: dataRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/audit_logs', authenticateToken, async (req, res) => {
  const { action, entity_type, entity_id, details } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, action, entity_type, entity_id, details, req.ip]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/statistics/deliveries', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      `SELECT m.name as name, m.generic_name as generic_name, m.presentation as presentation, 
              im.quantity as cantidad, im.created_at as fecha_hora, im.destination as destino,
              b.batch_number as batch_number, s.nombre as sucursal_nombre
       FROM inventory_movements im
       JOIN inventory_batches b ON im.batch_id = b.id
       JOIN medications m ON b.medication_id = m.id
       LEFT JOIN sucursales s ON im.sucursal_id = s.id
       WHERE im.type = 'out' AND ($1::uuid IS NULL OR im.sucursal_id = $1)
       ORDER BY im.created_at DESC
       LIMIT 100`,
      [effectiveSucursalId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching statistics deliveries:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === DISPATCH STATISTICS REPORT (con filtro de fechas) ===
app.get('/api/statistics/dispatches-report', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const params = [effectiveSucursalId];
    let dateFilter = '';

    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND im.created_at >= $${params.length}::timestamptz`;
    }
    if (endDate) {
      // Include the full end day by advancing to start of next day
      params.push(endDate);
      dateFilter += ` AND im.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    const result = await pool.query(
      `SELECT
          m.code           AS codigo,
          m.name           AS nombre,
          m.generic_name   AS principio_activo,
          m.presentation   AS presentacion,
          SUM(im.quantity) AS total_despachado
       FROM inventory_movements im
       JOIN inventory_batches b ON im.batch_id = b.id
       JOIN medications m       ON b.medication_id = m.id
       WHERE im.type = 'out'
         AND ($1::uuid IS NULL OR im.sucursal_id = $1)
         ${dateFilter}
       GROUP BY m.code, m.name, m.generic_name, m.presentation
       ORDER BY total_despachado DESC`,
      params
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching dispatches report:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === ESTADÍSTICAS COMPARATIVAS DE INVENTARIO (Período A vs Período B) ===
app.get('/api/statistics/comparative-dispatches', authenticateToken, async (req, res) => {
  const { startDateA, endDateA, startDateB, endDateB } = req.query;
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);

    if (!startDateA || !endDateA || !startDateB || !endDateB) {
      return res.status(400).json({ error: 'Se requieren fechas de inicio y fin para ambos períodos (A y B)' });
    }

    const result = await pool.query(`
      WITH period_a AS (
        SELECT 
          m.id AS med_id,
          m.code AS codigo,
          m.name AS nombre,
          m.generic_name AS principio_activo,
          m.presentation AS presentacion,
          COALESCE(SUM(im.quantity), 0)::integer AS total_a
        FROM inventory_movements im
        JOIN inventory_batches b ON im.batch_id = b.id
        JOIN medications m ON b.medication_id = m.id
        WHERE im.type = 'out'
          AND ($1::uuid IS NULL OR im.sucursal_id = $1)
          AND im.created_at >= $2::timestamptz 
          AND im.created_at < ($3::date + INTERVAL '1 day')
        GROUP BY m.id, m.code, m.name, m.generic_name, m.presentation
      ),
      period_b AS (
        SELECT 
          m.id AS med_id,
          m.code AS codigo,
          m.name AS nombre,
          m.generic_name AS principio_activo,
          m.presentation AS presentacion,
          COALESCE(SUM(im.quantity), 0)::integer AS total_b
        FROM inventory_movements im
        JOIN inventory_batches b ON im.batch_id = b.id
        JOIN medications m ON b.medication_id = m.id
        WHERE im.type = 'out'
          AND ($1::uuid IS NULL OR im.sucursal_id = $1)
          AND im.created_at >= $4::timestamptz 
          AND im.created_at < ($5::date + INTERVAL '1 day')
        GROUP BY m.id, m.code, m.name, m.generic_name, m.presentation
      )
      SELECT 
        COALESCE(pa.codigo, pb.codigo) AS codigo,
        COALESCE(pa.nombre, pb.nombre) AS nombre,
        COALESCE(pa.principio_activo, pb.principio_activo) AS principio_activo,
        COALESCE(pa.presentacion, pb.presentacion) AS presentacion,
        COALESCE(pa.total_a, 0) AS total_a,
        COALESCE(pb.total_b, 0) AS total_b,
        (COALESCE(pb.total_b, 0) - COALESCE(pa.total_a, 0)) AS diferencia,
        CASE 
          WHEN COALESCE(pa.total_a, 0) = 0 AND COALESCE(pb.total_b, 0) > 0 THEN 100.0
          WHEN COALESCE(pa.total_a, 0) = 0 AND COALESCE(pb.total_b, 0) = 0 THEN 0.0
          ELSE ROUND(((COALESCE(pb.total_b, 0) - pa.total_a)::numeric / pa.total_a::numeric * 100), 1)
        END AS pct_change,
        CASE
          WHEN COALESCE(pb.total_b, 0) > COALESCE(pa.total_a, 0) THEN 'MAYOR_ROTACION'
          WHEN COALESCE(pb.total_b, 0) < COALESCE(pa.total_a, 0) THEN 'MENOR_ROTACION'
          ELSE 'SIN_CAMBIO'
        END AS rotacion_status
      FROM period_a pa
      FULL OUTER JOIN period_b pb ON pa.med_id = pb.med_id
      ORDER BY (COALESCE(pb.total_b, 0) + COALESCE(pa.total_a, 0)) DESC
    `, [effectiveSucursalId, startDateA, endDateA, startDateB, endDateB]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching comparative dispatches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === NEW STATS ENDPOINTS FOR DASHBOARD ===

app.get('/api/statistics/stock-by-medication', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      `SELECT 
         m.name AS medicamento,
         SUM(ib.quantity)::integer AS stock_total
       FROM inventory_batches ib
       JOIN medications m ON ib.medication_id = m.id
       WHERE ib.status = 'active'
         AND ($1::uuid IS NULL OR ib.sucursal_id = $1)
       GROUP BY m.id, m.name
       ORDER BY stock_total DESC
       LIMIT 15`,
      [effectiveSucursalId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching stock-by-medication:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/statistics/inventory-trends', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      `SELECT 
         im.created_at::date AS fecha,
         SUM(CASE WHEN im.type = 'in' THEN im.quantity ELSE 0 END)::integer AS entradas,
         SUM(CASE WHEN im.type = 'out' THEN im.quantity ELSE 0 END)::integer AS salidas
       FROM inventory_movements im
       WHERE im.created_at >= NOW() - INTERVAL '30 days'
         AND ($1::uuid IS NULL OR im.sucursal_id = $1)
       GROUP BY im.created_at::date
       ORDER BY fecha ASC`,
      [effectiveSucursalId]
    );
    const formatted = result.rows.map(row => ({
      fecha: new Date(row.fecha).toISOString().split('T')[0],
      entradas: row.entradas,
      salidas: row.salidas
    }));
    res.status(200).json(formatted);
  } catch (err) {
    console.error('Error fetching inventory-trends:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/statistics/top-demanded', authenticateToken, async (req, res) => {
  try {
    const effectiveSucursalId = await getEffectiveSucursalId(req);
    const result = await pool.query(
      `SELECT 
         m.name AS medicamento,
         SUM(im.quantity)::integer AS total_entregado
       FROM inventory_movements im
       JOIN inventory_batches ib ON im.batch_id = ib.id
       JOIN medications m ON ib.medication_id = m.id
       WHERE im.type = 'out'
         AND ($1::uuid IS NULL OR im.sucursal_id = $1)
       GROUP BY m.id, m.name
       ORDER BY total_entregado DESC
       LIMIT 10`,
      [effectiveSucursalId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching top-demanded medications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === SYSTEM CONF ===
app.get('/api/system_configuration', authenticateToken, async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE system_configuration 
      ADD COLUMN IF NOT EXISTS membrete_line1 TEXT DEFAULT 'Ministerio del Poder Popular para el Proceso Social de Trabajo',
      ADD COLUMN IF NOT EXISTS membrete_line2 TEXT DEFAULT 'Instituto Venezolano de los Seguros Sociales';
    `).catch(() => {});

    const result = await pool.query('SELECT * FROM system_configuration LIMIT 1');
    if (result.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO system_configuration (hospital_name, membrete_line1, membrete_line2) 
         VALUES ('Hospital Central', 'Ministerio del Poder Popular para el Proceso Social de Trabajo', 'Instituto Venezolano de los Seguros Sociales') 
         RETURNING *`
      );
      return res.status(200).json(insert.rows[0]);
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Actualizar configuración del sistema y membrete (solo admin)
app.put('/api/system_configuration', authenticateToken, async (req, res) => {
  const { hospital_name, low_stock_threshold_days, currency, membrete_line1, membrete_line2 } = req.body;
  if (!(await isAdminUser(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Solo los administradores pueden modificar la configuración y el membrete' });
  }
  try {
    await pool.query(`
      ALTER TABLE system_configuration 
      ADD COLUMN IF NOT EXISTS membrete_line1 TEXT DEFAULT 'Ministerio del Poder Popular para el Proceso Social de Trabajo',
      ADD COLUMN IF NOT EXISTS membrete_line2 TEXT DEFAULT 'Instituto Venezolano de los Seguros Sociales';
    `).catch(() => {});

    const existing = await pool.query('SELECT id FROM system_configuration LIMIT 1');
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE system_configuration
         SET hospital_name = COALESCE($1, hospital_name),
             low_stock_threshold_days = COALESCE($2, low_stock_threshold_days),
             currency = COALESCE($3, currency),
             membrete_line1 = COALESCE($4, membrete_line1),
             membrete_line2 = COALESCE($5, membrete_line2),
             updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [
          hospital_name || null, 
          low_stock_threshold_days || null, 
          currency || null,
          membrete_line1 !== undefined ? membrete_line1 : null,
          membrete_line2 !== undefined ? membrete_line2 : null,
          existing.rows[0].id
        ]
      );
    } else {
      result = await pool.query(
        `INSERT INTO system_configuration (hospital_name, low_stock_threshold_days, currency, membrete_line1, membrete_line2)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          hospital_name || 'Hospital Central', 
          low_stock_threshold_days || 30, 
          currency || 'USD',
          membrete_line1 || 'Ministerio del Poder Popular para el Proceso Social de Trabajo',
          membrete_line2 || 'Instituto Venezolano de los Seguros Sociales'
        ]
      );
    }

    // Record audit log for configuration/membrete update
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'SETTINGS_UPDATE', 'CONFIGURATION', JSON.stringify({ membrete_line1, membrete_line2, updated_by: req.user.email }), req.ip]
    ).catch(() => {});

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating system configuration:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === USERS MANAGEMENT ===
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.created_at, u.is_approved, 
             p.first_name, p.last_name, p.role, p.department, p.can_access_alto_costo, p.sucursal_id,
             s.nombre as sucursal_nombre
      FROM users u 
      LEFT JOIN user_profiles p ON u.id = p.id
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      ORDER BY u.created_at DESC
    `);
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const filteredRows = result.rows.filter(row => row.email !== superAdminEmail);
    res.status(200).json(filteredRows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { email, password, first_name, last_name, role, department, can_access_alto_costo, sucursal_id } = req.body;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password || 'temporal', 10);
      const userRes = await client.query(
        'INSERT INTO users (email, password_hash, is_approved) VALUES ($1, $2, true) RETURNING id',
        [email, hash]
      );
      const userId = userRes.rows[0].id;

      const profileRes = await client.query(
        'INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, first_name, last_name, role, department, can_access_alto_costo || false, sucursal_id || null]
      );

      await client.query('COMMIT');
      res.status(200).json(profileRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { first_name, last_name, role, department, can_access_alto_costo, is_approved, sucursal_id } = req.body;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const profileResult = await client.query(
        `INSERT INTO user_profiles (id, first_name, last_name, role, department, can_access_alto_costo, sucursal_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         ON CONFLICT (id) DO UPDATE SET 
         first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, 
         role = EXCLUDED.role, department = EXCLUDED.department, can_access_alto_costo = EXCLUDED.can_access_alto_costo,
         sucursal_id = EXCLUDED.sucursal_id RETURNING *`,
        [req.params.id, first_name, last_name, role, department, can_access_alto_costo || false, sucursal_id || null]
      );

      if (typeof is_approved === 'boolean') {
        await client.query('UPDATE users SET is_approved = $1 WHERE id = $2', [is_approved, req.params.id]);
      }

      await client.query('COMMIT');
      res.status(200).json({ success: true, data: profileResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_profiles WHERE id = $1', [req.params.id]);
      await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      await client.query('COMMIT');
      res.status(200).json({ success: true, message: 'User deleted' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/users/:id/approve', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_approved = true WHERE id = $1 RETURNING id, email, is_approved',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 API Server running at http://localhost:${port}`);
});

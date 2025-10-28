const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); 

const app = express();

// Render asigna automáticamente un puerto en process.env.PORT
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());

// --- Configurar CORS ---
// En Render, normalmente tu frontend estará en el mismo dominio,
// pero esto permite pruebas locales o URLs públicas.
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// --- Conexión a MySQL ---
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err.stack);
    return;
  }
  console.log('✅ Conectado a MySQL con ID:', db.threadId);
});

// --- RUTA DE REGISTRO ---
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email y contraseña requeridos.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
    db.query(sql, [email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ message: 'El email ya está registrado.' });
        console.error('Error al registrar usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor al guardar.' });
      }
      res.status(201).json({ message: 'Registro exitoso. ¡Ahora puedes iniciar sesión!' });
    });
  } catch (error) {
    console.error('Error en el proceso de registro:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- RUTA DE LOGIN ---
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email y contraseña requeridos.' });

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Error consultando BD:', err);
      return res.status(500).json({ message: 'Error interno del servidor.' });
    }

    const user = results[0];
    if (!user)
      return res.status(401).json({ message: 'Credenciales inválidas.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.json({ message: '¡Login exitoso!', email: user.email, userId: user.id });
    } else {
      res.status(401).json({ message: 'Credenciales inválidas.' });
    }
  });
});

// --- Servir archivos estáticos del frontend ---
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// --- Redirigir cualquier ruta desconocida al index.html (SPA o rutas múltiples) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- Iniciar el servidor ---
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${port}`);
});

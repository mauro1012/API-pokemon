
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// --- Cargar variables de entorno ---
require('dotenv').config(); 

const app = express();
const port = 3000;

// --- Configuración de CORS y Middleware ---
// Permite peticiones desde tu frontend. Asegúrate de que el puerto coincida con tu Live Server.
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    methods: 'GET,POST',
    credentials: true,
}));
app.use(express.json()); // Middleware para parsear el body de las peticiones JSON

// --- Conexión a MySQL usando Variables de Entorno ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,         // Desde .env
    user: process.env.DB_USER,         // Desde .env
    password: process.env.DB_PASSWORD, // Desde .env
    database: process.env.DB_NAME      // Desde .env
});

db.connect(err => {
    if (err) {
        // Mejorar el manejo de errores de conexión
        console.error('❌ Error conectando a MySQL. Asegúrate que la BD está corriendo y el .env es correcto. Error:', err.stack);
        return;
    }
    console.log('✅ Conectado a MySQL con ID: ' + db.threadId);
});

// --- RUTA DE REGISTRO (/register) ---
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña requeridos.' });
    }

    try {
        // 1. Hashear la contraseña de forma segura
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 2. Insertar usuario en la BD
        const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
        db.query(sql, [email, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'El email ya está registrado.' });
                }
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

// --- RUTA DE LOGIN (/login) ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña requeridos.' });
    }

    // 1. Buscar el usuario por email
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Error consultando BD:', err);
            return res.status(500).json({ message: 'Error interno del servidor.' });
        }
        
        const user = results[0];
        
        // 2. Verificar si el usuario existe
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 3. Comparar la contraseña ingresada con el hash de la BD
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            // Login exitoso
            res.json({ message: '¡Login exitoso!', email: user.email, userId: user.id });
        } else {
            // Contraseña incorrecta
            res.status(401).json({ message: 'Credenciales inválidas.' });
        }
    });
});

// --- Iniciar el Servidor ---
app.listen(port, () => {
    console.log(`🚀 Backend escuchando en http://localhost:${port}`);
});
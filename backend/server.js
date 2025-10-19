// backend/server.js

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const path = require('path');
// Importar dotenv y cargar las variables de entorno desde el archivo .env
require('dotenv').config({ path: path.join(__dirname, '.env') }); 

const app = express();
// Usar el puerto de Render ($PORT) o 3000 para desarrollo local
const port = process.env.PORT || 3000; 

// ===============================================
// Configuración de Supabase (AHORA LEE DE process.env)
// ===============================================

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

// ===============================================
// 1. MIDDLEWARES
// ===============================================

app.use(cors());
app.use(bodyParser.json()); 


// ===============================================
// 2. RUTAS DE API (Login y prueba) - DEBEN IR PRIMERO
// ===============================================

// Ruta de prueba (MANTENLA PARA DEBUGGING)
app.post('/test', (req, res) => {
    console.log('¡Ruta de prueba alcanzada!');
    res.status(200).json({ message: 'Ruta de prueba OK.' });
});

// Ruta de LOGIN PRINCIPAL
app.post('/api/login', async (req, res) => {
    console.log('¡Petición de Login Recibida!'); 

    const { username, password } = req.body;
    
    // 1. AUTENTICACIÓN
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username, 
        password: password,
    });

    if (authError) {
        console.error('Error de autenticación:', authError.message);
        return res.status(401).json({ message: 'Usuario o contraseña inválidos.' });
    }

    const userId = authData.user.id;
    const sessionToken = authData.session.access_token;
    
    // 2. AUTORIZACIÓN: Obtener el rol
    const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('roles(name)')
        .eq('id', userId)
        .single();

    if (profileError || !profileData || !profileData.roles) {
        console.error('Error al obtener perfil o rol:', profileError?.message || 'Rol no encontrado.');
        return res.status(500).json({ message: 'Error interno: No se pudo verificar la autorización.' });
    }

    const userRole = profileData.roles.name;

    // 3. RESPUESTA EXITOSA
    res.status(200).json({ 
        message: 'Inicio de sesión exitoso.', 
        token: sessionToken, 
        role: userRole 
    });
});


// ===============================================
// 3. RUTAS ESTÁTICAS (Frontend) - DEBEN IR AL FINAL
// ===============================================

// Servir archivos estáticos desde la carpeta 'frontend' (asumiendo /backend/server.js)
app.use(express.static(path.join(__dirname, '..', 'frontend'))); 


// ===============================================
// 4. INICIO DEL SERVIDOR (USA EL PUERTO DINÁMICO)
// ===============================================

// Corrección: Escucha en todas las interfaces de red ('0.0.0.0')
app.listen(port, '0.0.0.0', () => { 
    console.log(`Servidor backend corriendo en http://0.0.0.0:${port}`);
});
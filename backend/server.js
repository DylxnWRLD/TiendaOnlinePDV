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
// FUNCIÓN DE TRADUCCIÓN DE ERRORES (Nueva Sección)
// ===============================================

/**
 * Traduce mensajes de error comunes de Supabase Auth (GoTrue) de inglés a español.
 * @param {string} originalMessage - El mensaje de error original en inglés.
 * @returns {string} El mensaje de error traducido.
 */
function traducirErrorSupabase(originalMessage) {
    if (!originalMessage) {
        return 'Error desconocido en el servidor.';
    }

    const mensajeLower = originalMessage.toLowerCase();

    if (mensajeLower.includes("already registered")) {
        return "Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.";
    }
    if (mensajeLower.includes("password should be at least 6 characters")) {
        return "La contraseña debe tener al menos 6 caracteres.";
    }
    if (mensajeLower.includes("invalid login credentials")) {
        // Aunque se maneja aparte en /api/login, es útil tenerla
        return "Credenciales de inicio de sesión no válidas.";
    }
    if (mensajeLower.includes("email not confirmed")) {
        return "El correo electrónico no ha sido confirmado. Revisa tu bandeja de entrada.";
    }
    if (mensajeLower.includes("unable to validate email address")) {
        return "Por favor, ingresa un correo electrónico válido.";
    }

    // Si no es un error conocido, devuelve el mensaje original o uno genérico
    return originalMessage;
}


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
        // Usamos la función de traducción aquí también
        const mensajeTraducido = traducirErrorSupabase(authError.message);
        return res.status(401).json({ message: mensajeTraducido || 'Usuario o contraseña inválidos.' });
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
// RUTA DE REGISTRO DE USUARIOS
// ===============================================
app.post('/api/register', async (req, res) => {
    console.log('¡Petición de Registro Recibida!');

    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    try {
        // 1️⃣ Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: username,
            password: password,
            options: {
                data: {
                    display_name: username,
                    desired_role_id: role,
                }
            }
        });

        if (authError) {
            console.error('Error al registrar usuario:', authError.message);

            const mensajeTraducido = traducirErrorSupabase(authError.message);

            return res.status(400).json({
                message: mensajeTraducido
            });
        }

        const message = authData.user?.identities?.length > 0
            ? 'Usuario registrado exitosamente. Por favor, revisa tu correo para confirmar la cuenta.'
            : 'Usuario registrado exitosamente. Ya puedes iniciar sesión.';

        res.status(201).json({ message: message });
    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
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
// backend/server.js

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
// Importar el router del cajero
const cajeroRoutes = require('./routes/cajeroRoutes');
// Importar dotenv y cargar las variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// ===============================================
// Configuración de Supabase
// ===============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);



// ===============================================
// FUNCIÓN DE TRADUCCIÓN DE ERRORES
// ===============================================
function traducirErrorSupabase(originalMessage) {
    if (!originalMessage) return 'Error desconocido en el servidor.';
    const mensajeLower = originalMessage.toLowerCase();
    if (mensajeLower.includes("already registered")) return "Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.";
    if (mensajeLower.includes("password should be at least 6 characters")) return "La contraseña debe tener al menos 6 caracteres.";
    if (mensajeLower.includes("invalid login credentials")) return "Credenciales de inicio de sesión no válidas.";
    if (mensajeLower.includes("email not confirmed")) return "El correo electrónico no ha sido confirmado. Revisa tu bandeja de entrada.";
    if (mensajeLower.includes("unable to validate email address")) return "Por favor, ingresa un correo electrónico válido.";
    return originalMessage;
}


// ===============================================
// 1. MIDDLEWARES GLOBALES
// ===============================================

app.use(cors());
app.use(bodyParser.json());


// ===============================================
// 1.5 MIDDLEWARES DE AUTORIZACIÓN (Admin)
// ===============================================

/**
 * Middleware para verificar el rol 'Admin'.
 */
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Token no proporcionado.' });

    try {
        // Nota: Usamos la función de autenticación interna para obtener el user object
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError) return res.status(403).json({ message: 'Token inválido o expirado.' });

        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('roles(name)')
            .eq('id', user.id)
            .single();

        if (profileError || !profileData || !profileData.roles || profileData.roles.name !== 'Admin') {
            return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador.' });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        console.error('Error en middleware de autenticación:', error.message);
        return res.status(500).json({ message: 'Error interno al validar la sesión.' });
    }
};


// ===============================================
// 2. RUTAS DE AUTENTICACIÓN (CORE)
// ===============================================

app.post('/test', (req, res) => {
    console.log('¡Ruta de prueba alcanzada!');
    res.status(200).json({ message: 'Ruta de prueba OK.' });
});

// Ruta de LOGIN PRINCIPAL
app.post('/api/login', async (req, res) => {
    console.log('¡Petición de Login Recibida!');
    const { username, password } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
    });

    if (authError) {
        console.error('Error de autenticación:', authError.message);
        const mensajeTraducido = traducirErrorSupabase(authError.message);
        return res.status(401).json({ message: mensajeTraducido || 'Usuario o contraseña inválidos.' });
    }

    const userId = authData.user.id;
    const sessionToken = authData.session.access_token;

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

    res.status(200).json({
        message: 'Inicio de sesión exitoso.',
        token: sessionToken,
        role: userRole
    });
});

// ===============================================
// RUTA DE REGISTRO DE USUARIOS (VERSIÓN ROBUSTA)
// ===============================================
app.post('/api/register', async (req, res) => {
    console.log('¡Petición de Registro Recibida!');

    const { username, password, role } = req.body; 

    if (!username || !password) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    try {
        // 1️⃣ Crear/Obtener usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: username,
            password: password,
        });

        if (authError) {
            console.error('Error al registrar usuario:', authError.message);
            const mensajeTraducido = traducirErrorSupabase(authError.message);
            return res.status(400).json({ message: mensajeTraducido });
        }
        
        if (!authData.user) {
             console.error('auth.signUp no devolvió un usuario.');
             return res.status(500).json({ message: 'Error interno: No se pudo obtener el ID de usuario.' });
        }

        const userId = authData.user.id;

        // 2️⃣ Insertar en tabla "users" (ESTE ES EL PASO QUE TE FALTA)
        const { error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    id: userId,
                    // Usa el 'role' del formulario, o '2' (Cliente) por defecto
                    role_id: role || 2 
                }
            ]);

        // 3️⃣ MANEJAR EL ERROR DE DUPLICADO (Evita crasheo por doble clic)
        if (insertError && insertError.code !== '23505') {
            console.error('Error al guardar en tabla users:', insertError.message);
            return res.status(500).json({ message: 'Error al guardar usuario en base de datos.' });
        }

        // 4️⃣ Respuesta exitosa
        const message = authData.user?.identities?.length > 0
            ? 'Usuario registrado exitosamente. Por favor, revisa tu correo para confirmar la cuenta.'
            : 'Usuario registrado exitosamente. Ya puedes iniciar sesión.';
            
        res.status(201).json({ message: message });
        
    } catch (error) {
        console.error('Error inesperado:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================
// 2.5 RUTAS DE API (ADMIN)
// ===============================================

// ===============================================
// 2.5 RUTAS DE API (ADMIN) - CORREGIDA
// ===============================================

app.get('/api/users', authenticateAdmin, async (req, res) => {
    console.log('¡Petición para obtener usuarios (Admin) recibida!');

    // ✅ ¡CORREGIDO! Este mapa ahora coincide con tabla 'public.roles'.
    const roleIdToName = {
        1: 'Admin',
        2: 'Cliente',
        3: 'Cajero',
        4: 'AdminInventario'
    };

    try {
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('Error al obtener usuarios de auth:', authError.message);
            return res.status(500).json({ message: 'Error al obtener lista de usuarios.' });
        }
        const authUsers = authUsersData.users;

        const { data: profilesData, error: profileError } = await supabase
            .from('users')
            .select('id, role_id'); // Pedimos el ID numérico

        if (profileError) {
            console.error('Error al obtener perfiles/roles:', profileError.message);
            return res.status(500).json({ message: 'Error al obtener roles de usuarios.' });
        }

        const rolesMap = new Map();
        profilesData.forEach(profile => {
            // Traducimos el ID (ej. 3) al nombre (ej. 'Cajero')
            const roleName = roleIdToName[profile.role_id] || 'Cliente';
            rolesMap.set(profile.id, roleName);
        });

        const combinedUsers = authUsers.map(authUser => {
            const role = rolesMap.get(authUser.id) || 'Cliente';
            const status = authUser.email_confirmed_at ? 'Activo' : 'Pendiente';

            return {
                id: authUser.id,
                email: authUser.email,
                role: role,
                created_at: authUser.created_at,
                status: status
            };
        });

        res.status(200).json(combinedUsers);

    } catch (error) {
        console.error('Error inesperado en /api/users:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================
// 3. CONEXIÓN DE ROUTERS MODULARES (CAJERO)
// ===============================================

// ⭐️ Conecta el router modular de caja ⭐️
app.use('/api', cajeroRoutes);


// ===============================================
// 4. RUTAS ESTÁTICAS Y ARRANQUE DEL SERVIDOR
// ===============================================

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor backend corriendo en http://0.0.0.0:${port}`);
});
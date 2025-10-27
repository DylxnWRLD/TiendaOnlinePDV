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

// RUTA DE REGISTRO DE USUARIOS
app.post('/api/register', async (req, res) => {
    console.log('¡Petición de Registro Recibida!');

    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    try {
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
// 2.5 RUTAS DE API (ADMIN)
// ===============================================

// ===============================================
// 2.5 RUTAS DE API (ADMIN) - CORREGIDA
// ===============================================

app.get('/api/users', authenticateAdmin, async (req, res) => {
    console.log('¡Petición para obtener usuarios (Admin) recibida!');

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
            .select('id, role_id');

        if (profileError) {
            console.error('Error al obtener perfiles/roles:', profileError.message);
            return res.status(500).json({ message: 'Error al obtener roles de usuarios.' });
        }

        const rolesMap = new Map();
        profilesData.forEach(profile => {
            const roleName = roleIdToName[profile.role_id];
            rolesMap.set(profile.id, roleName);
        });

        const combinedUsers = authUsers.map(authUser => {
            const role = rolesMap.get(authUser.id);
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

/**
 * RUTA: CREAR un nuevo usuario (Admin)
 * POST /api/users
 */
app.post('/api/users', authenticateAdmin, async (req, res) => {
    // El frontend envía 'role' como el ID numérico
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, contraseña y rol son obligatorios.' });
    }

    const role_id = parseInt(role, 10);

    try {
        // 1. Crear el usuario en Supabase Auth
        // Usamos la API de Admin para crear usuarios
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirma el email para que pueda iniciar sesión
            user_metadata: {
                // Pasamos el role_id aquí.
                desired_role_id: role_id
            }
        });

        if (authError) {
            console.error('Error al crear usuario en Auth:', authError.message);
            return res.status(400).json({ message: traducirErrorSupabase(authError.message) });
        }
        
        // ¡Éxito!
        res.status(201).json({ message: 'Usuario creado exitosamente.', user: authData.user });

    } catch (error) {
        console.error('Error inesperado en POST /api/users:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

/**
 * RUTA: ACTUALIZAR el rol de un usuario (Admin)
 * PUT /api/users/:id
 */
app.put('/api/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    const { role_id } = req.body; // Esperamos un ID numérico

    if (!role_id) {
        return res.status(400).json({ message: 'El ID del rol es obligatorio.' });
    }

    try {
        // Actualizamos 'public.users'.
        const { data, error } = await supabase
            .from('users') // Tabla de perfiles
            .update({ role_id: parseInt(role_id, 10) }) // El nuevo rol
            .eq('id', userId) // Dónde el ID coincida
            .select(); // Devuelve la fila actualizada

        if (error) {
            console.error('Error al actualizar rol en public.users:', error.message);
            return res.status(500).json({ message: 'No se pudo actualizar el rol.' });
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado en perfiles.' });
        }

        res.status(200).json({ message: 'Rol de usuario actualizado exitosamente.' });

    } catch (error) {
        console.error('Error inesperado en PUT /api/users/:id:', error.message);
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
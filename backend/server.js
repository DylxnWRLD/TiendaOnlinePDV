const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
// ⭐️ SE ELIMINÓ: const cajeroRoutes = require('./routes/cajeroRoutes');
// Importar dotenv y cargar las variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// ===============================================
// Configuración de Supabase (Inicialización Local)
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
// 1.5 MIDDLEWARES DE AUTORIZACIÓN (Admin y Cajero)
// ===============================================

/**
 * Middleware para verificar el rol 'Admin'.
 */
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Token no proporcionado.' });

    try {
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

// ⭐️ MIDDLEWARE DE AUTENTICACIÓN (MOVIDO DESDE cajeroRoutes) ⭐️
async function getUserIdFromToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }
    const token = authHeader.split(' ')[1];

    try {
        // 1. Validar el token y obtener el usuario
        const { data: userData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !userData.user) {
            console.error('Error al validar token:', authError?.message || 'Usuario no encontrado');
            return res.status(401).json({ message: 'Token de sesión inválido o expirado. Vuelve a iniciar sesión.' });
        }

        req.userId = userData.user.id;
        next();
    } catch (error) {
        // Captura errores críticos (ej. fallos de conexión API) y asegura JSON 
        console.error('[FATAL ERROR]: Validación de Token falló críticamente:', error.message);
        return res.status(500).json({ message: 'Error interno del servidor al validar sesión.' });
    }
}


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

app.get('/api/users', authenticateAdmin, async (req, res) => {
    console.log('¡Petición para obtener usuarios (Admin) recibida!');

    const roleIdToName = {
        1: 'Admin',
        2: 'Cliente',
        3: 'Cajero',
        4: 'AdminInventario'
    };

    try {
        // 1. Obtener usuarios de Autenticación (para email y fecha de creación)
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('Error al obtener usuarios de auth:', authError.message);
            return res.status(500).json({ message: 'Error al obtener lista de usuarios.' });
        }
        const authUsers = authUsersData.users;

        // 2. Obtener perfiles de public.users (para rol y STATUS REAL)
        const { data: profilesData, error: profileError } = await supabase
            .from('users')
            .select('id, role_id, status'); 

        if (profileError) {
            console.error('Error al obtener perfiles/roles:', profileError.message);
            return res.status(500).json({ message: 'Error al obtener roles de usuarios.' });
        }

        // 3. Crear un mapa con los datos de perfil (rol y status)
        const profileMap = new Map();
        profilesData.forEach(profile => {
            profileMap.set(profile.id, {
                role: roleIdToName[profile.role_id] || 'Cliente', 
                status: profile.status 
            });
        });

        // 4. Combinar datos
        const combinedUsers = authUsers
            .map(authUser => {
                const profile = profileMap.get(authUser.id);
                if (!profile) {
                    return null;
                }
                return {
                    id: authUser.id,
                    email: authUser.email,
                    role: profile.role, 
                    created_at: authUser.created_at,
                    status: profile.status 
                };
            })
            .filter(user => user !== null && user.status === 'Activo'); 

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
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, contraseña y rol son obligatorios.' });
    }

    const role_id = parseInt(role, 10);

    try {
        // 1. Crear el usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirma el email para que pueda iniciar sesión
            user_metadata: {
                desired_role_id: role_id
            }
        });

        if (authError) {
            console.error('Error al crear usuario en Auth:', authError.message);
            return res.status(400).json({ message: traducirErrorSupabase(authError.message) });
        }

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
    const { role_id } = req.body; 

    if (!role_id) {
        return res.status(400).json({ message: 'El ID del rol es obligatorio.' });
    }

    try {
        // Actualizamos 'public.users'.
        const { data, error } = await supabase
            .from('users') 
            .update({ role_id: parseInt(role_id, 10) })
            .eq('id', userId) 
            .select(); 

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

/**
 * RUTA: "ELIMINAR" (Desactivar) un usuario (Admin)
 * DELETE /api/users/:id
 */
app.delete('/api/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;

    try {
        const { data, error } = await supabase
            .from('users') 
            .update({ status: 'Inactivo' }) 
            .eq('id', userId) 
            .select(); 

        if (error) {
            console.error('Error al desactivar usuario en public.users:', error.message);
            return res.status(500).json({ message: 'No se pudo desactivar el usuario.' });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado en perfiles.' });
        }

        res.status(200).json({ message: 'Usuario desactivado exitosamente.' });

    } catch (error) {
        console.error('Error inesperado en DELETE /api/users/:id:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================
// RUTA PARA CREAR PROMOCIONES (ADMIN)
// ===============================================

app.post('/api/admin/promociones', authenticateAdmin, async (req, res) => {
    console.log('¡Petición para crear promoción (Admin) recibida!');
    
    const { 
        nombre, 
        descripcion, 
        tipo_descuento, 
        valor, 
        tipo_regla, 
        valor_regla, 
        fecha_inicio, 
        fecha_fin,
        activa
    } = req.body;

    if (!nombre || !tipo_descuento || !valor || !tipo_regla || !fecha_inicio) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para la promoción.' });
    }
    if (activa === undefined) {
        return res.status(400).json({ message: 'Falta el estado "activa".' });
    }

    try {
        const { data, error } = await supabase
            .from('promociones') 
            .insert([
                {
                    nombre: nombre,
                    descripcion: descripcion,
                    tipo_descuento: tipo_descuento,
                    valor: valor,
                    tipo_regla: tipo_regla,
                    // Lógica para 'valor_regla' nulo si no aplica
                    valor_regla: (tipo_regla === 'GLOBAL' || tipo_regla === 'REBAJAS' || tipo_regla === 'FECHA ESPECIAL') ? null : valor_regla, 
                    fecha_inicio: fecha_inicio,
                    fecha_fin: fecha_fin || null, 
                    activa: activa
                }
            ])
            .select(); 

        if (error) {
            console.error('Error de Supabase al insertar promoción:', error.message);
            if (error.message.includes('promociones_tipo_regla_check')) {
                return res.status(400).json({ message: `El tipo de regla "${tipo_regla}" no es válido.` });
            }
            return res.status(500).json({ message: 'Error al guardar la promoción.', details: error.message });
        }

        res.status(201).json(data[0]); 

    } catch (error) {
        console.error('Error inesperado en /api/admin/promociones:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================
// 3. RUTAS DE CAJERO (MOVIDAS DESDE cajeroRoutes)
// ===============================================

/**
 * RUTA: POST /api/caja/abrir (Apertura de Caja)
 */
app.post('/api/caja/abrir', getUserIdFromToken, async (req, res) => {
    const userId = req.userId;
    const { monto_inicial } = req.body;

    if (typeof monto_inicial !== 'number' || monto_inicial < 0) {
        return res.status(400).json({ message: 'Monto inicial inválido o faltante.' });
    }
    
    // 1. VERIFICACIÓN DE ROL CONTRA LA BD (role_id = 3)
    try {
        const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role_id')
            .eq('id', userId)
            .maybeSingle(); 

        if (roleError || !userData || userData.role_id !== 3) {
            if (roleError) console.error('[ROLE DB ERROR]:', roleError.message);
            
            // Devolver 403 (Permiso Denegado) si no es Cajero
            return res.status(403).json({ 
                message: 'Permiso denegado. Se requiere el rol Cajero.' 
            });
        }
        
    } catch (error) {
        console.error('[FATAL ERROR]: Role verification failed:', error.message);
        return res.status(500).json({ message: 'Error interno: Fallo al verificar permisos.' });
    }
    
    // 2. LLAMADA A LA FUNCIÓN DE APERTURA
    
    try {
        const { data: corteData, error } = await supabase.rpc('abrir_caja_cajero', {
            p_id_cajero: userId,
            p_monto_inicial: monto_inicial
        });
        
        if (error) {
            console.error('[RPC ERROR]: Error en abrir_caja_cajero:', error.message);
            
            if (error.message.includes('CAJA_ACTIVA_EXISTENTE')) {
                const { data: existingCorte } = await supabase
                    .from('cortes_caja')
                    .select('id_corte')
                    .eq('id_cajero', userId)
                    .eq('estado', 'ABIERTA')
                    .maybeSingle();
                    
                return res.status(409).json({ 
                    message: 'Ya tienes una caja abierta. Redirigiendo a tu turno activo.',
                    corteId: existingCorte ? existingCorte.id_corte : null 
                });
            }

            return res.status(500).json({ message: 'Error en la base de datos al registrar la apertura.', details: error.message });
        }

        res.status(200).json({ 
            message: 'Caja abierta exitosamente.', 
            corteId: corteData 
        });

    } catch (error) {
        console.error('[FATAL ERROR]: RPC call failed:', error);
        res.status(500).json({ message: 'Error interno del servidor. Fallo crítico en RPC.' });
    }
});


// ===============================================
// 4. RUTAS ESTÁTICAS Y ARRANQUE DEL SERVIDOR
// ===============================================

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor backend corriendo en http://0.0.0.0:${port}`);
});

// Exportaciones para el caso de que existan otros módulos que las necesiten.
module.exports = { app, supabase, traducirErrorSupabase, authenticateAdmin, getUserIdFromToken };

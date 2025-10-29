const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('./models/product.model'); // ⭐️ NUEVO: Importa el modelo


// ⭐️ SE ELIMINÓ: const cajeroRoutes = require('./routes/cajeroRoutes');
// Importar dotenv y cargar las variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ⭐️ PRUEBA 1: PARA VER SI EL ARCHIVO SE CARGA
console.log('--- ¡VERSIÓN MÁS RECIENTE DE SERVER.JS CARGADA! ---');

// ===============================================
// ⭐️ MANEJO GLOBAL DE EXCEPCIONES ⭐️
// Esto garantiza que cualquier error que intente crashear el proceso
// se imprima en los logs de Render antes de que el proceso termine.
// ===============================================

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- EXCEPCIÓN NO MANEJADA (PROMESA) ---');
    console.error('Razón:', reason);
    console.error('Promesa:', promise);
    // Permite que el proceso siga corriendo (opcionalmente)
});

process.on('uncaughtException', (err) => {
    console.error('--- EXCEPCIÓN NO CAPTURADA (CRASH) ---');
    console.error('Error:', err);
    // Intenta un cierre limpio, pero garantiza que el error se logre.
    process.exit(1); 
});

// ⭐️ SOLUCIÓN CRÍTICA: Deshabilita la verificación de SSL.
// Esto ayuda a Node.js a conectarse a Supabase cuando hay problemas de certificado en el hosting.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const port = process.env.PORT || 3000;

// ===============================================
// Configuración de Supabase (Inicialización Local)
// ===============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
// ===============================================
// ⭐️ NUEVO: Configuración de MongoDB (Mongoose) ⭐️
// ===============================================
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));


// ==========================================================
// ⭐️ OPCIONES DE CORS (PARA RUTAS CON CREDENCIALES) ⭐️
// ==========================================================
const corsOptionsWithCredentials = {
    origin: [
        'https://dyknxwld.github.io', // Tu GH Pages para el panel de inventario
        'http://127.0.0.1:3000',      // Tu local para pruebas
        'http://localhost:3000'        // Tu local para pruebas
    ],
    credentials: true // Esto permite que admininv.js envíe credenciales
};


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
        console.error('[FATAL ERROR]: Validación de Token falló críticamente. Detalles:', error); // Aseguramos el log completo
        return res.status(500).json({ message: 'Error interno del servidor al validar sesión.' });
    }
}


// ===============================================
// 2. RUTAS DE AUTENTICACIÓN (CORE)
// ===============================================



// ===============================================
// ⭐️⭐️ PRUEBA DE RUTA DE INVENTARIO ⭐️⭐️
// ===============================================

app.get('/api/products', async (req, res) => {
    console.log('--- ¡¡¡RUTA GET /api/products SÍ FUNCIONA!!! ---');

    try {
        const { search = "", page = 1, limit = 10 } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } }
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [items, total] = await Promise.all([
            Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Product.countDocuments(query)
        ]);
        res.status(200).json({ items, total });
    } catch (error) {
        console.error('Error al listar productos:', error.message);
        res.status(500).json({ 
            message: 'Error interno del servidor al listar productos.',
            details: error.message 
        });
    }
});
/**
 * RUTA: DELETE /api/products/:id
 * Objetivo: Eliminar un producto de MongoDB.
 * Creado para: Sprint 1 - HU "Eliminar productos"
 */
app.delete('/api/products/:id', async (req, res) => {
    // NOTA: Añadir seguridad de AdminInventario aquí
    try {
        const id = req.params.id;
        
        // Busca el producto por su ID de Mongo y elimínalo
        const productoEliminado = await Product.findByIdAndDelete(id);
        
        if (!productoEliminado) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }
        
        res.status(200).json({ message: 'Producto eliminado exitosamente.' });
        
    } catch (error) {
        console.error('Error al eliminar producto:', error.message);
        res.status(500).json({ 
            message: 'Error interno del servidor al eliminar.',
            details: error.message 
        });
    }
});
/**
 * RUTA: PUT /api/products/:id
 * Objetivo: Actualizar un producto existente en MongoDB.
 * Creado para: Sprint 1 - HU "Editar productos"
 */
app.put('/api/products/:id', async (req, res) => {
    // NOTA: Añadir seguridad de AdminInventario aquí
    try {
        const id = req.params.id;
        const datosActualizados = req.body;
        
        // Evitar que el _id se sobrescriba
        delete datosActualizados._id; 

        // 1. Validar si el SKU se está cambiando a uno que ya existe
        if (datosActualizados.sku) {
            const skuExistente = await Product.findOne({ 
                sku: datosActualizados.sku, 
                _id: { $ne: id } // Busca SKU en productos que NO sean este
            });
            if (skuExistente) {
                return res.status(400).json({ 
                    message: `Error: El SKU "${datosActualizados.sku}" ya está en uso por otro producto.` 
                });
            }
        }

        // 2. Buscar y actualizar el producto
        // { new: true } devuelve el documento ya actualizado
        const productoActualizado = await Product.findByIdAndUpdate(
            id, 
            datosActualizados, 
            { new: true, runValidators: true }
        );

        if (!productoActualizado) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }
        
        res.status(200).json({ 
            message: 'Producto actualizado exitosamente.',
            producto: productoActualizado 
        });
        
    } catch (error) {
        console.error('Error al actualizar producto:', error.message);
        res.status(500).json({ 
            message: 'Error interno del servidor al actualizar.',
            details: error.message 
        });
    }
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
// RUTA PARA OBTENER TODAS LAS PROMOCIONES
// ===============================================
app.get('/api/promociones', authenticateAdmin, async (req, res) => {
    console.log('¡Petición para OBTENER promociones (Admin) recibida!');

    try {
        // Consultar a Supabase
        const { data, error } = await supabase
            .from('promociones')
            .select('*') // Traer todas las columnas
            //.order('created_at', { ascending: false }); // Mostrar las más nuevas primero

        // Manejar error de la base de datos
        if (error) {
            console.error('Error de Supabase al obtener promociones:', error.message);
            return res.status(500).json({ message: 'Error al obtener las promociones.', details: error.message });
        }

        // Éxito
        res.status(200).json(data);

    } catch (error) {
        console.error('Error inesperado en GET /api/admin/promociones:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});



// ===============================================
// RUTA PARA CREAR PROMOCIONES (ADMIN)
// ===============================================

app.post('/api/promociones', authenticateAdmin, async (req, res) => {
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
// ⭐️ NUEVO: RUTAS DE API (INVENTARIO - MONGODB) ⭐️
// ===============================================

/**
 * RUTA: POST /api/products
 * Objetivo: Crear un nuevo producto en MongoDB.
 * Creado para: Sprint 1 - HU "Agregar productos"
 * Panel: admin_inv
 */
app.post('/api/products', async (req, res) => {
    // NOTA: Aquí deberíamos añadir un middleware de seguridad 
    // (como authenticateAdminInventario) más adelante.
    
    console.log('Recibida petición para CREAR producto:', req.body);
    
    try {
        // req.body contiene los datos del formulario (sku, name, price, etc.)
        const newProductData = req.body;
        
        // 1. Validar si el SKU ya existe (para evitar duplicados)
        const skuExistente = await Product.findOne({ sku: newProductData.sku });
        if (skuExistente) {
            return res.status(400).json({ 
                message: `Error: El SKU "${newProductData.sku}" ya está registrado.` 
            });
        }
        
        // 2. Crear el nuevo producto usando el "molde"
        const producto = new Product(newProductData);
        
        // 3. Guardar en la base de datos
        await producto.save();
        
        // 4. Enviar respuesta de éxito
        res.status(201).json({ 
            message: 'Producto agregado exitosamente.',
            producto: producto 
        });
        
    } catch (error) {
        // Manejo de errores (ej. campos requeridos faltantes)
        console.error('Error al guardar producto:', error.message);
        res.status(500).json({ 
            message: 'Error interno del servidor al guardar el producto.',
            details: error.message 
        });
    }
});


// ===============================================
// 3. RUTAS DE CAJERO (MOVIDAS DESDE cajeroRoutes)
// ===============================================

// ===============================================
// ⭐️ RUTA DE BÚSQUEDA DEL PDV (FALTANTE) ⭐️
// ===============================================

/**
 * RUTA: GET /api/productos/buscar?q=query
 * Objetivo: Buscar productos en MongoDB por nombre o SKU. Usada por el PDV.
 */
app.get('/api/productos/buscar', getUserIdFromToken, async (req, res) => {
    const query = req.query.q; 
    
    if (!query || query.length < 1) {
        return res.status(200).json([]);
    }
    
    try {
        // ⭐️ CORRECCIÓN APLICADA: Ahora el SKU usa $regex e 'i' para búsqueda flexible ⭐️
        const productos = await Product.find({ 
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { sku: { $regex: query, $options: 'i' } } // Búsqueda flexible por SKU/Código
            ],
            active: true // Asume que solo quieres productos activos
        }).select('_id name price stockQty').limit(20); 
        
        return res.status(200).json(productos);
        
    } catch (error) {
        console.error('Error en /api/productos/buscar:', error.message);
        return res.status(500).json({ 
            message: 'Error interno al buscar productos en inventario.',
            details: error.message 
        });
    }
});

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


app.post('/api/ventas/finalizar',getUserIdFromToken, async (req, res) => {
    // Nota: Asume que el middleware de autenticación ya extrajo el id_cajero
    const id_cajero = req.userId; // ID del usuario autenticado (cajero)
    const { id_corte, total_descuento, total_final, metodo_pago, detalles } = req.body;

    // 1. **Transacción de Venta en PostgreSQL**
    try {
        // Llama a la función PL/pgSQL
        const { data, error } = await supabase
            .rpc('registrar_venta', {
                p_id_cajero: id_cajero,
                p_id_corte: id_corte,
                p_total_descuento: total_descuento,
                p_total_final: total_final,
                p_metodo_pago: metodo_pago,
                p_detalles: detalles // Pasa el array de detalles como JSONB
            })
            .single();

        if (error) throw new Error(error.message);

        const id_venta = data.id_v;
        const ticket_numero = data.ticket_num;

        // 2. **Actualización de Stock en MongoDB (CRÍTICO)**
        // Esto debería envolverse en una transacción de MongoDB si es posible.
        const bulkOps = detalles.map(d => ({
            updateOne: {
                filter: { _id: d.id_producto_mongo, stockQty: { $gte: d.cantidad } }, // Condición para evitar stock negativo
                update: { $inc: { stockQty: -d.cantidad } }
            }
        }));

        const result = await Product.bulkWrite(bulkOps);

        // 3. Respuesta Exitosa
        return res.status(200).json({ 
            message: 'Venta registrada y stock actualizado.', 
            id_venta, 
            ticket_numero 
        });

    } catch (error) {
        console.error('Error al finalizar la venta:', error);
        // ⚠️ En un sistema real, si el stock falla, DEBES revertir la venta de PostgreSQL.
        // Esto se logra con una función transaccional más compleja o un sistema de colas.
        res.status(500).json({ message: 'Fallo al procesar la venta.', error: error.message });
    }
});

app.post('/api/caja/cerrar', getUserIdFromToken, async (req, res) => {
    const id_cajero = req.userId; // ID del usuario autenticado (cajero)
    const { id_corte, monto_declarado } = req.body;

    if (!id_corte || monto_declarado === undefined) {
        return res.status(400).json({ message: 'Faltan parámetros de corte.' });
    }

    // 1. **Ejecutar la función PL/pgSQL para el cierre**
    try {
        const { data, error } = await supabase
            .rpc('cerrar_corte_caja', {
                p_id_corte: id_corte,
                p_monto_declarado: monto_declarado
            })
            .single();

        if (error) {
            // Captura el error de la función (ej: CORTE_NO_ACTIVO)
            return res.status(400).json({ message: error.message });
        }
        
        // El resultado 'data' contiene el reporte de la función:
        // monto_inicial, ventas_efectivo, monto_calculado, diferencia
        
        // 2. Respuesta Exitosa con el reporte final
        return res.status(200).json({ 
            message: 'Corte de caja cerrado con éxito.',
            reporte: data,
            diferencia: data.diferencia
        });

    } catch (error) {
        console.error('Error al cerrar el corte de caja:', error);
        res.status(500).json({ message: 'Fallo interno al cerrar la caja.', error: error.message });
    }
});




// ===============================================
// 4. RUTAS ESTÁTICAS Y ARRANQUE DEL SERVIDOR
// ===============================================

// ⭐️ CORRECCIÓN ⭐️

// 1. Sirve la carpeta 'frontend' bajo el prefijo '/frontend'
//    Esto arregla: /frontend/admin_inv/admininv.js (Error 404)
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// 2. Sirve la carpeta raíz (TiendaOnlinePDV)
//    Esto arregla: index.html, index.css, index.js
app.use(express.static(path.join(__dirname, '..')));


// Esta línea AHORA SÍ va al final
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor backend corriendo en http://0.0.0.0:${port}`);
});

// Exportaciones
module.exports = { app, supabase, traducirErrorSupabase, authenticateAdmin, getUserIdFromToken };

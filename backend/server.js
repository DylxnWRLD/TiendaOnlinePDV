const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('./models/product.model'); // ⭐️ NUEVO: Importa el modelo
const multer = require('multer');

// Configuración de Multer
const storage = multer.memoryStorage(); // Guarda el archivo en la RAM temporalmente
const upload = multer({ storage: storage });

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
app.use(express.json());


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
 * RUTA: PUT /api/products/:id (Modificada para subir imágenes)
 * Objetivo: Actualizar un producto existente en MongoDB.
 */
app.put('/api/products/:id', upload.single('imageUpload'), async (req, res) => {
    try {
        const id = req.params.id;
        const datosActualizados = req.body;
        const file = req.file; // El nuevo archivo de imagen (si se subió)

        // 1. Convertir FormData strings a tipos correctos
        datosActualizados.price = parseFloat(datosActualizados.price);
        datosActualizados.stockQty = parseInt(datosActualizados.stockQty, 10);
        datosActualizados.minStock = parseInt(datosActualizados.minStock, 10);
        datosActualizados.active = datosActualizados.active === 'true';

        // 2. Manejar la subida de una NUEVA imagen (si se envió una)
        if (file) {
            console.log('Actualizando imagen en Supabase Storage...');
            const fileName = `product-${datosActualizados.sku}-${Date.now()}${path.extname(file.originalname)}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600'
                });

            if (uploadError) {
                throw new Error(`Error al subir nueva imagen a Supabase: ${uploadError.message}`);
            }

            const { data: publicUrlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            // Reemplazar/agregar la imagen en el array
            if (publicUrlData) {
                datosActualizados.images = [publicUrlData.publicUrl];
            }
        }
        // Si no se subió un archivo (file es null),
        // 'datosActualizados.images' no se tocará y Mongo mantendrá la imagen antigua.

        // 3. Evitar que el _id se sobrescriba
        delete datosActualizados._id;

        // 4. Validar si el SKU se está cambiando a uno que ya existe
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

        // 5. Buscar y actualizar el producto
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

/**
 * RUTA: GET /api/products/lowstock
 * Objetivo: Obtener la lista de productos con stockQty <= minStock.
 * Creado para: Sprint 2 - HU "Alertas automáticas de stock"
 * Panel: admin_inv
 */
app.get('/api/products/lowstock', async (req, res) => {
    try {
        // Busca productos donde el stock actual (stockQty) es menor o igual al stock mínimo (minStock)
        const productosLowStock = await Product.find({
            $expr: { $lte: ['$stockQty', '$minStock'] },
            active: true // Solo productos activos
        }).select('sku name stockQty minStock');

        res.status(200).json(productosLowStock);
    } catch (error) {
        console.error('Error al obtener productos con stock bajo:', error.message);
        res.status(500).json({
            message: 'Error interno del servidor al consultar stock bajo.',
            details: error.message
        });
    }
});


/**
 * RUTA: GET /api/products/:id
 * Objetivo: Obtener un solo producto por su ID de Mongo.
 * Creado para: Llenar el formulario de "Editar producto".
 */
app.get('/api/products/:id', async (req, res) => {
    // NOTA: Añadir seguridad de AdminInventario aquí
    try {
        const id = req.params.id;

        // Busca el producto por su ID de Mongo
        const producto = await Product.findById(id);

        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }

        // Devuelve el producto encontrado
        res.status(200).json(producto);

    } catch (error) {
        console.error('Error al obtener producto por ID:', error.message);
        // Maneja el caso de un ID de Mongo mal formado
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'ID de producto no válido.' });
        }
        res.status(500).json({
            message: 'Error interno del servidor.',
            details: error.message
        });
    }
});

// ===============================================
// ⭐️ NUEVO: RUTAS DE COMENTARIOS DE PRODUCTOS
// ===============================================

/**
 * RUTA: GET /api/products/:id/comments
 * Objetivo: Obtener todos los comentarios para un producto específico.
 * Es pública, cualquiera puede leer los comentarios.
 */
app.get('/api/products/:id/comments', async (req, res) => {
    const productId = req.params.id; // Este es el ID de Mongo
    console.log(`[Comentarios] Petición GET para producto: ${productId}`);

    try {
        // Hacemos un JOIN para obtener el correo del cliente desde la tabla 'cliente_online'
        const { data, error } = await supabase
            .from('comentarios_producto')
            .select(`
                id_comentario,
                comentario,
                created_at,
                cliente_online (
                    correo 
                )
            `)
            .eq('id_producto_mongo', productId)
            .order('created_at', { ascending: false }); // Mostrar más nuevos primero

        if (error) {
            console.error('Error de Supabase al obtener comentarios:', error.message);
            throw error;
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('Error al obtener comentarios:', error.message);
        res.status(500).json({ message: 'Error al cargar comentarios.' });
    }
});

/**
 * RUTA: POST /api/products/:id/comments
 * Objetivo: Publicar un nuevo comentario.
 * Está protegida y requiere que el usuario esté logueado.
 */
app.post('/api/products/:id/comments', getUserIdFromToken, async (req, res) => {
    const id_producto_mongo = req.params.id;
    const id_usuario_auth = req.userId; // ID del token (de auth.users)
    const { comentario } = req.body;

    if (!comentario || comentario.trim() === '') {
        return res.status(400).json({ message: 'El comentario no puede estar vacío.' });
    }

    try {
        // 1. Encontrar el 'id_cliente' (PK de cliente_online) usando el 'id_usuario' (de auth)
        // Esto es necesario porque tu tabla 'comentarios_producto' se relaciona con 'cliente_online'.
        const { data: cliente, error: clienteError } = await supabase
            .from('cliente_online')
            .select('id_cliente') // El Primary Key de cliente_online
            .eq('id_usuario', id_usuario_auth) // El Foreign Key a auth.users
            .single();

        if (clienteError || !cliente) {
            console.error('Intento de comentar sin perfil de cliente (quizás no ha comprado):', id_usuario_auth, clienteError?.message);
            return res.status(403).json({ message: 'No se encontró tu perfil de cliente. Debes haber realizado una compra para poder comentar.' });
        }

        // 2. Ahora sí, insertar el comentario con el 'id_cliente' correcto
        const { data: newComment, error: insertError } = await supabase
            .from('comentarios_producto')
            .insert({
                id_cliente: cliente.id_cliente, // Usamos el PK de cliente_online
                id_producto_mongo: id_producto_mongo,
                comentario: comentario
            })
            .select() // Devolvemos el comentario recién creado
            .single();

        if (insertError) {
            console.error('Error de Supabase al insertar comentario:', insertError.message);
            throw insertError;
        }

        // 3. Devolvemos el nuevo comentario (para añadirlo a la UI si queremos)
        res.status(201).json(newComment);

    } catch (error) {
        console.error('Error al publicar comentario:', error.message);
        res.status(500).json({ message: 'Error interno al guardar el comentario.' });
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






app.get('/api/promociones/producto/:idProducto', async (req, res) => {
    try {
        const { idProducto } = req.params;
        const producto = await Product.findById(idProducto);

        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        if (producto.descuento && producto.descuento.activa) {
            return res.json({
                activa: true,
                tipo_descuento: producto.descuento.tipo_descuento,
                valor: producto.descuento.valor,
                nombre_promo: producto.descuento.nombre_promo
            });
        }

        return res.json({ activa: false, message: 'No hay promociones activas para este producto.' });
    } catch (err) {
        console.error('Error obteniendo promoción:', err);
        res.status(500).json({ error: 'Error al obtener promoción.' });
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
                    valor_regla: (tipo_regla === 'GLOBAL' || tipo_regla === 'MARCA' || tipo_regla === 'PRODUCTO' || tipo_regla === 'PRECIO' || tipo_regla === 'CANTIDAD') ? null : valor_regla,
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

        const promo = data[0];
        //let resultadoAplicacion = null;

        let filter = {};
        switch (promo.tipo_regla) {
            case 'MARCA':
                filter = { brand: promo.valor_regla };
                break;

            case 'PRODUCTO':
                filter = { name: promo.valor_regla };
                break;
            case 'GLOBAL':
                filter = {}; // Todos los productos
                break;
            case 'CANTIDAD':
                filter = {};
                break;
            case 'PRECIO':
                filter = { price: { $gte: parseFloat(promo.valor_regla) } };
                break;
            default:
                filter = {};
        }


        const descuentoData = {
            tipo_descuento: promo.tipo_descuento,  // 'PORCENTAJE' o 'MONTO'
            valor: promo.valor,           // cantidad numérica
            nombre_promo: promo.nombre,
            activa: promo.activa,
            id_promocion_supabase: promo.id
        };

        const result = await Product.updateMany(filter, {
            $set: { descuento: descuentoData }
        });

        console.log(`Se actualizaron ${result.modifiedCount} productos con la promoción.`);


        res.status(201).json(data[0]);

    } catch (error) {
        console.error('Error inesperado en /api/admin/promociones:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }

});












// ===============================================
// RUTA PARA APLICAR PROMOCIONES A PRODUCTOS (SOLO MongoDB)
// ===============================================
app.post('/api/promociones/aplicar/:idPromocion', authenticateAdmin, async (req, res) => {
    const { idPromocion } = req.params;

    try {
        // 1. Obtener la promoción de Supabase
        const { data: promocion, error: promocionError } = await supabase
            .from('promociones')
            .select('*')
            .eq('id', idPromocion)
            .single();

        if (promocionError || !promocion) {
            return res.status(404).json({ message: 'Promoción no encontrada.' });
        }

        if (!promocion.activa) {
            return res.status(400).json({ message: 'La promoción no está activa.' });
        }

        // 2. Construir filtro para MongoDB según el tipo_regla
        let filter = {};
        switch (promocion.tipo_regla) {
            case 'MARCA':
                filter = { brand: promocion.valor_regla };
                break;
            case 'CATEGORIA':
                filter = { category: promocion.valor_regla };
                break;
            case 'PRODUCTO':
                filter = { name: promocion.valor_regla };
                break;
            case 'GLOBAL':
                filter = {}; // Todos los productos
                break;

            case 'PRECIO':
                filter = { price: { $gte: parseFloat(promocion.valor_regla) } };
                break;
            case 'CANTIDAD':

                filter = {};
                break;
            default:
                filter = {};
        }

        // 3. Preparar datos de descuento
        const descuentoData = {
            tipo_descuento: promocion.tipo_descuento,
            valor: promocion.valor,
            nombre_promo: promocion.nombre,
            activa: promocion.activa,
            id_promocion_supabase: promocion.id,
            tipo_regla: promocion.tipo_regla,
            valor_regla: promocion.valor_regla
        };

        // 4. Aplicar descuento a los productos
        const result = await Product.updateMany(filter, {
            $set: { descuento: descuentoData }
        });

        console.log(`Promoción "${promocion.nombre}" aplicada a ${result.modifiedCount} productos`);

        res.status(200).json({
            message: `Promoción aplicada a ${result.modifiedCount} productos.`,
            productosAfectados: result.modifiedCount,
            promocion: promocion.nombre
        });

    } catch (error) {
        console.error('Error al aplicar promoción:', error.message);
        res.status(500).json({
            message: 'Error interno al aplicar promoción.',
            details: error.message
        });
    }
});

// ===============================================
// RUTA PARA REMOVER PROMOCIONES DE PRODUCTOS
// ===============================================
app.post('/api/promociones/remover/:idPromocion', authenticateAdmin, async (req, res) => {
    const { idPromocion } = req.params;

    try {
        // Remover descuento de todos los productos que tengan esta promoción
        const result = await Product.updateMany(
            { 'descuento.id_promocion_supabase': idPromocion },
            { $set: { descuento: null } }
        );

        console.log(`🗑️ Promoción removida de ${result.modifiedCount} productos`);

        res.status(200).json({
            message: `Promoción removida de ${result.modifiedCount} productos.`,
            productosAfectados: result.modifiedCount
        });

    } catch (error) {
        console.error('Error al remover promoción:', error.message);
        res.status(500).json({
            message: 'Error interno al remover promoción.',
            details: error.message
        });
    }
});






// ===============================================
// RUTA PARA OBTENER PRODUCTOS CON PROMOCIONES ACTIVAS
// ===============================================
app.get('/api/productos/con-promociones', async (req, res) => {
    try {
        const productos = await Product.find({
            'descuento.activa': true,
            'active': true
        }).select('name brand price descuento images');

        res.status(200).json(productos);
    } catch (error) {
        console.error('Error al obtener productos con promociones:', error.message);
        res.status(500).json({
            message: 'Error interno al obtener productos con promociones.',
            details: error.message
        });
    }
});













/**
 * RUTA: Editar una promoción existente
 * PUT /promociones/:id
 * Objetivo: Editar una promoción en la tabla "promociones".
 * Creado para: Panel de Administración
 */
app.put("/api/promociones/:id", authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, tipo_descuento, valor, tipo_regla, valor_regla, fecha_inicio, fecha_fin, activa } = req.body;

    try {

        const { data: promocionAnterior, error: fetchError } = await supabase
            .from('promociones')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !promocionAnterior) {
            return res.status(404).json({ message: 'Promoción no encontrada.' });
        }

        const { data, error } = await supabase
            .from("promociones")
            .update({
                nombre,
                descripcion,
                tipo_descuento,
                valor,
                tipo_regla,
                valor_regla,
                fecha_inicio,
                fecha_fin,
                activa
            })
            .eq("id", id)
            .select();

        if (error) throw error;

        res.status(200).json({ mensaje: "Promoción actualizada", data });

        const promocionActualizada = data[0];

        try {
            await syncPromocionToMongoDB(promocionActualizada, promocionAnterior);
        } catch (mongoError) {
            console.error('Error al sincronizar con MongoDB:', mongoError);
            // No retornamos error aquí para no afectar la respuesta principal
        }

        res.status(200).json({ 
            mensaje: "Promoción actualizada exitosamente", 
            data: promocionActualizada
        });


    } catch (err) {
        console.error('Error general al editar promoción', err);
        res.status(500).json({ error: "Error al editar promoción" });
    }
});















// Eliminar una promoción
app.delete("/api/promociones/:id", authenticateAdmin, async (req, res) => {
    const { id } = req.params;

    try {

        const { data: promocion, error: fetchError } = await supabase
            .from('promociones')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !promocion) {
            return res.status(404).json({ message: 'Promoción no encontrada.' });
        }


        const { error } = await supabase
            .from("promociones")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.status(200).json({ mensaje: "Promoción eliminada" });

        try {
            await removePromocionFromMongoDB(id);
        } catch (mongoError) {
            console.error('Error al remover promoción de MongoDB:', mongoError);
           
        }

        res.status(200).json({ 
            mensaje: "Promoción eliminada exitosamente",
            promocionEliminada: promocion 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar promoción" });
    }
});


// Función para sincronizar promoción con MongoDB
async function syncPromocionToMongoDB(promocionActualizada, promocionAnterior) {
    try {
        // Si la promoción está inactiva, remover de todos los productos
        if (!promocionActualizada.activa) {
            await removePromocionFromMongoDB(promocionActualizada.id);
            return;
        }

        // Si la promoción está activa, aplicar a los productos correspondientes
        let filter = {};
        
        switch (promocionActualizada.tipo_regla) {
            case 'MARCA':
                filter = { brand: promocionActualizada.valor_regla };
                break;
            case 'PRODUCTO':
                filter = { name: promocionActualizada.valor_regla };
                break;
            case 'GLOBAL':
                filter = {}; // Todos los productos
                break;
            case 'CANTIDAD':
                filter = {};
                break;
            case 'PRECIO':
                filter = { price: { $gte: parseFloat(promocionActualizada.valor_regla) } };
                break;
            default:
                filter = {};
        }

        // Preparar datos del descuento
        const descuentoData = {
            tipo_descuento: promocionActualizada.tipo_descuento,
            valor: promocionActualizada.valor,
            nombre_promo: promocionActualizada.nombre,
            activa: promocionActualizada.activa,
            id_promocion_supabase: promocionActualizada.id,
            //tipo_regla: promocionActualizada.tipo_regla,
            //valor_regla: promocionActualizada.valor_regla
        };

        // Primero, remover la promoción anterior de los productos que ya no califican
        if (promocionAnterior) {
            let oldFilter = {};
            switch (promocionAnterior.tipo_regla) {
                case 'MARCA':
                    oldFilter = { brand: promocionAnterior.valor_regla };
                    break;
                case 'PRODUCTO':
                    oldFilter = { name: promocionAnterior.valor_regla };
                    break;
                case 'GLOBAL':
                    oldFilter = {};
                    break;
                case 'PRECIO':
                    oldFilter = { price: { $gte: parseFloat(promocionAnterior.valor_regla) } };
                    break;
                default:
                    oldFilter = {};
            }

            // Remover promoción anterior de productos que ya no califican
            await Product.updateMany(
                { 
                    ...oldFilter,
                    'descuento.id_promocion_supabase': promocionActualizada.id 
                },
                { $set: { descuento: null } }
            );
        }

        // Aplicar la promoción actualizada a los productos que califican
        const result = await Product.updateMany(filter, {
            $set: { descuento: descuentoData }
        });

        console.log(`🔄 Promoción "${promocionActualizada.nombre}" sincronizada con ${result.modifiedCount} productos en MongoDB`);

    } catch (error) {
        console.error('❌ Error en syncPromocionToMongoDB:', error.message);
        throw error;
    }
}

// Función para remover promoción de MongoDB
async function removePromocionFromMongoDB(idPromocion) {
    try {
        const result = await Product.updateMany(
            { 'descuento.id_promocion_supabase': idPromocion },
            { $set: { descuento: null } }
        );

        console.log(`🗑️ Promoción ${idPromocion} removida de ${result.modifiedCount} productos en MongoDB`);

        return result;
    } catch (error) {
        console.error('❌ Error en removePromocionFromMongoDB:', error.message);
        throw error;
    }
}













// ===============================================
// NUEVO: RUTA DE REPORTE DE VENTAS (DINÁMICO)
// ===============================================

app.get('/api/reports/sales', authenticateAdmin, async (req, res) => {
    const { startDate, endDate } = req.query;
    console.log(`Petición de Reporte de Ventas de ${startDate} a ${endDate}`);

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        // Llamar a la nueva función SQL que acepta fechas
        const { data, error } = await supabase.rpc('get_sales_by_date_range', {
            start_date: startDate,
            end_date: endDate
        });

        if (error) {
            console.error('Error en RPC get_sales_by_date_range:', error.message);
            // Error común si la función no se creó:
            if (error.message.includes('function get_sales_by_date_range')) {
                return res.status(500).json({ message: 'Error Crítico: La función SQL "get_sales_by_date_range" no existe en Supabase. Asegúrate de crearla en el SQL Editor.' });
            }
            throw error;
        }

        // Formato para Chart.js
        const report = {
            labels: data.map(d => d.day_label),
            data: data.map(d => d.total_sales)
        };

        res.status(200).json(report);

    } catch (error) {
        console.error('Error en /api/reports/sales:', error.message);
        res.status(500).json({ message: 'Error al generar reporte de ventas.' });
    }
});

// ===============================================
// ⭐️ RUTA DE ESTADÍSTICAS (ACTUALIZADA CON REPORTES)
// ===============================================
app.get('/api/stats/full', authenticateAdmin, async (req, res) => {
    console.log('Petición para obtener TODAS las estadísticas (Admin) recibida.');
    try {
        // --- Fechas ---
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // --- Consultas a Supabase (PostgreSQL) ---
        const [
            salesData,
            totalOrders,
            activeUsers,
            activeCustomers,
            activePromos,
            chartData,
            usersReportData
        ] = await Promise.all([
            supabase.from('ventas').select('total_final, fecha_hora'),
            supabase.from('ventas').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'Activo'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('role_id', 2).eq('status', 'Activo'),
            supabase.from('promociones').select('*', { count: 'exact', head: true }).eq('activa', true),
            supabase.rpc('get_daily_sales_last_7_days'),
            supabase.from('users').select('role_id, status').eq('status', 'Activo')
        ]);

        // --- Consultas a MongoDB ---
        const [
            totalProducts,
            productsReportData
        ] = await Promise.all([
            Product.countDocuments(),
            Product.find().sort({ stockQty: -1 }).limit(5).select('name stockQty')
        ]);

        // --- Procesar datos de Supabase ---
        const allSales = salesData.data || [];

        const monthlyRevenue = allSales
            .filter(sale => new Date(sale.fecha_hora) >= firstDayOfMonth)
            .reduce((acc, v) => acc + v.total_final, 0);

        const totalSales = allSales.reduce((acc, v) => acc + v.total_final, 0);

        // --- Procesar Gráfico (Rendimiento) ---
        const labels = chartData.data ? chartData.data.map(d => d.day_label) : [];
        const sales = chartData.data ? chartData.data.map(d => d.total_sales) : [];

        // Procesar Reporte de Usuarios
        const roleIdToName = { 1: 'Admin', 2: 'Cliente', 3: 'Cajero', 4: 'AdminInventario' };
        const userCounts = (usersReportData.data || []).reduce((acc, user) => {
            const roleName = roleIdToName[user.role_id] || 'Cliente';
            acc[roleName] = (acc[roleName] || 0) + 1;
            return acc;
        }, {});
        const usersReport = {
            labels: Object.keys(userCounts),
            data: Object.values(userCounts)
        };

        //Procesar Reporte de Productos
        const productsReport = {
            labels: productsReportData.map(p => p.name),
            data: productsReportData.map(p => p.stockQty)
        };

        // --- Enviar respuesta completa ---
        res.status(200).json({
            // Dashboard Stats
            totalSales: totalSales,
            totalUsers: activeUsers.count || 0,
            totalProducts: totalProducts || 0,
            activePromotions: activePromos.count || 0,
            // Performance Stats
            monthlyRevenue: monthlyRevenue,
            totalOrders: totalOrders.count || 0,
            activeCustomers: activeCustomers.count || 0,
            conversionRate: 0,
            // Chart Data (Rendimiento)
            chartData: {
                labels: labels,
                sales: sales
            },
            // Report Data (Reportes)
            usersReport: usersReport,
            productsReport: productsReport
        });

    } catch (error) {
        console.error('Error al cargar estadísticas completas:', error.message);
        if (error.message.includes('function get_daily_sales_last_7_days does not exist')) {
            return res.status(500).json({ message: 'Error Crítico: La función SQL "get_daily_sales_last_7_days" no existe en la base de datos Supabase. Por favor, créala usando el SQL Editor.' });
        }
        res.status(500).json({ message: 'Error interno al cargar estadísticas.' });
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
/**
 * RUTA: POST /api/products (Modificada para subir imágenes)
 * Objetivo: Crear un nuevo producto, subiendo la imagen a Supabase
 */
// ⭐️ CAMBIO: Usamos upload.single('imageUpload') para atrapar el archivo
app.post('/api/products', upload.single('imageUpload'), async (req, res) => {
    console.log('Recibida petición para CREAR producto (con imagen)');

    try {
        // 'req.body' ahora contiene los campos de texto
        const newProductData = req.body;
        // 'req.file' contiene el archivo de imagen (si se envió)
        const file = req.file;

        // Convertir los datos de FormData de string a Number/Boolean
        newProductData.price = parseFloat(newProductData.price);
        newProductData.stockQty = parseInt(newProductData.stockQty, 10);
        newProductData.minStock = parseInt(newProductData.minStock, 10);
        newProductData.active = newProductData.active === 'true';

        // ⬇️ ⭐️ AGREGA ESTA LÍNEA ⭐️ ⬇️
        console.log('--- ¡¡VERIFICACIÓN DE TIPO EXITOSA!! Tipo de precio:', typeof newProductData.price);
        // ⬆️ ⭐️ AGREGA ESTA LÍNEA ⭐️ ⬆️

        let imageUrls = [];

        // --- 1. Lógica de Subida de Imagen ---
        if (file) {
            console.log('Subiendo archivo a Supabase Storage...');
            // Damos un nombre único al archivo
            const fileName = `product-${newProductData.sku}-${Date.now()}${path.extname(file.originalname)}`;

            // Subimos el archivo al bucket 'products'
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('products') // El bucket que creamos en el Paso 1
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600'
                });

            if (uploadError) {
                throw new Error(`Error al subir imagen a Supabase: ${uploadError.message}`);
            }

            // --- 2. Obtenemos la URL Pública ---
            const { data: publicUrlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            if (publicUrlData) {
                imageUrls.push(publicUrlData.publicUrl);
            }
        }

        // Asignamos la URL (si existe) a los datos que guardaremos en Mongo
        newProductData.images = imageUrls;

        // --- 3. Lógica de Guardado en MongoDB (como antes) ---
        const skuExistente = await Product.findOne({ sku: newProductData.sku });
        if (skuExistente) {
            return res.status(400).json({
                message: `Error: El SKU "${newProductData.sku}" ya está registrado.`
            });
        }



        const producto = new Product(newProductData);
        await producto.save();


        res.status(201).json({
            message: 'Producto agregado exitosamente (con imagen).',
            producto: producto
        });

    } catch (error) {
        console.error('Error al guardar producto con imagen:', error.message);
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

/**
 * RUTA: POST /api/caja/calcular_reporte (1er Paso: Solo calcula, no cierra)
 * Objetivo: Llama a la RPC calcular_corte_caja.
 */
app.post('/api/caja/calcular_reporte', getUserIdFromToken, async (req, res) => {
    const userId = req.userId;
    const { id_corte, monto_declarado } = req.body;

    if (!id_corte || monto_declarado === undefined || typeof monto_declarado !== 'number') {
        return res.status(400).json({ message: 'Faltan o son inválidos los parámetros de corte.' });
    }

    // NOTA: Se asume que el rol Cajero ya fue verificado antes de llegar al PDV.

    try {
        // Llama a la nueva función PL/pgSQL para SOLO CALCULAR (no actualiza estado)
        const { data, error } = await supabase
            .rpc('calcular_corte_caja', { // ⚠️ Asume que ya creaste esta RPC en Supabase
                p_id_corte: id_corte,
                p_monto_declarado: monto_declarado
            })
            .single();

        if (error) {
            console.error('[RPC ERROR]: Error en calcular_corte_caja:', error.message);
            // Manejamos el caso de que el corte no esté abierto
            if (error.message.includes('CORTE_NO_ACTIVO')) {
                return res.status(409).json({ message: 'El corte no está activo o ya fue cerrado.' });
            }
            return res.status(500).json({ message: 'Error en DB al calcular reporte.', details: error.message });
        }

        // Devuelve los resultados del cálculo (monto_calculado, diferencia, etc.)
        return res.status(200).json({
            message: 'Cálculo de reporte exitoso.',
            reporte: data
        });

    } catch (error) {
        console.error('[FATAL ERROR]: Cálculo de reporte falló:', error);
        res.status(500).json({ message: 'Error interno del servidor al calcular el reporte.' });
    }
});


/**
 * RUTA: POST /api/caja/cerrar_definitivo (2do Paso: Cierre final)
 * Objetivo: Llama a la RPC cerrar_corte_definitivo y cambia el estado a CERRADA.
 */
app.post('/api/caja/cerrar_definitivo', getUserIdFromToken, async (req, res) => {
    const userId = req.userId;
    const { id_corte, monto_declarado, monto_calculado } = req.body;

    if (!id_corte || monto_declarado === undefined || monto_calculado === undefined) {
        return res.status(400).json({ message: 'Faltan parámetros de cierre definitivo.' });
    }

    try {
        // Llama a la función PL/pgSQL para el CIERRE FINAL
        const { data, error } = await supabase
            .rpc('cerrar_corte_definitivo', { // ⚠️ Asume que ya creaste esta RPC en Supabase
                p_id_corte: id_corte,
                p_monto_declarado: monto_declarado,
                p_monto_calculado: monto_calculado // Se utiliza el valor ya calculado/validado
            })
            .single(); // Devuelve el estado 'CERRADA'

        if (error) {
            console.error('[RPC ERROR]: Error en cerrar_corte_definitivo:', error.message);
            if (error.message.includes('CORTE_NO_ACTIVO')) {
                // Si ya está cerrado, no hay problema, devolvemos un 200 para limpiar el frontend
                return res.status(200).json({ message: 'Corte ya cerrado o no activo, pero flujo completado.' });
            }
            return res.status(500).json({ message: 'Error en DB al cerrar definitivamente.', details: error.message });
        }

        // Respuesta Exitosa
        return res.status(200).json({
            message: 'Corte de caja cerrado con éxito.',
            estado: data
        });

    } catch (error) {
        console.error('[FATAL ERROR]: Cierre definitivo falló:', error);
        res.status(500).json({ message: 'Error interno del servidor en cierre crítico.' });
    }
});

app.post('/api/ventas/finalizar', getUserIdFromToken, async (req, res) => {
    // Nota: Asume que el middleware de autenticación ya extrajo el id_cajero
    const id_cajero = req.userId; // ID del usuario autenticado (cajero)
    const { id_corte, total_descuento, total_final, metodo_pago, detalles } = req.body;

    try {
        // 1. **Transacción de Venta en PostgreSQL**
        console.log('➡️ Llamando a función registrar_venta en Supabase...');
        // Llama a la función PL/pgSQL
        const { data, error } = await supabase
            .rpc('registrar_venta', {
                p_id_cajero: id_cajero,
                p_id_corte: id_corte,
                p_total_descuento: total_descuento || 0,
                p_total_final: total_final,
                p_metodo_pago: metodo_pago,
                p_detalles: detalles // Pasa el array de detalles como JSONB
            })
            .single();

        if (error) throw new Error(error.message);

        const id_venta = data.id_v;
        const ticket_numero = data.ticket_num;

        console.log('✅ Venta registrada en Supabase:', data);
        // 2. **Actualización de Stock en MongoDB (CRÍTICO)**
        // Esto debería envolverse en una transacción de MongoDB si es posible.
        const bulkOps = detalles.map(d => ({
            updateOne: {
                filter: { _id: d.id_producto_mongo, stockQty: { $gte: d.cantidad } }, // Condición para evitar stock negativo
                update: { $inc: { stockQty: -d.cantidad } }
            }
        }));

        console.log('🧩 Ejecutando bulkWrite de stock en Mongo...');
        const result = await Product.bulkWrite(bulkOps);
        console.log('✅ Stock actualizado en Mongo:', result);
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

/**
 * RUTA: PUT /api/paquetes/:id/estado
 * Objetivo: Permitir al repartidor actualizar el estado del envío.
 * Se requiere autenticación (asume que Repartidor ya está autenticado).
 */
app.put('/api/paquetes/:id/estado', getUserIdFromToken, async (req, res) => {
    const pedidoId = req.params.id;
    const { nuevo_estado, mensaje_extra } = req.body; // mensaje_extra es opcional para detalles
    const userId = req.userId; // ID del repartidor

    if (!nuevo_estado) {
        return res.status(400).json({ message: 'Se requiere el nuevo estado.' });
    }

    try {
        // 1. Obtener el pedido actual para obtener el historial existente
        const { data: currentPedido, error: fetchError } = await supabase
            .from('pedidos')
            .select('historial_seguimiento')
            .eq('id', pedidoId)
            .single();

        if (fetchError) {
            console.error('Error al obtener pedido para actualizar estado:', fetchError.message);
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        const currentHistorial = currentPedido.historial_seguimiento || [];
        const newEvent = {
            estado: nuevo_estado,
            fecha: new Date().toISOString(),
            mensaje: mensaje_extra || `El paquete ha cambiado a estado: ${nuevo_estado}`,
            // Opcional: registrar quién hizo la actualización
            // updated_by: userId 
        };

        // Añadir el nuevo evento al historial
        const updatedHistorial = [...currentHistorial, newEvent];

        // 2. Actualizar el estado_envio y el historial_seguimiento
        const { data, error } = await supabase
            .from('pedidos')
            .update({
                estado_envio: nuevo_estado, // Actualiza el campo de estado actual
                historial_seguimiento: updatedHistorial, // Actualiza el historial
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', pedidoId)
            .select();

        if (error) {
            console.error('Error Supabase al actualizar estado y historial:', error.message);
            return res.status(500).json({ message: 'Error interno al actualizar el estado del pedido.' });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado o ID incorrecto.' });
        }

        res.status(200).json({
            message: `Estado de pedido ${pedidoId} actualizado a ${nuevo_estado} con éxito.`,
            pedido: data[0]
        });

    } catch (error) {
        console.error('Error fatal en ruta de actualización de estado:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

/**
 * RUTA: GET /api/paquetes/seguimiento/:id
 * Objetivo: Permitir al cliente rastrear el estado de su pedido.
 * Creado para: HU Seguimiento de paquetes.
 */
// Ruta para el seguimiento del cliente, ahora devuelve el historial completo
app.get('/api/paquetes/seguimiento/:id', async (req, res) => {
    const pedidoId = req.params.id;

    try {
        const { data, error } = await supabase
            .from('pedidos') // Asume que 'pedidos' contiene la info del seguimiento
            .select('id, direccion, fecha_estimada, estado_envio, historial_seguimiento') // Selecciona el historial
            .eq('id', pedidoId)
            .single();

        if (error && error.code === 'PGRST116') { // No rows found
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }
        if (error) {
            console.error('Error Supabase al obtener seguimiento:', error.message);
            return res.status(500).json({ message: 'Error interno del servidor.' });
        }

        if (!data) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        // Si historial_seguimiento es null o vacío, inicialízalo con el estado actual
        let historial = data.historial_seguimiento || [];
        if (historial.length === 0 && data.estado_envio) {
            historial.push({
                estado: data.estado_envio,
                fecha: data.created_at || new Date().toISOString(), // Usar fecha de creación del pedido o actual
                mensaje: `Estado inicial: ${data.estado_envio}`
            });
        }

        res.status(200).json({
            id: data.id,
            direccion: data.direccion,
            fecha_estimada: data.fecha_estimada,
            estado_actual: data.estado_envio, // Mantener para compatibilidad
            historial: historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) // Ordenar por fecha
        });

    } catch (error) {
        console.error('Error fatal en ruta de seguimiento:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================
// PROCESAMIENTO DE LA COMPRA ONLINE
// ===============================================

// Verificar si el cliente ya tiene datos registrados
app.get('/api/cliente/data', getUserIdFromToken, async (req, res) => {
    // El middleware getUserIdFromToken ya validó el token y puso req.userId
    const userId = req.userId; 
    
    try {
        // Consultar la tabla cliente_Online usando el userId (que es el id_usuario)
        const { data, error } = await supabase
            .from('cliente_online')
            .select('correo, direccion, telefono')
            .eq('id_usuario', userId)
            .maybeSingle(); // Esperamos 0 o 1 resultado

        if (error) {
            console.error('[DB ERROR - Cliente]:', error.message);
            return res.status(500).json({ message: 'Error al consultar datos del cliente.', details: error.message });
        }
        
        // Si data es null, es la primera compra. Devolvemos 404 (Not Found)
        if (!data) {
            return res.status(404).json({ message: 'Cliente no registrado (Primera compra).' });
        }

        // Si se encuentran datos, los devolvemos
        return res.status(200).json(data);

    } catch (e) {
        console.error('[SERVER ERROR]: Fallo al obtener datos del cliente.', e);
        return res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- ENDPOINT RPC PARA PROCESAR LA COMPRA ---
app.post('/api/rpc/procesar_compra_online', async (req, res) => {
    // 1. Extracción y Verificación de Token (Identidad del Cliente)
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'TOKEN_REQUIRED', message: 'Se requiere un token de autenticación para esta operación.' });
    }

    // 2. Extracción de Parámetros
    const {
        p_correo,
        p_direccion,
        p_telefono,
        p_total_final,
        p_metodo_pago,
        p_detalles // Array con id_producto_mongo, cantidad, etc.
    } = req.body;

    // 3. Crear un cliente Supabase con el token del usuario
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    try {
        console.log(`[RPC] Iniciando proceso de compra para usuario...`);

        // ==========================================================
        // ⭐️ ETAPA 1: VERIFICAR Y DEDUCIR STOCK EN MONGO ATLAS (CRÍTICO)
        // Esto debe ser ATÓMICO y ocurre ANTES de registrar la venta.
        // ==========================================================

        if (!p_detalles || p_detalles.length === 0) {
             return res.status(400).json({ error: 'CART_EMPTY', message: 'Los detalles de la venta están vacíos.' });
        }

        const bulkOps = p_detalles.map(d => ({
            updateOne: {
                filter: { 
                    _id: d.id_producto_mongo,
                    stockQty: { $gte: d.cantidad }
                },
                update: { $inc: { stockQty: -d.cantidad } }
            }
        }));

        console.log('🧩 Ejecutando bulkWrite condicional para deducción de stock...');

        let mongoResult;
        try {
            // La variable 'Product' es el modelo de Mongoose
            mongoResult = await Product.bulkWrite(bulkOps);
        } catch (mongoError) {
            console.error('[MONGO STOCK ERROR]: Falló la ejecución de bulkWrite.', mongoError.message);
            return res.status(500).json({ error: 'STOCK_CHECK_FAILED', message: 'Error al intentar verificar y deducir inventario.' });
        }

        // 🚨 VERIFICACIÓN DE ATOMICIDAD Y SOBREVENTA 🚨
        if (mongoResult.modifiedCount !== p_detalles.length) {
            // Si modifiedCount < p_detalles.length, significa que hubo insuficiencia de stock.
            console.warn('[STOCK FAILURE]: Se intentaron modificar %s productos, pero solo %s tuvieron stock suficiente. Abortando PG.', p_detalles.length, mongoResult.modifiedCount);
            
            // 🛑 CRÍTICO: Si modifiedCount > 0, necesitamos compensar los productos que SÍ se descontaron.
            if (mongoResult.modifiedCount > 0) {
                 const compensationOps = p_detalles.filter(d => d.cantidad <= d.cantidad).map(d => ({ 
                    updateOne: {
                        filter: { _id: d.id_producto_mongo },
                        update: { $inc: { stockQty: d.cantidad } } 
                    }
                }));
            }
            
            return res.status(409).json({ error: 'INSUFFICIENT_STOCK', message: 'Algunos productos ya no tienen stock suficiente. Por favor, revisa tu carrito.' });
        }

        console.log('✅ Stock verificado y deducido en Mongo. Productos modificados:', mongoResult.modifiedCount);

        // ==========================================================
        // ⭐️ ETAPA 2: REGISTRAR VENTA EN POSTGRESQL (SOLO si Mongo fue exitoso)
        // ==========================================================

        // 5. EJECUCIÓN: PostgreSQL (Registro de Cliente, Venta, Detalle)
        const { data, error } = await supabaseClient.rpc('procesar_compra_online', {
            p_correo, p_direccion, p_telefono, p_total_final, p_metodo_pago, p_detalles
        });

        if (error) {
            console.error('[DB ERROR - PG]:', error.message);
            
            // 🛑 LÓGICA DE COMPENSACIÓN (NECESARIA) 🛑
            // Si PG falla, el stock en Mongo YA FUE DEDUCIDO. Debemos revertirlo.
            
            const compensationOps = p_detalles.map(d => ({
                updateOne: {
                    filter: { _id: d.id_producto_mongo },
                    update: { $inc: { stockQty: d.cantidad } } // Reponer stock
                }
            }));

            try {
                await Product.bulkWrite(compensationOps);
                console.log('🛑 COMPENSACIÓN EXITOSA: Stock de Mongo revertido debido a fallo en PG.');
            } catch (compensationError) {
                console.error('❌ FALLO CRÍTICO DE COMPENSACIÓN: No se pudo revertir el stock en Mongo.', compensationError);
                // Aquí, el sistema está en un estado inconsistente (venta fallida, stock deducido).
                // Se requiere una alerta manual o un sistema de reintentos.
                return res.status(500).json({ error: 'CRITICAL_COMPENSATION_FAILURE', message: 'La venta falló y no se pudo revertir el stock. Se requiere intervención manual.' });
            }

            // Devolvemos el error de PG después de intentar la compensación.
            return res.status(500).json({ error: 'DB_TRANSACTION_FAILED_POST_STOCK_DEDUCTION', message: 'Fallo al registrar la venta en la base de datos.' });
        }

        // 6. Respuesta Final (Si Mongo y PG fueron exitosos)
        res.status(200).json(data);

    } catch (e) {
        console.error('[SERVER ERROR]:', e);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error inesperado en el servidor.' });
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

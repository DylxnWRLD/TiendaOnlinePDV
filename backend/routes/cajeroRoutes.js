// backend/routes/cajeroRoutes.js (CORRECCIÓN FINAL Y ROBUSTA)

const express = require('express');
const router = express.Router();
// NOTA IMPORTANTE: Esta línea requiere que server.js haga: 
// module.exports = { app, supabase, ... };
const { supabase } = require('../server'); 


// ===============================================
// MIDDLEWARE DE AUTENTICACIÓN LOCAL (getUserIdFromToken)
// ⭐️ CORRECCIÓN: Añadido try...catch para evitar fallos 500/HTML en Render ⭐️
// ===============================================
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
        // ⭐️ Captura errores críticos (ej. fallos de conexión API) y asegura JSON ⭐️
        console.error('[FATAL ERROR]: Validación de Token falló críticamente:', error.message);
        return res.status(500).json({ message: 'Error interno del servidor al validar sesión.' });
    }
}


// ===============================================
// RUTA: POST /caja/abrir (Apertura de Caja)
// ===============================================
router.post('/caja/abrir', getUserIdFromToken, async (req, res) => {
    const userId = req.userId;
    const { monto_inicial } = req.body;

    if (typeof monto_inicial !== 'number' || monto_inicial < 0) {
        return res.status(400).json({ message: 'Monto inicial inválido o faltante.' });
    }
    
    // ⭐️ 1. VERIFICACIÓN DE ROL CONTRA LA BD (role_id = 3) ⭐️
    try {
        const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role_id')
            .eq('id', userId)
            .maybeSingle(); 

        // Si hay error en la DB o si el rol no es Cajero (ID 3)
        if (roleError || !userData || userData.role_id !== 3) {
            if (roleError) console.error('[ROLE DB ERROR]:', roleError.message);
            
            // 🛑 Devolver 403 (Permiso Denegado) si no es Cajero
            return res.status(403).json({ 
                message: 'Acceso denegado. Se requiere el rol Cajero.' 
            });
        }
        
    } catch (error) {
        // Captura errores inesperados al consultar el rol
        console.error('[FATAL ERROR]: Role verification failed:', error.message);
        return res.status(500).json({ message: 'Error interno: Fallo al verificar permisos.' });
    }
    
    // ⭐️ 2. LLAMADA A LA FUNCIÓN DE APERTURA ⭐️
    
    try {
        const { data: corteData, error } = await supabase.rpc('abrir_caja_cajero', {
            p_id_cajero: userId,
            p_monto_inicial: monto_inicial
        });
        
        if (error) {
            console.error('[RPC ERROR]: Error en abrir_caja_cajero:', error.message);
            
            if (error.message.includes('CAJA_ACTIVA_EXISTENTE')) {
                // Obtener el ID de la caja activa para devolverlo en 409
                const { data: existingCorte } = await supabase
                    .from('cortes_caja')
                    .select('id_corte')
                    .eq('id_cajero', userId)
                    .eq('estado', 'ABIERTA')
                    .maybeSingle(); // Usamos maybeSingle aquí para evitar errores si por algún motivo no se encuentra.
                    
                return res.status(409).json({ 
                    message: 'Ya tienes una caja abierta. Redirigiendo a tu turno activo.',
                    corteId: existingCorte ? existingCorte.id_corte : null 
                });
            }

            return res.status(500).json({ message: 'Error en la base de datos al registrar la apertura.', details: error.message });
        }

        // Éxito
        res.status(200).json({ 
            message: 'Caja abierta exitosamente.', 
            corteId: corteData 
        });

    } catch (error) {
        // Captura errores durante la llamada RPC
        console.error('[FATAL ERROR]: RPC call failed:', error);
        res.status(500).json({ message: 'Error interno del servidor. Fallo crítico en RPC.' });
    }
});


module.exports = router;
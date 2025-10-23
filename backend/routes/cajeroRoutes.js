const express = require('express');
const router = express.Router();

// ⭐️ IMPORTAR SOLAMENTE SUPABASE desde server.js ⭐️
const { supabase } = require('../server'); 


// ===============================================
// 1. MIDDLEWARE DE AUTENTICACIÓN LOCAL
// ===============================================
/**
 * Verifica el token JWT y extrae el ID del usuario (UUID de Supabase).
 */
async function getUserIdFromToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }
    const token = authHeader.split(' ')[1];

    // Usa el objeto 'supabase' importado
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
        return res.status(401).json({ message: 'Token de sesión inválido o expirado. Vuelve a iniciar sesión.' });
    }

    req.userId = userData.user.id;
    next();
}


// ===============================================
// RUTA: POST /caja/abrir (Apertura de Caja)
// ===============================================
router.post('/caja/abrir', getUserIdFromToken, async (req, res) => {
    const userId = req.userId; // ID del cajero autenticado
    const { monto_inicial } = req.body;

    // Validación de entrada
    if (typeof monto_inicial !== 'number' || monto_inicial < 0) {
        return res.status(400).json({ message: 'Monto inicial inválido o faltante.' });
    }
    
    // ⭐️ 1. VERIFICACIÓN DE ROL CONTRA LA BD (role_id = 3) ⭐️
    try {
        const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role_id')
            .eq('id', userId)
            .single();

        // El ID 3 corresponde al rol 'Cajero' en tu esquema de BD
        if (roleError || !userData || userData.role_id !== 3) {
            console.warn(`Intento de apertura rechazado: Usuario ${userId} tiene role_id: ${userData ? userData.role_id : 'N/A'}`);
            // Devolver 403 (Permiso Denegado) si no es Cajero
            return res.status(403).json({ 
                message: 'Permiso denegado. Solo usuarios con el rol Cajero pueden abrir la caja.' 
            });
        }
        
    } catch (error) {
        console.error('Error al verificar el rol del usuario:', error);
        return res.status(500).json({ message: 'Error interno al verificar permisos.' });
    }
    
    // ⭐️ 2. LLAMADA A LA FUNCIÓN DE APERTURA (Solo si el rol fue verificado como 3) ⭐️
    
    try {
        // Llama a la función PostgreSQL 'abrir_caja_cajero' (RPC)
        const { data: corteData, error } = await supabase.rpc('abrir_caja_cajero', {
            p_id_cajero: userId,
            p_monto_inicial: monto_inicial
        });
        
        if (error) {
            console.error('Error al abrir caja en DB:', error.message);
            
            if (error.message.includes('CAJA_ACTIVA_EXISTENTE')) {
                 // Buscar el corte activo para devolver el ID
                 const { data: existingCorte } = await supabase
                    .from('cortes_caja')
                    .select('id_corte')
                    .eq('id_cajero', userId)
                    .eq('estado', 'ABIERTA')
                    .single();
                    
                return res.status(409).json({ 
                    message: 'Ya tienes una caja abierta. Redirigiendo a tu turno activo.',
                    corteId: existingCorte ? existingCorte.id_corte : null 
                });
            }

            return res.status(500).json({ message: 'Error en la base de datos al registrar la apertura.' });
        }

        // Éxito
        res.status(200).json({ 
            message: 'Caja abierta exitosamente.', 
            corteId: corteData 
        });

    } catch (error) {
        console.error('Error inesperado al abrir caja:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ... (Otras rutas de cajero, como /ventas/finalizar y /caja/cerrar) ...

module.exports = router;
// backend/routes/cajeroRoutes.js (CORRECTED FINAL VERSION)

const express = require('express');
const router = express.Router();

// ⭐️ IMPORTAR SOLAMENTE SUPABASE desde server.js ⭐️
// NO IMPORTAMOS getUserIdFromToken para evitar el error de importación.
const { supabase } = require('../server'); 


// ===============================================
// 1. MIDDLEWARE DE AUTENTICACIÓN LOCAL (Solución al TypeError)
// ===============================================
/**
 * Se define localmente para garantizar que exista antes de ser usado.
 */
async function getUserIdFromToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }
    const token = authHeader.split(' ')[1];

    // Usa el objeto 'supabase' importado arriba
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
        return res.status(401).json({ message: 'Token de sesión inválido o expirado. Vuelve a iniciar sesión.' });
    }

    req.userId = userData.user.id;
    next();
}


// ===============================================
// RUTA: POST /caja/abrir (LÍNEA 15 - El punto de error)
// ===============================================
router.post('/caja/abrir', getUserIdFromToken, async (req, res) => {
    // ... (Your code for /caja/abrir remains here) ...
    const userId = req.userId; 
    const { monto_inicial } = req.body;

    if (typeof monto_inicial !== 'number' || monto_inicial < 0) {
        return res.status(400).json({ message: 'Monto inicial inválido o faltante.' });
    }
    
    try {
        const { data: corteData, error } = await supabase.rpc('abrir_caja_cajero', {
            p_id_cajero: userId,
            p_monto_inicial: monto_inicial
        });
        
        if (error) {
            console.error('Error al abrir caja en DB:', error.message);
            
            if (error.message.includes('CAJA_ACTIVA_EXISTENTE')) {
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

        res.status(200).json({ 
            message: 'Caja abierta exitosamente.', 
            corteId: corteData 
        });

    } catch (error) {
        console.error('Error inesperado al abrir caja:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ... (Other router.post calls for /ventas/finalizar and /caja/cerrar) ...

module.exports = router;
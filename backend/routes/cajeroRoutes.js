// backend/routes/cajeroRoutes.js

const express = require('express');
const router = express.Router();

// ⭐️ Importar supabase y el middleware de autenticación desde server.js ⭐️
// Esto es crucial para que el router pueda acceder a la DB y verificar tokens.
const { supabase, getUserIdFromToken } = require('../server'); 


// ===============================================
// RUTA: POST /caja/abrir (Apertura de Caja)
// Requiere: Token de autenticación y monto_inicial
// ===============================================
router.post('/caja/abrir', getUserIdFromToken, async (req, res) => {
    const userId = req.userId; // ID del cajero autenticado (del middleware)
    const { monto_inicial } = req.body;

    if (typeof monto_inicial !== 'number' || monto_inicial < 0) {
        return res.status(400).json({ message: 'Monto inicial inválido o faltante.' });
    }
    
    try {
        // Llama a la función PostgreSQL 'abrir_caja_cajero' (RPC)
        const { data: corteData, error } = await supabase.rpc('abrir_caja_cajero', {
            p_id_cajero: userId,
            p_monto_inicial: monto_inicial
        });

        if (error) {
            console.error('Error al abrir caja en DB:', error.message);
            
            // Manejo del error específico lanzado en la función SQL (CAJA_ACTIVA_EXISTENTE)
            if (error.message.includes('CAJA_ACTIVA_EXISTENTE')) {
                 // Busca el ID del corte activo para devolverlo
                 const { data: existingCorte } = await supabase
                    .from('cortes_caja')
                    .select('id_corte')
                    .eq('id_cajero', userId)
                    .eq('estado', 'ABIERTA')
                    .single();
                    
                return res.status(409).json({ // 409 Conflict
                    message: 'Ya tienes una caja abierta. Redirigiendo a tu turno activo.',
                    corteId: existingCorte ? existingCorte.id_corte : null 
                });
            }

            return res.status(500).json({ message: 'Error en la base de datos al registrar la apertura.' });
        }

        // Éxito: corteData contiene el UUID retornado por la función SQL
        res.status(200).json({ 
            message: 'Caja abierta exitosamente.', 
            corteId: corteData 
        });

    } catch (error) {
        console.error('Error inesperado al abrir caja:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================
// RUTAS DE VENTA Y CIERRE (A implementar más tarde)
// ===============================================

// RUTA: POST /ventas/finalizar (Registrar Venta)
router.post('/ventas/finalizar', getUserIdFromToken, async (req, res) => {
    // La lógica de inserción en las tablas VENTAS y DETALLE_VENTA va aquí
    res.status(501).json({ message: 'Ruta de Finalizar Venta pendiente de implementar.' });
});

// RUTA: POST /caja/cerrar (Realizar Corte de Caja)
router.post('/caja/cerrar', getUserIdFromToken, async (req, res) => {
    // La lógica de cálculo de SUM(Ventas Efectivo) y UPDATE cortes_caja va aquí
    res.status(501).json({ message: 'Ruta de Corte de Caja pendiente de implementar.' });
});


module.exports = router;
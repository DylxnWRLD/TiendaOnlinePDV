// Configuración de API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// Utilidad para obtener elementos del DOM
const $ = (id) => document.getElementById(id);

// Validación de UUID
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Manejar envío del formulario
$('buscadorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pedidoId = $('pedidoId').value.trim();
    const mensajeError = $('mensaje-error');

    // Limpiar mensajes anteriores
    mensajeError.textContent = '';

    if (!pedidoId) {
        mensajeError.textContent = 'Por favor, ingresa un ID de pedido.';
        return;
    }

    // Validar formato UUID
    if (!isValidUUID(pedidoId)) {
        mensajeError.textContent = 'Formato de ID inválido. Debe ser un UUID (ej: 2acb3f97-2d15-4eea-a77d-493e5573dcf3).';
        return;
    }

    // Verificar si el pedido existe antes de redirigir
    try {
        mensajeError.textContent = 'Verificando pedido...';
        mensajeError.style.color = '#A0AEC0';

        const response = await fetch(`${API_BASE_URL}/api/paquetes/seguimiento/${pedidoId}`);
        
        if (response.ok) {
            // Pedido existe, redirigir
            window.location.href = `seguimiento-detalle.html?id=${pedidoId}`;
        } else if (response.status === 404) {
            mensajeError.style.color = '#F56565';
            mensajeError.textContent = 'Pedido no encontrado. Verifica el ID e intenta nuevamente.';
        } else {
            throw new Error('Error del servidor');
        }
    } catch (error) {
        console.error('Error verificando pedido:', error);
        mensajeError.style.color = '#F56565';
        mensajeError.textContent = 'Error de conexión. Intenta nuevamente.';
    }
});

// Redirección automática si viene ID de compra
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    
    if (idFromUrl && isValidUUID(idFromUrl)) {
        // Redirigir automáticamente si viene un UUID válido
        window.location.href = `seguimiento-detalle.html?id=${idFromUrl}`;
    }
});

// Limpiar mensaje de error al empezar a escribir
$('pedidoId').addEventListener('input', () => {
    $('mensaje-error').textContent = '';
});
// Configuración de API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// Utilidad para obtener elementos del DOM
const $ = (id) => document.getElementById(id);

// Validación de UUID (para id_pedido)
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Validación de código de pedido (para id_venta) - ✅ CORREGIDA
function isValidCodigoPedido(codigo) {
    // ✅ ACEPTA: PED- + entre 3 y 20 caracteres alfanuméricos
    const codigoRegex = /^(PED|VENTA)-[A-Za-z0-9]{3,20}$/i;
    return codigoRegex.test(codigo);
}

// Determinar tipo de ID
function getTipoId(identificador) {
    if (isValidUUID(identificador)) {
        return 'pedido'; // UUID de tabla pedidos
    } else if (isValidCodigoPedido(identificador)) {
        return 'venta';  // Código de tabla ventasOnline
    } else {
        return 'invalido';
    }
}

// Buscar pedido por cualquier tipo de ID
async function buscarPedido(identificador) {
    const tipo = getTipoId(identificador);
    const mensajeError = $('mensaje-error');

    if (tipo === 'invalido') {
        mensajeError.style.color = '#F56565';
        mensajeError.textContent = 'Formato de ID inválido. Usa UUID (ej: 2acb3f97-2d15-...) o Código (ej: PED-ABC123).';
        return null;
    }

    try {
        mensajeError.textContent = 'Buscando pedido...';
        mensajeError.style.color = '#A0AEC0';

        let endpoint;
        if (tipo === 'pedido') {
            endpoint = `${API_BASE_URL}/api/paquetes/seguimiento/${identificador}`;
        } else {
            // ⭐️ CORRECCIÓN: Aseguramos que el código vaya en mayúsculas para la URL ⭐️
            endpoint = `${API_BASE_URL}/api/paquetes/seguimiento/codigo/${identificador}`;
        }

        const response = await fetch(endpoint);

        if (response.ok) {
            const data = await response.json();

            // ⭐️ CORRECCIÓN CLAVE: Borrar el código guardado si la búsqueda por ID/CÓDIGO fue exitosa ⭐️
            // Esto evita que aparezca el código permanentemente después de rastrearlo.
            localStorage.removeItem('last_pedido_code');
            localStorage.removeItem('last_pedido_id');
            // --------------------------------------------------------------------------------------

            return data;
        } else if (response.status === 404) {
            mensajeError.style.color = '#F56565';
            mensajeError.textContent = 'Pedido no encontrado. Verifica el ID e intenta nuevamente.';
            return null;
        } else {
            throw new Error('Error del servidor');
        }
    } catch (error) {
        console.error('Error buscando pedido:', error);
        mensajeError.style.color = '#F56565';
        mensajeError.textContent = 'Error de conexión. Intenta nuevamente.';
        return null;
    }
}

// Manejar envío del formulario
$('buscadorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identificador = $('pedidoId').value.trim();

    if (!identificador) {
        $('mensaje-error').textContent = 'Por favor, ingresa un ID de pedido.';
        return;
    }

    const resultado = await buscarPedido(identificador);

    if (resultado && resultado.id) {
        // Redirigir con el ID del pedido (siempre usa id de tabla pedidos para el seguimiento)
        window.location.href = `seguimiento-detalle.html?id=${resultado.id}`;
    }
});

// Redirección automática si viene ID de compra
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    const pedidoIdInput = $('pedidoId');

    // ⭐️ NUEVA LÓGICA: FIJADOR DE CÓDIGO RECIENTE ⭐️
    const lastCode = localStorage.getItem('last_pedido_code');
    const lastId = localStorage.getItem('last_pedido_id');

    if (pedidoIdInput && lastCode) {
        pedidoIdInput.value = lastCode;
        // Opcional: Ejecutar la búsqueda automáticamente al cargar la página
        $('buscadorForm').dispatchEvent(new Event('submit'));
    }

    if (idFromUrl) {
        // Si viene un ID válido de la compra, redirigir automáticamente
        const tipo = getTipoId(idFromUrl);
        if (tipo !== 'invalido') {
            window.location.href = `seguimiento-detalle.html?id=${idFromUrl}`;
        }
    }
});

// Limpiar mensaje de error al empezar a escribir
$('pedidoId').addEventListener('input', () => {
    $('mensaje-error').textContent = '';
});
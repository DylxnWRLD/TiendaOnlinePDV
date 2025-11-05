// frontend/cliente/seguimiento.js

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';

const resultadoDiv = document.getElementById('resultado');
const estadoActualDiv = document.getElementById('estadoActual');
const mensajeErrorP = document.getElementById('mensaje-error');

// ⭐️ FUNCIÓN CENTRAL: Contiene toda la lógica de búsqueda y visualización ⭐️
async function fetchSeguimientoStatus(pedidoId) {

    resultadoDiv.style.display = 'none';
    mensajeErrorP.textContent = '';
    estadoActualDiv.className = 'estado-box'; // Limpiar clases anteriores

    if (!pedidoId) {
        mensajeErrorP.textContent = 'Por favor, ingresa un ID de pedido.';
        return;
    }

    // Opcional: poner el ID en el input si viene de la URL (para que el usuario lo vea)
    const pedidoIdInput = document.getElementById('pedidoId');
    if (pedidoIdInput) {
        pedidoIdInput.value = pedidoId;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/paquetes/seguimiento/${pedidoId}`);
        const data = await response.json();

        if (response.ok) {
            // Rellenar los detalles
            document.getElementById('direccionEnvio').textContent = data.direccion;
            document.getElementById('fechaEstimada').textContent = data.fecha_estimada;

            // Lógica para mostrar el estado con color (ejemplo)
            let estadoClass = 'estado-preparacion';
            if (data.estado.toUpperCase().includes('RUTA')) {
                estadoClass = 'estado-enruta';
            } else if (data.estado.toUpperCase().includes('ENTREGADO')) {
                estadoClass = 'estado-entregado';
            }

            estadoActualDiv.textContent = data.estado;
            estadoActualDiv.classList.add(estadoClass);
            resultadoDiv.style.display = 'block';

        } else {
            // Manejar errores (404, 500, etc.)
            mensajeErrorP.textContent = data.message || 'Error al rastrear el pedido. Verifica el ID.';
        }

    } catch (error) {
        console.error('Error de red al rastrear:', error);
        mensajeErrorP.textContent = 'Error de conexión con el servidor.';
    }
}

// ⭐️ Inicialización y manejo de eventos ⭐️
document.addEventListener('DOMContentLoaded', () => {
    // 1. Manejar la búsqueda automática si hay un ID en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    if (idFromUrl) {
        // Llama a la función de búsqueda inmediatamente con el ID de la URL
        fetchSeguimientoStatus(idFromUrl);
    }

    // 2. Manejar la búsqueda manual por formulario
    const seguimientoForm = document.getElementById('seguimientoForm');
    if (seguimientoForm) {
        seguimientoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pedidoId = document.getElementById('pedidoId').value.trim();
            fetchSeguimientoStatus(pedidoId);
        });
    }
});
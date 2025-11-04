// frontend/cliente/seguimiento.js

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';

document.getElementById('seguimientoForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const pedidoId = document.getElementById('pedidoId').value.trim();
    const resultadoDiv = document.getElementById('resultado');
    const estadoActualDiv = document.getElementById('estadoActual');
    const mensajeErrorP = document.getElementById('mensaje-error');

    resultadoDiv.style.display = 'none';
    mensajeErrorP.textContent = '';
    estadoActualDiv.className = 'estado-box'; // Limpiar clases anteriores

    if (!pedidoId) {
        mensajeErrorP.textContent = 'Por favor, ingresa un ID de pedido.';
        return;
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
});
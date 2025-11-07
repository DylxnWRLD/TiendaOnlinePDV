// frontend/cliente/seguimiento-detalle.js

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');

    const pedidoIdDisplay = document.getElementById('pedidoIdDisplay');
    const direccionEnvio = document.getElementById('direccionEnvio');
    const fechaEstimada = document.getElementById('fechaEstimada');
    const timelineContainer = document.getElementById('timeline');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    if (!pedidoId) {
        errorMessage.textContent = 'No se proporcionó un ID de pedido.';
        errorMessage.classList.remove('hidden');
        loadingMessage.classList.add('hidden');
        return;
    }

    pedidoIdDisplay.textContent = `(${pedidoId})`;
    fetchTrackingDetails(pedidoId);
});

async function fetchTrackingDetails(pedidoId) {
    loadingMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    timelineContainer.innerHTML = ''; // Limpiar cualquier contenido previo

    try {
        const response = await fetch(`${API_BASE_URL}/api/paquetes/seguimiento/${pedidoId}`);
        const data = await response.json();

        if (response.ok) {
            direccionEnvio.textContent = data.direccion || 'No disponible';
            fechaEstimada.textContent = data.fecha_estimada || 'No disponible';
            
            loadingMessage.classList.add('hidden');

            if (data.historial && data.historial.length > 0) {
                renderTimeline(data.historial);
            } else {
                timelineContainer.innerHTML = '<p class="text-center text-gray-400">No hay historial de seguimiento disponible para este pedido.</p>';
            }

        } else {
            errorMessage.textContent = data.message || 'Error al obtener los detalles del seguimiento.';
            errorMessage.classList.remove('hidden');
            loadingMessage.classList.add('hidden');
        }

    } catch (error) {
        console.error('Error de red al obtener detalles de seguimiento:', error);
        errorMessage.textContent = 'Error de conexión con el servidor. Inténtalo de nuevo más tarde.';
        errorMessage.classList.remove('hidden');
        loadingMessage.classList.add('hidden');
    }
}

function renderTimeline(historial) {
    historial.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('timeline-event');
        eventElement.classList.add(index % 2 === 0 ? 'left' : 'right'); // Alternar lados

        // Clase CSS para el color del punto basada en el estado
        const statusClass = `status-${event.estado.replace(/ /g, '_').toUpperCase()}`;
        eventElement.classList.add(statusClass);

        const fecha = new Date(event.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        eventElement.innerHTML = `
            <div class="timeline-content">
                <h3><i class="${getStatusIcon(event.estado)}"></i> ${event.estado}</h3>
                <small>${fechaFormateada} ${horaFormateada}</small>
                <p>${event.mensaje}</p>
            </div>
        `;
        timelineContainer.appendChild(eventElement);
    });
}

function getStatusIcon(estado) {
    switch (estado.toUpperCase()) {
        case 'PREPARACION': return 'fas fa-box';
        case 'EN RUTA': return 'fas fa-truck-moving';
        case 'CERCA': return 'fas fa-map-marker-alt';
        case 'ENTREGADO': return 'fas fa-check-circle';
        case 'INTENTO DE ENTREGA': return 'fas fa-exclamation-triangle';
        case 'CANCELADO': return 'fas fa-times-circle';
        default: return 'fas fa-info-circle';
    }
}
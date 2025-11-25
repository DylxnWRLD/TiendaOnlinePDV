const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';


document.addEventListener('DOMContentLoaded', () => {
    const pedidoIdDisplay = document.getElementById('pedidoIdDisplay');
    const direccionEnvio = document.getElementById('direccionEnvio');
    const fechaEstimada = document.getElementById('fechaEstimada');
    const timelineContainer = document.getElementById('timeline');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');

    if (!pedidoId) {
        errorMessage.textContent = 'No se proporcionó un ID de pedido.';
        errorMessage.classList.remove('hidden');
        loadingMessage.classList.add('hidden');
        return;
    }

    pedidoIdDisplay.textContent = `(${pedidoId})`;
    
    // Llamamos a la función con los elementos DOM como argumentos
    fetchTrackingDetails(pedidoId, {
        direccionEnvio, fechaEstimada, timelineContainer, loadingMessage, errorMessage, pedidoIdDisplay
    });
});

async function fetchTrackingDetails(pedidoId, domElements) {
    const { 
        direccionEnvio, fechaEstimada, timelineContainer, loadingMessage, errorMessage 
    } = domElements;
    
    loadingMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    timelineContainer.innerHTML = ''; // Limpiar cualquier contenido previo

    try {
        const response = await fetch(`${API_BASE_URL}/api/paquetes/seguimiento/${pedidoId}`);
        const data = await response.json();

        if (response.ok) {
            direccionEnvio.textContent = data.direccion || 'No disponible';
            // Formatear la fecha estimada
            const estimatedDate = data.fecha_estimada ? new Date(data.fecha_estimada).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No disponible';
            fechaEstimada.textContent = estimatedDate;

            loadingMessage.classList.add('hidden');

            if (data.historial && data.historial.length > 0) {
                renderTimeline(data.historial, timelineContainer); // Pasamos el contenedor
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

// ⭐️ Modificación para aceptar el contenedor DOM ⭐️
function renderTimeline(historial, timelineContainer) {
    const sortedHistorial = historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    sortedHistorial.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('timeline-event');
        
        // Determinar el lado solo si estamos en desktop (media query se encarga del móvil)
        if (window.innerWidth >= 768) {
            eventElement.classList.add(index % 2 === 0 ? 'left' : 'right'); 
        }

        const statusClass = `status-${event.estado.replace(/ /g, '_').toUpperCase()}`;
        eventElement.classList.add(statusClass);

        const fecha = new Date(event.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        const timeDisplay = fecha.getHours() === 0 && fecha.getMinutes() === 0 ? '' : horaFormateada;


        eventElement.innerHTML = `
            <div class="timeline-content">
                <h3 class="font-bold text-gray-700 mb-1"><i class="${getStatusIcon(event.estado)} mr-2"></i> ${event.estado}</h3>
                <small class="text-blue-500 font-medium block mb-1">${fechaFormateada} ${timeDisplay}</small>
                <p class="text-gray-600 text-sm">${event.mensaje}</p>
            </div>
        `;
        timelineContainer.appendChild(eventElement);
    });
}

function getStatusIcon(estado) {
    // Mapping de estados de Supabase a Font Awesome Icons
    switch (estado.toUpperCase()) {
        case 'PENDIENTE': return 'fas fa-box-open';
        case 'EN RUTA': return 'fas fa-shipping-fast';
        case 'ENTREGADO': return 'fas fa-check-circle';
        case 'FALLO EN ENTREGA': return 'fas fa-exclamation-circle';
        case 'CANCELADO': return 'fas fa-times-circle';
        default: return 'fas fa-info-circle';
    }
}
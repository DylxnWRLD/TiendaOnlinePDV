// Define la API base URL (Ajustada para Render)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';


document.addEventListener('DOMContentLoaded', () => {
    // Lógica para la página de Detalle de Paquete (paquete.html)
    const paqueteIdElement = document.getElementById('paqueteId');
    if (paqueteIdElement) {
        const urlParams = new URLSearchParams(window.location.search);
        const paqueteId = urlParams.get('id') || 'N/A';
        paqueteIdElement.textContent = paqueteId;

        const btnActualizar = document.getElementById('btnActualizarEstado');
        const selectEstado = document.getElementById('nuevoEstado');
        const pruebaDiv = document.getElementById('pruebasEntrega');
        const mensajeExtraContainer = document.getElementById('mensajeExtraContainer');
        const mensajeExtraInput = document.getElementById('mensajeExtra');

        if (btnActualizar) {
            selectEstado.addEventListener('change', () => {
                const selectedState = selectEstado.value;
                pruebaDiv.style.display = selectedState === 'ENTREGADO' ? 'block' : 'none';

                // Mostrar mensaje extra solo para estados específicos como "Intento de Entrega" o "Cancelado"
                mensajeExtraContainer.style.display =
                    (selectedState === 'INTENTO DE ENTREGA' || selectedState === 'CANCELADO') ? 'block' : 'none';

                // Limpiar el mensaje extra si el campo se oculta
                if (mensajeExtraContainer.style.display === 'none') {
                    mensajeExtraInput.value = '';
                }

                // Colores del botón
                if (selectedState === 'ENTREGADO') {
                    btnActualizar.className = 'btn btn-success';
                } else if (selectedState === 'CANCELADO' || selectedState === 'INTENTO DE ENTREGA') {
                    btnActualizar.className = 'btn btn-danger';
                } else {
                    btnActualizar.className = 'btn btn-primary';
                }
            });
            selectEstado.dispatchEvent(new Event('change')); // Ejecutar al cargar para configurar la visibilidad inicial

            btnActualizar.addEventListener('click', () => handleActualizarEstado(paqueteId));
        }

        // Simular estado de entrega para ejemplo visual (Mantener la lógica si es necesaria)
        if (paqueteId === 'ORD-002') {
            const accionEntrega = document.getElementById('accionEntrega');
            if (accionEntrega) {
                accionEntrega.innerHTML = '<h4>Estado:</h4><p style="color: var(--color-success); font-weight: bold;"><i class="fas fa-check-circle"></i> Paquete marcado como entregado previamente.</p>';
            }
        }
    }
});

/**
 * Lógica de la HU "Actualizar estado del paquete"
 */
async function handleActualizarEstado(paqueteId) {
    const nuevoEstado = document.getElementById('nuevoEstado').value;
    const mensajeExtra = document.getElementById('mensajeExtra').value.trim(); // Obtener el mensaje extra
    const fotoInput = document.getElementById('fotoPrueba');
    const token = localStorage.getItem('supabase-token');

    if (nuevoEstado === 'ENTREGADO' && fotoInput.files.length === 0) {
        alert('Por favor, sube una foto como prueba de entrega para marcar como Entregado.');
        return;
    }

    // Validar mensaje extra para "Intento de Entrega" o "Cancelado"
    if ((nuevoEstado === 'INTENTO DE ENTREGA' || nuevoEstado === 'CANCELADO') && !mensajeExtra) {
        alert('Por favor, ingresa un mensaje adicional para este estado.');
        return;
    }

    const btn = document.getElementById('btnActualizarEstado');
    btn.textContent = `Actualizando a "${nuevoEstado}"...`;
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/paquetes/${paqueteId}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nuevo_estado: nuevoEstado,
                mensaje_extra: mensajeExtra // Enviar el mensaje extra
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Fallo la actualización de estado.');
        }

        alert(`🎉 ¡Estado actualizado con éxito a "${nuevoEstado}"!`);

        if (nuevoEstado === 'ENTREGADO' && fotoInput.files.length > 0) {
            console.log("Simulando subida de foto de prueba...");
            // Aquí iría la lógica real para subir la imagen a Supabase Storage
            // con el ID del paquete como referencia.
        }

        window.location.href = 'repartidor.html';

    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Actualizar Estado';
    }
}
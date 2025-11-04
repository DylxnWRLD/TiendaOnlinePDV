// frontend/repartidor/repartidor.js
document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // Lógica para la página de Lista de Paquetes (repartidor.html)
    // ----------------------------------------------------
    const paqueteList = document.getElementById('paqueteList');
    if (paqueteList) {
        // Asignar el evento a cada tarjeta de paquete para la navegación
        document.querySelectorAll('.paquete-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-paquete-id');
                // Redirige al detalle, pasando el ID como parámetro de URL
                window.location.href = `paquete.html?id=${id}`;
            });
        });
    }

    // ----------------------------------------------------
    // Lógica para la página de Detalle de Paquete (paquete.html)
    // ----------------------------------------------------
    const paqueteIdElement = document.getElementById('paqueteId');
    if (paqueteIdElement) {
        // Simular la carga de datos del paquete a partir del ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const paqueteId = urlParams.get('id') || 'N/A';
        paqueteIdElement.textContent = paqueteId;

        const btnEntregado = document.getElementById('btnMarcarEntregado');
        if (btnEntregado) {
            btnEntregado.addEventListener('click', handleEntrega);
        }
        
        // Simular estado de entrega para ejemplo visual
        if (paqueteId === 'ORD-002') {
             const accionEntrega = document.getElementById('accionEntrega');
             if (accionEntrega) {
                 accionEntrega.innerHTML = '<h4>Estado:</h4><p style="color: var(--color-success); font-weight: bold;"><i class="fas fa-check-circle"></i> Paquete marcado como entregado previamente.</p>';
             }
        }
    }
});

/**
 * Lógica de la HU "Marcar paquete entregado"
 */
function handleEntrega() {
    const fotoInput = document.getElementById('fotoPrueba');
    
    if (fotoInput.files.length === 0) {
        alert('Por favor, sube una foto como prueba de entrega para continuar.');
        return;
    }

    const btn = document.getElementById('btnMarcarEntregado');
    btn.textContent = 'Enviando Prueba...';
    btn.disabled = true;

    // Aquí iría la llamada a la API real para registrar la entrega en Supabase.
    
    setTimeout(() => {
        alert('🎉 ¡Entrega registrada con éxito! La prueba ha sido enviada.');
        // Simular cambio de estado y redirección a la lista para ver el cambio.
        window.location.href = 'repartidor.html'; 
    }, 1500);
}
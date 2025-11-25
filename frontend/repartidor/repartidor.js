// Define la API base URL
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    // Determinar si estamos en la vista de lista (repartidor.html) o detalle (paquete.html)
    const paqueteList = document.getElementById('paqueteList');
    const paqueteIdElement = document.getElementById('paqueteId');

    // ⭐️ VERIFICACIÓN SIMPLE: SOLO VERIFICAR LA EXISTENCIA DEL TOKEN ⭐️
    const token = sessionStorage.getItem('supabase-token');

    if (!token) {
        alert('Acceso denegado. Por favor, inicia sesión.');
        sessionStorage.clear();
        window.location.href = '../login/login.html';
        return;
    }

    if (paqueteList) {
        // ⭐️ VISTA: LISTA DE PAQUETES (repartidor.html) ⭐️
        loadPaquetes();
    } else if (paqueteIdElement) {
        // ⭐️ VISTA: DETALLE DEL PAQUETE (paquete.html) ⭐️
        const urlParams = new URLSearchParams(window.location.search);
        const paqueteId = urlParams.get('id') || 'N/A';
        paqueteIdElement.textContent = paqueteId;

        loadPaqueteDetails(paqueteId);

        const selectEstado = document.getElementById('nuevoEstado');
        const pruebaDiv = document.getElementById('pruebasEntrega');
        const mensajeExtraContainer = document.getElementById('mensajeExtraContainer');
        const btnActualizar = document.getElementById('btnActualizarEstado');

        if (btnActualizar) {
            selectEstado.addEventListener('change', () => setupDetailUI(selectEstado.value, btnActualizar, pruebaDiv, mensajeExtraContainer));
            selectEstado.dispatchEvent(new Event('change'));

            btnActualizar.addEventListener('click', () => handleActualizarEstado(paqueteId));
        }
    }
});

// =========================================================================
// FUNCIONES DE CARGA Y RENDERIZADO (LISTA)
// =========================================================================

function getEstadoClass(estado) {
    const lowerEstado = estado.toLowerCase().replace(/ /g, '-');
    if (lowerEstado.includes('ruta') || lowerEstado.includes('camino') || lowerEstado.includes('cerca')) return 'estado-en-ruta';
    if (lowerEstado.includes('entregado')) return 'estado-entregado';
    if (lowerEstado.includes('cancelado') || lowerEstado.includes('fallido')) return 'estado-cancelado';
    return 'estado-pendiente';
}

async function loadPaquetes() {
    const paqueteList = document.getElementById('paqueteList');
    const token = sessionStorage.getItem('supabase-token');

    paqueteList.innerHTML = '<p style="text-align: center; color: #ccc;">Cargando tus paquetes asignados...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/paquetes/repartidor`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Si el servidor indica que el token es inválido o expirado, redirigimos.
            if (response.status === 401 || response.status === 403) {
                alert('Tu sesión ha expirado o no tienes permisos para ver esta lista. Vuelve a iniciar sesión.');
                sessionStorage.clear();
                window.location.href = '../login/login.html';
                return;
            }
            throw new Error(errorData.message || 'Error al obtener la lista de paquetes.');
        }

        const paquetes = await response.json();
        paqueteList.innerHTML = '';

        if (paquetes.length === 0) {
            paqueteList.innerHTML = '<p style="text-align: center; color: #ccc;">¡Felicidades! No tienes paquetes pendientes de entrega.</p>';
            return;
        }

        paquetes.forEach(paquete => {
            const estadoClass = getEstadoClass(paquete.estado_envio);
            const card = document.createElement('div');
            card.className = 'paquete-card';
            card.setAttribute('data-paquete-id', paquete.id);
            card.innerHTML = `
                <div class="paquete-header">
                    <h3>ID: ${paquete.id}</h3>
                    <span class="paquete-estado ${estadoClass}">${paquete.estado_envio}</span> 
                </div>
                <p>Dirección: ${paquete.direccion}</p>
                <p>Teléfono: ${paquete.telefono || 'N/A'}</p>
                <p class="paquete-enlace">Ver Detalle <i class="fas fa-arrow-right"></i></p>
            `;

            // ⭐️ Manejo de clic: Redirecciona al detalle ⭐️
            card.addEventListener('click', () => {
                window.location.href = `paquete.html?id=${paquete.id}`;
            });

            paqueteList.appendChild(card);
        });

    } catch (error) {
        console.error('Error cargando paquetes:', error);
        paqueteList.innerHTML = `<p style="text-align: center; color: red;">Error de red o servidor: ${error.message}</p>`;
    }
}

// =========================================================================
// FUNCIONES DE CARGA Y RENDERIZADO (DETALLE)
// =========================================================================

/**
 * Carga los detalles del paquete, incluyendo el historial y la lista de productos
 */
async function loadPaqueteDetails(paqueteId) {
    const token = sessionStorage.getItem('supabase-token');
    if (!token) return;

    try {
        // Nota: Reutilizamos la ruta del cliente ya que devuelve la información completa
        const response = await fetch(`${API_BASE_URL}/api/paquetes/seguimiento/${paqueteId}`, {
            headers: { 'Authorization': `Bearer ${token}` } // Se requiere el token si está detrás de RLS
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error al cargar detalles.');

        // Rellenar información del cliente y dirección
        document.getElementById('direccion').textContent = data.direccion || 'N/A';
        document.getElementById('clienteEmail').textContent = data.cliente_correo || 'N/A';

        const telefonoLink = document.getElementById('clienteTelefonoLink');
        if (telefonoLink) {
            telefonoLink.href = `tel:${data.telefono}`;
            telefonoLink.textContent = data.telefono || 'N/A';
        }

        // Rellenar lista de productos
        const listaProductos = document.getElementById('listaProductos');
        listaProductos.innerHTML = '';

        if (data.productos && data.productos.length > 0) {
            data.productos.forEach(p => {
                // Asume que el producto tiene { nombre, cantidad }
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-cube" style="margin-right: 8px;"></i>${p.nombre || 'Producto sin nombre'} x${p.cantidad || 1}`;
                listaProductos.appendChild(li);
            });
        } else {
            listaProductos.innerHTML = '<li><i class="fas fa-info-circle" style="margin-right: 8px;"></i>Detalles del producto no disponibles.</li>';
        }

        // Seleccionar el estado actual en el <select>
        const selectEstado = document.getElementById('nuevoEstado');
        const estadoActual = data.estado_actual;
        if (selectEstado && estadoActual) {
            selectEstado.value = estadoActual;
            // Asegurar que la UI se actualice con el estado correcto
            const btnActualizar = document.getElementById('btnActualizarEstado');
            const pruebaDiv = document.getElementById('pruebasEntrega');
            const mensajeExtraContainer = document.getElementById('mensajeExtraContainer');
            setupDetailUI(estadoActual, btnActualizar, pruebaDiv, mensajeExtraContainer);
        }

    } catch (error) {
        console.error('Error al cargar detalles del paquete:', error);
        alert(`Error al cargar detalles: ${error.message}`);
    }
}

/**
 * Lógica para mostrar/ocultar campos y cambiar el estilo del botón
 */
function setupDetailUI(selectedState, btn, pruebaDiv, mensajeExtraContainer) {
    // 1. Mostrar/Ocultar prueba de entrega (Solo para ENTREGADO)
    pruebaDiv.style.display = selectedState === 'ENTREGADO' ? 'block' : 'none';

    // 2. Mostrar/Ocultar mensaje extra (Solo para advertencias/finales)
    mensajeExtraContainer.style.display =
        (selectedState === 'INTENTO DE ENTREGA' || selectedState === 'CANCELADO') ? 'block' : 'none';

    // 3. Colores del botón
    if (selectedState === 'ENTREGADO') {
        btn.className = 'btn btn-success';
        btn.textContent = 'Finalizar con Entrega';
    } else if (selectedState === 'CANCELADO') {
        btn.className = 'btn btn-danger';
        btn.textContent = 'Confirmar Cancelación';
    } else {
        btn.className = 'btn btn-primary';
        btn.textContent = 'Actualizar Estado';
    }
}

/**
 * Lógica de la HU "Actualizar estado del paquete"
 */
async function handleActualizarEstado(paqueteId) {
    const nuevoEstado = document.getElementById('nuevoEstado').value;
    const mensajeExtra = document.getElementById('mensajeExtra').value.trim();
    const fotoInput = document.getElementById('fotoPrueba');
    const token = sessionStorage.getItem('supabase-token');

    if (nuevoEstado === 'ENTREGADO' && fotoInput.files.length === 0) {
        alert('Por favor, sube una foto como prueba de entrega para marcar como Entregado.');
        return;
    }
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
                mensaje_extra: mensajeExtra
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Fallo la actualización de estado.');
        }

        alert(`🎉 ¡Estado actualizado con éxito a "${nuevoEstado}"!`);

        // Simular subida de foto (la subida real a Storage es compleja y se omite aquí)
        if (nuevoEstado === 'ENTREGADO' && fotoInput.files.length > 0) {
            console.log("Simulando subida de foto de prueba a Supabase Storage...");
        }

        // Redirige a la lista principal después de la actualización exitosa.
        window.location.href = 'repartidor.html';

    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Actualizar Estado';
    }
}
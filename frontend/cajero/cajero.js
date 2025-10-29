// cajero/pdv.js

// Define la API base URL (Ajustada para Render)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com'; // ⭐️ Revisa esta URL para Render ⭐️

// Obtención de datos de sesión del localStorage
const token = localStorage.getItem('supabase-token'); 
const corteId = localStorage.getItem('currentCorteId');
const role = localStorage.getItem('user-role'); 

// Estado local de la venta (el "carrito")
let ventaActual = {
    productos: [], // Contiene {id_producto_mongo, nombre_producto, precio_unitario, cantidad, monto_descuento}
    subtotal: 0,
    descuento: 0,
    total: 0
};

// =========================================================================
// 1. INICIALIZACIÓN Y VERIFICACIÓN
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar Sesión y Corte Abierto (Guardrail de seguridad)
    if (!token || role !== 'Cajero' || !corteId) {
        alert('Caja no abierta o sesión inválida. Redirigiendo a Apertura.');
        window.location.href = './apertura_caja.html'; 
        return;
    }

    // 2. Mostrar información de la sesión
    document.getElementById('corte-id').textContent = corteId.substring(0, 8) + '...';
    
    setupEventListeners();
    updateVentaSummary();
});


// =========================================================================
// 2. LÓGICA DE CARRITO Y CÁLCULOS
// =========================================================================

function agregarProducto(productoMongo) {
    // Busca si el producto ya está en el carrito
    const index = ventaActual.productos.findIndex(p => p.id_producto_mongo === productoMongo._id);
    
    if (index > -1) {
        ventaActual.productos[index].cantidad += 1;
    } else {
        ventaActual.productos.push({
            id_producto_mongo: productoMongo._id, // Usamos _id de Mongo
            nombre_producto: productoMongo.name, // Usamos name de Mongo
            precio_unitario: productoMongo.price, // Usamos price de Mongo
            cantidad: 1,
            monto_descuento: 0 // Inicia sin descuento
        });
    }
    
    updateVentaSummary();
    renderCarrito();
}

function updateVentaSummary() {
    let subtotal = 0;
    let descuento = 0;
    
    ventaActual.productos.forEach(p => {
        subtotal += p.precio_unitario * p.cantidad;
        descuento += p.monto_descuento * p.cantidad; 
    });
    
    ventaActual.subtotal = subtotal;
    ventaActual.descuento = descuento;
    ventaActual.total = subtotal - descuento;
    
    // Actualizar la interfaz (toFixed(2) para formato monetario)
    document.getElementById('subtotal').textContent = ventaActual.subtotal.toFixed(2);
    document.getElementById('descuento').textContent = ventaActual.descuento.toFixed(2);
    document.getElementById('total-final').textContent = ventaActual.total.toFixed(2);
    
    // Actualizar el total en el modal de efectivo
    const modalTotal = document.getElementById('modal-total');
    if (modalTotal) modalTotal.textContent = ventaActual.total.toFixed(2);
}

function renderCarrito() {
    const tbody = document.getElementById('carrito-body');
    tbody.innerHTML = '';
    
    ventaActual.productos.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.nombre_producto}</td>
            <td><input type="number" min="1" value="${p.cantidad}" onchange="window.modificarCantidad(${index}, this.value)"></td>
            <td>$${(p.precio_unitario - p.monto_descuento).toFixed(2)}</td>
            <td><button onclick="window.eliminarProducto(${index})" class="btn-eliminar">X</button></td>
        `;
        tbody.appendChild(tr);
    });
    // Exportar al scope global para que los eventos onclick en el HTML funcionen
    window.modificarCantidad = modificarCantidad;
    window.eliminarProducto = eliminarProducto;
}

function modificarCantidad(index, nuevaCantidad) {
    const cant = parseInt(nuevaCantidad);
    if (cant > 0) {
        ventaActual.productos[index].cantidad = cant;
        updateVentaSummary();
    }
}

function eliminarProducto(index) {
    ventaActual.productos.splice(index, 1);
    updateVentaSummary();
    renderCarrito();
}


// =========================================================================
// 3. COMUNICACIÓN CON BACKEND (MongoDB - Vía Express)
// =========================================================================

async function buscarProductos(query) {
    if (query.length < 3) return [];
    
    try {
        // Llama al endpoint de Express que busca en MongoDB
        const response = await fetch(`${API_BASE_URL}/api/productos/buscar?q=${query}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al buscar en inventario.');
        
        // El backend devuelve un array de productos con campos: _id, name, price, stockQty
        return await response.json(); 
    } catch (error) {
        console.error('Error buscando productos (Mongo):', error);
        return []; 
    }
}


// =========================================================================
// 4. COMUNICACIÓN CON BACKEND (Postgres - Venta y Corte)
// =========================================================================

/**
 * Función que registra la venta en el backend (Postgres + Mongo Stock update).
 */
async function finalizarVenta(metodoPago, montoRecibido = null) {
    if (ventaActual.total <= 0 || ventaActual.productos.length === 0) {
        alert('Venta inválida. Agregue productos.');
        return;
    }
    
    const payload = {
        id_corte: corteId,
        total_descuento: ventaActual.descuento,
        total_final: ventaActual.total,
        metodo_pago: metodoPago,
        // Los detalles del carrito se mapean para el formato de BD
        detalles: ventaActual.productos.map(p => ({
            id_producto_mongo: p.id_producto_mongo,
            nombre_producto: p.nombre_producto,
            cantidad: p.cantidad,
            precio_unitario_venta: p.precio_unitario,
            monto_descuento: p.monto_descuento
        }))
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/ventas/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error al registrar la venta.');
        
        alert(`✅ Venta Finalizada con éxito. Ticket: ${data.ticket_numero}`);
        
        // Resetear la venta
        ventaActual.productos = [];
        updateVentaSummary();
        renderCarrito();
        
    } catch (error) {
        console.error('Error al finalizar venta:', error);
        alert(`❌ Fallo al finalizar la venta: ${error.message}`);
    }
}

/**
 * Función que cierra la sesión de caja y muestra el reporte.
 */
async function realizarCorteDeCaja(montoContado) {
    if (!corteId) {
        alert('No hay una caja abierta para cerrar.');
        return;
    }
    
    if (montoContado < 0) {
         alert('El monto contado no puede ser negativo.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/caja/cerrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                id_corte: corteId,
                monto_declarado: montoContado 
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Error al cerrar la caja.');
        
        // ⭐️ Muestra el reporte detallado ⭐️
        const reporte = data.reporte;
        const diferencia = reporte.diferencia;

        const resumenReporte = `
            ==================================
            CORTE DE CAJA EXITOSO
            ==================================
            Fondo Inicial: $${reporte.monto_inicial.toFixed(2)}
            Ventas en Efectivo: $${reporte.ventas_efectivo.toFixed(2)}
            ----------------------------------
            Monto Teórico (Calculado): $${reporte.monto_calculado.toFixed(2)}
            Monto Contado (Declarado): $${parseFloat(montoContado).toFixed(2)}
            ----------------------------------
            **DIFERENCIA (Faltante/Sobrante):** $${diferencia.toFixed(2)}
            ==================================
        `;

        alert(resumenReporte); // Mostrar el reporte en una alerta
        
        // Limpiar la sesión actual y forzar nuevo login
        localStorage.removeItem('currentCorteId');
        window.location.href = './apertura_caja.html'; 

    } catch (error) {
        alert(`❌ Fallo al realizar el corte: ${error.message}`);
    }
}


// =========================================================================
// 5. EVENT LISTENERS
// =========================================================================

function setupEventListeners() {
    // 5.1. Búsqueda de Productos ⭐️ CORRECCIÓN APLICADA AQUÍ ⭐️
    document.getElementById('input-sku').addEventListener('input', async (e) => {
        const query = e.target.value;
        const resultadosDiv = document.getElementById('resultados-busqueda');
        
        if (query.length > 2) {
            const resultados = await buscarProductos(query);
            
            // Limpiar resultados anteriores
            resultadosDiv.innerHTML = ''; 

            if (resultados.length > 0) {
                // Iterar y crear elementos de forma segura
                resultados.forEach(p => {
                    const pElement = document.createElement('p');
                    pElement.className = 'resultado-item';
                    pElement.textContent = `${p.name} - $${p.price.toFixed(2)}`;
                    
                    // Almacenar los datos del producto de forma segura en el DOM
                    pElement.dataset.producto = JSON.stringify({
                        _id: p._id,
                        name: p.name,
                        price: p.price
                    });

                    // Asignar el Event Listener para agregar el producto al carrito
                    pElement.addEventListener('click', function() {
                        const productoData = JSON.parse(this.dataset.producto);
                        agregarProducto(productoData); 
                    });

                    resultadosDiv.appendChild(pElement);
                });
            } else {
                 resultadosDiv.innerHTML = '<p class="instruccion">No se encontraron productos.</p>';
            }

        } else {
            resultadosDiv.innerHTML = '<p class="instruccion">Escribe o escanea para buscar...</p>';
        }
    });
// --------------------------------------------------------------------------------------------------
    // 5.2. Pago en Efectivo (Muestra modal)
    document.getElementById('btn-pago-efectivo').addEventListener('click', () => {
        if (ventaActual.total <= 0) {
            alert('Agrega productos para pagar.');
            return;
        }
        document.getElementById('modal-efectivo').style.display = 'block';
        // Asegura que el input de recibido inicie con el total (para pagos exactos rápidos)
        document.getElementById('monto-recibido').value = ventaActual.total.toFixed(2); 
        document.getElementById('monto-recibido').dispatchEvent(new Event('input')); // Dispara cálculo de cambio
    });

    // 5.3. Pago con Tarjeta
    document.getElementById('btn-pago-tarjeta').addEventListener('click', () => {
        if (ventaActual.total > 0) finalizarVenta('TARJETA');
        else alert('Agrega productos para pagar.');
    });

    // 5.4. Lógica del modal de efectivo para calcular cambio
    const montoRecibidoInput = document.getElementById('monto-recibido');
    if (montoRecibidoInput) {
        montoRecibidoInput.addEventListener('input', (e) => {
            const recibido = parseFloat(e.target.value) || 0;
            const cambio = recibido - ventaActual.total;
            document.getElementById('cambio-calculado').textContent = cambio >= 0 ? cambio.toFixed(2) : `Falta: ${(-cambio).toFixed(2)}`;
        });
    }

    // 5.5. Finalizar Venta en Efectivo
    document.getElementById('btn-finalizar-efectivo')?.addEventListener('click', () => {
        const recibido = parseFloat(document.getElementById('monto-recibido').value);
        if (recibido >= ventaActual.total) {
            finalizarVenta('EFECTIVO', recibido);
            document.getElementById('modal-efectivo').style.display = 'none';
        } else {
            alert('El monto recibido es insuficiente.');
        }
    });
    
    // 5.6. Botones de Acción (Panel Izquierdo)
    
    // Corte de Caja
    document.getElementById('btn-corte-caja').addEventListener('click', () => {
        const montoContado = prompt("Ingrese el monto TOTAL en efectivo contado en la caja:");
        if (montoContado !== null && !isNaN(parseFloat(montoContado))) {
            realizarCorteDeCaja(parseFloat(montoContado));
        } else if (montoContado !== null) {
            alert("Monto inválido. El corte ha sido cancelado.");
        }
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/login.html';
    });
    
    // Cancelar Venta
    document.getElementById('btn-cancelar-venta').addEventListener('click', () => {
        if (confirm('¿Seguro que deseas CANCELAR la venta actual?')) {
            ventaActual.productos = [];
            updateVentaSummary();
            renderCarrito();
        }
    });

    // Los botones de búsqueda de ventas, devoluciones y promociones (como estás) son simulaciones
}
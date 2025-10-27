// cajero/pdv.js

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// ⭐️ CORRECCIÓN CLAVE: Usar 'supabase-token' en lugar de 'sessionToken' ⭐️
const token = localStorage.getItem('supabase-token'); 
const corteId = localStorage.getItem('currentCorteId');
// ⭐️ CORRECCIÓN CLAVE: Usar 'user-role' en lugar de 'userRole' ⭐️
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
    // 1. Verificar Sesión y Corte Abierto
    if (!token || role !== 'Cajero' || !corteId) {
        // Ahora esta verificación funcionará correctamente al leer las claves correctas.
        alert('Caja no abierta o sesión inválida. Redirigiendo a Apertura.');
        window.location.href = './apertura_caja.html'; 
        return;
    }

    // 2. Mostrar información de la sesión
    document.getElementById('corte-id').textContent = corteId.substring(0, 8) + '...';
    // Se recomienda llamar a una API para obtener el nombre del cajero aquí.
    
    setupEventListeners();
    updateVentaSummary();
});


// =========================================================================
// 2. LÓGICA DE CARRITO (Requisitos: Realizar venta, Modificar venta)
// =========================================================================

function agregarProducto(productoMongo) {
    const index = ventaActual.productos.findIndex(p => p.id_producto_mongo === productoMongo.id);
    
    if (index > -1) {
        ventaActual.productos[index].cantidad += 1;
    } else {
        ventaActual.productos.push({
            id_producto_mongo: productoMongo.id,
            nombre_producto: productoMongo.nombre,
            precio_unitario: productoMongo.precio_venta,
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
    
    // Actualizar la interfaz
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
// 3. COMUNICACIÓN CON MONGODB (Vía Backend)
// =========================================================================

async function buscarProductos(query) {
    // Requisito: Consultar disponibilidad de productos
    if (query.length < 3) return [];
    
    try {
        // Llama al endpoint de Express que hace de puente con MongoDB
        const response = await fetch(`${API_BASE_URL}/api/productos/buscar?q=${query}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al buscar en inventario.');
        
        return await response.json();
    } catch (error) {
        console.error('Error buscando productos (Mongo):', error);
        // Simulación de datos para desarrollo si Mongo falla
        return [{ id: 'MON123', nombre: `Test Prod ${query}`, precio_venta: 499.99 }]; 
    }
}


// =========================================================================
// 4. COMUNICACIÓN CON POSTGRES (Vía Backend)
// =========================================================================

// Requisitos: Realizar venta, Pago Efectivo, Pago Tarjeta
async function finalizarVenta(metodoPago, montoRecibido = null) {
    if (ventaActual.total <= 0 || ventaActual.productos.length === 0) {
        alert('Venta inválida.');
        return;
    }
    
    const payload = {
        id_corte: corteId,
        total_descuento: ventaActual.descuento,
        total_final: ventaActual.total,
        metodo_pago: metodoPago,
        // Detalles para la inserción en la tabla detalle_venta
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
        alert(`❌ Fallo al finalizar la venta: ${error.message}`);
    }
}

// Requisito: Corte de caja
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
        
        // Cierre exitoso: Mostrar resumen y redirigir
        alert(`Corte Exitoso. Diferencia: $${data.diferencia.toFixed(2)}. Redirigiendo...`);
        
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
    // 5.1. Búsqueda de Productos
    document.getElementById('input-sku').addEventListener('input', async (e) => {
        const query = e.target.value;
        const resultadosDiv = document.getElementById('resultados-busqueda');
        
        if (query.length > 2) {
            const resultados = await buscarProductos(query);
            resultadosDiv.innerHTML = resultados.map(p => 
                `<p onclick="agregarProducto({id:'${p.id}', nombre:'${p.nombre}', precio_venta:${p.precio_venta}})" class="resultado-item">
                    ${p.nombre} - $${p.precio_venta.toFixed(2)}
                 </p>`
            ).join('');
        } else {
            resultadosDiv.innerHTML = '<p class="instruccion">Escribe o escanea para buscar...</p>';
        }
    });

    // 5.2. Pago en Efectivo (Muestra modal)
    document.getElementById('btn-pago-efectivo').addEventListener('click', () => {
        if (ventaActual.total <= 0) {
            alert('Agrega productos para pagar.');
            return;
        }
        document.getElementById('modal-efectivo').style.display = 'block';
        document.getElementById('monto-recibido').value = ventaActual.total.toFixed(2);
    });

    // 5.3. Pago con Tarjeta
    document.getElementById('btn-pago-tarjeta').addEventListener('click', () => {
        if (ventaActual.total > 0) finalizarVenta('TARJETA');
        else alert('Agrega productos para pagar.');
    });

    // 5.4. Lógica del modal de efectivo para calcular cambio (Requisito: Calcula cambio)
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
    
    // Corte de Caja (Muestra modal/prompt para el monto contado)
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
        window.location.href = '../../login/login.html';
    });
    
    // Otros botones (simulación de funcionalidad)
    document.getElementById('btn-cancelar-venta').addEventListener('click', () => {
        if (confirm('¿Seguro que deseas CANCELAR la venta actual?')) {
            ventaActual.productos = [];
            updateVentaSummary();
            renderCarrito();
        }
    });
    document.getElementById('btn-buscar-ventas').addEventListener('click', () => alert('Búsqueda de ventas activa. Se requiere modal y API /ventas/buscar.'));
    document.getElementById('btn-devolucion').addEventListener('click', () => alert('Devoluciones activa. Se requiere modal y lógica de reversa.'));
    document.getElementById('btn-aplicar-promo').addEventListener('click', () => alert('Aplicar Promociones activa. Se requiere lógica de descuento.'));
}
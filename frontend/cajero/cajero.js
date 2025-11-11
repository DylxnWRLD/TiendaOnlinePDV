// cajero/pdv.js

// Define la API base URL (Ajustada para Render)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com'; // ⭐️ Revisa esta URL para Render ⭐️

// Obtención de datos de sesión del sessionStorage (consistente con login.js)
const token = sessionStorage.getItem('supabase-token'); // ✅ CAMBIO A SESSIONSTORAGE
const corteId = sessionStorage.getItem('currentCorteId'); // ✅ CAMBIO A SESSIONSTORAGE
const role = sessionStorage.getItem('user-role'); // ✅ CAMBIO A SESSIONSTORAGE

// Estado local de la venta (el "carrito")
let ventaActual = {
    productos: [], // Contiene {id_producto_mongo, nombre_producto, precio_unitario, cantidad, monto_descuento, stock_disponible}
    subtotal: 0,
    descuento: 0,
    total: 0
};

// ⭐️ VARIABLE ELIMINADA: Ya no se usa montoDeclaradoTemporal. 
// Usaremos sessionStorage.corteReporteTemporal en su lugar. // ⭐️ Nota: Esto se ajusta abajo.

// ⭐️ ID ÚNICO DE ESTA INSTANCIA/PESTAÑA ⭐️
const INSTANCE_ID = Date.now() + Math.random().toString(36).substring(2);


// =========================================================================
// 0. LÓGICA DE RESTRICCIÓN DE SESIÓN ÚNICA (CANDADO)
// =========================================================================

const SESSION_LOCK_KEY = 'pdv_lock_active'; // Se mantiene en localStorage para comunicación entre pestañas
// El candado expira si no se refresca en 10 segundos
const LOCK_TIMEOUT = 10000; 
let lockHeartbeat = null; 

/**
 * Intenta adquirir o verificar la propiedad del candado de sesión.
 * La verificación se hace usando el INSTANCE_ID único por pestaña.
 * @returns {boolean} True si el candado fue adquirido o ya era nuestro.
 */
function acquireLock() {
    // 1. Obtener el estado actual del candado
    const lockDataString = localStorage.getItem(SESSION_LOCK_KEY);

    if (lockDataString) {
        try {
            const lockData = JSON.parse(lockDataString);
            const isLockExpired = (Date.now() - lockData.timestamp) > LOCK_TIMEOUT;

            // CRUCIAL: Si el lock está fresco Y NO es nuestro INSTANCE_ID, bloqueamos.
            if (!isLockExpired && lockData.instanceId !== INSTANCE_ID) {
                alert('🚫 Solo se permite una sesión de cajero activa a la vez. Redirigiendo.');
                window.location.href = '../login/login.html';
                return false;
            }
            // Si expiró o nos pertenece, continuamos y lo refrescamos.
        } catch (e) {
            // Error de parseo: asumimos que el candado está corrupto y lo sobrescribimos.
        }
    }
    
    // 2. Adquirir/Refrescar el candado con nuestra INSTANCE_ID
    const newLockData = JSON.stringify({
        instanceId: INSTANCE_ID,
        corteId: corteId, // Se mantiene por contexto (lee de la variable global, que ahora es sessionStorage)
        timestamp: Date.now()
    });
    localStorage.setItem(SESSION_LOCK_KEY, newLockData);
    return true;
}

/**
 * Libera el candado si le pertenece a esta INSTANCIA.
 */
function releaseLock() {
    const lockDataString = localStorage.getItem(SESSION_LOCK_KEY);

    if (lockDataString) {
        try {
            const lockData = JSON.parse(lockDataString);
            // Solo liberamos el candado si fuimos nosotros quienes lo establecimos.
            if (lockData.instanceId === INSTANCE_ID) {
                localStorage.removeItem(SESSION_LOCK_KEY);
            }
        } catch (e) {
            // Ignorar errores de parseo al liberar
        }
    }
}

// =========================================================================
// UTILIDAD: Decodificar Token para obtener Email
// =========================================================================

function getUserInfoFromToken(token) {
    if (!token) return { email: 'Cajero Desconocido' };
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return { email: 'Token Inválido' };

        const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);

        return {
            email: payload.email || payload.sub || 'Email no encontrado'
        };
    } catch (e) {
        console.error("Error decodificando JWT:", e);
        return { email: 'Error de Decodificación' };
    }
}


// =========================================================================
// 1. INICIALIZACIÓN Y VERIFICACIÓN
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ⭐️ 1.1. Previene el regreso con la flecha del navegador ⭐️
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function () {
        window.history.pushState(null, null, window.location.href);
    });
    
    // 1.2. Verificar Sesión y Corte Abierto (Guardrail de seguridad)
    // Las variables token, role y corteId leen de sessionStorage al inicio
    if (!token || role !== 'Cajero' || !corteId) { 
        alert('Caja no abierta o sesión inválida. Redirigiendo a Apertura.');
        window.location.href = './apertura_caja.html'; 
        return;
    }

    // ⭐️ 1.3. INTENTAR ADQUIRIR EL CANDADO DE SESIÓN ÚNICA ⭐️
    if (!acquireLock()) {
        // La redirección ya ocurrió dentro de acquireLock si falló
        return;
    }

    // Iniciar Heartbeat para mantener el candado fresco (Cada 3 segundos)
    lockHeartbeat = setInterval(acquireLock, 3000);

    // 3. Mostrar información de la sesión
    const cajeroInfo = getUserInfoFromToken(token);
    const cajeroNombreSpan = document.getElementById('cajero-nombre');
    if (cajeroNombreSpan) {
        cajeroNombreSpan.textContent = cajeroInfo.email;
    }
    
    const corteIdSpan = document.getElementById('corte-id');
    if (corteIdSpan) {
        corteIdSpan.textContent = corteId ? corteId.substring(0, 8) + '...' : 'N/A';
    }
    
    setupEventListeners();
    updateVentaSummary();
});

// ⭐️ Liberar el candado al cerrar o salir de la página ⭐️
window.addEventListener('beforeunload', () => {
    // Detener el Heartbeat
    if (lockHeartbeat) clearInterval(lockHeartbeat);
    // Liberar el candado
    releaseLock();
});


// =========================================================================
// 2. LÓGICA DE CARRITO Y CÁLCULOS
// =========================================================================

/**
 * Agrega un producto al carrito, incluyendo la verificación de stock.
 * Se asume que productoMongo contiene el campo stockQty.
 */
async function agregarProducto(productoMongo) {
    const index = ventaActual.productos.findIndex(p => p.id_producto_mongo === productoMongo._id);
    const stockDisponible = productoMongo.stockQty; 

    const promocionInfo = await verificarPromocionProducto(productoMongo._id);

    let descuentoAplicado = 0;
    let precioFinal = productoMongo.price;

    if (promocionInfo.activa) {
        if (promocionInfo.tipo_descuento === 'PORCENTAJE') {
            descuentoAplicado = (productoMongo.price * promocionInfo.valor) / 100;
        } else if (promocionInfo.tipo_descuento === 'FIJO') {
            descuentoAplicado = promocionInfo.valor;
        }
        precioFinal = productoMongo.price - descuentoAplicado;
    }
    if (index > -1) {
        if (ventaActual.productos[index].cantidad + 1 > stockDisponible) {
            alert(`⚠️ Stock insuficiente. Solo quedan ${stockDisponible} unidades de ${productoMongo.name}.`);
            return;
        }
        ventaActual.productos[index].cantidad += 1;

        ventaActual.productos[index].monto_descuento = descuentoAplicado;
        ventaActual.productos[index].precio_final = precioFinal;
        ventaActual.productos[index].promocion_aplicada = promocionInfo.activa ? promocionInfo : null;

    } else {
        if (stockDisponible <= 0) {
            alert(`❌ ${productoMongo.name} no tiene stock disponible.`);
            return;
        }
        ventaActual.productos.push({
            id_producto_mongo: productoMongo._id, 
            nombre_producto: productoMongo.name, 
            precio_unitario: productoMongo.price, 
            precio_final: precioFinal,
            cantidad: 1,
            monto_descuento: descuentoAplicado,
            stock_disponible: stockDisponible,
            promocion_aplicada: promocionInfo.activa ? promocionInfo : null,
            tiene_descuento: promocionInfo.activa
        });
    }
    
    updateVentaSummary();
    renderCarrito();

    if (promocionInfo.activa) {
        mostrarNotificacionDescuento(productoMongo.name, descuentoAplicado, promocionInfo);
    }
}







function mostrarNotificacionDescuento(nombreProducto, descuento, promocionInfo) {
    const mensaje = promocionInfo.tipo_descuento === 'PORCENTAJE' 
        ? `🎉 ¡${promocionInfo.nombre_promo || 'Promoción'}! ${nombreProducto} tiene ${promocionInfo.valor}% off`
        : `🎉 ¡${promocionInfo.nombre_promo || 'Promoción'}! ${nombreProducto} tiene $${descuento.toFixed(2)} off`;
    
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        if (document.body.contains(notificacion)) {
            document.body.removeChild(notificacion);
        }
    }, 3000);
}








async function verificarPromocionProducto(id_producto_mongo) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/promociones/producto/${id_producto_mongo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok){
            return await response.json();
        }else{
           return { activa: false };
        }

    }catch (error) {
        console.error('Error verificando promoción:', error);
        return { activa: false }; 
    }


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
    
    document.getElementById('subtotal').textContent = ventaActual.subtotal.toFixed(2);
    document.getElementById('descuento').textContent = ventaActual.descuento.toFixed(2);
    document.getElementById('total-final').textContent = ventaActual.total.toFixed(2);
    
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
            <td>$${(p.precio_unitario * p.cantidad - p.monto_descuento * p.cantidad).toFixed(2)}</td>
            <td><button onclick="window.eliminarProducto(${index})" class="btn-eliminar">X</button></td>
        `;
        tbody.appendChild(tr);
    });
    window.modificarCantidad = modificarCantidad;
    window.eliminarProducto = eliminarProducto;
}

/**
 * Modifica la cantidad de un producto, verificando contra el stock disponible.
 */
function modificarCantidad(index, nuevaCantidad) {
    const cant = parseInt(nuevaCantidad);
    const producto = ventaActual.productos[index];

    if (cant > 0) {
        if (cant > producto.stock_disponible) {
            alert(`⚠️ La cantidad máxima para ${producto.nombre_producto} es ${producto.stock_disponible}.`);
            return;
        }

        producto.cantidad = cant;
        updateVentaSummary();
    } else if (cant === 0) {
        eliminarProducto(index);
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
        const response = await fetch(`${API_BASE_URL}/api/productos/buscar?q=${query}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al buscar en inventario.');
        
        return await response.json(); 
    } catch (error) {
        console.error('Error buscando productos (Mongo):', error);
        return []; 
    }
}


// =========================================================================
// 4. COMUNICACIÓN CON BACKEND (Postgres - Venta y Corte)
// =========================================================================

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
        
        ventaActual.productos = [];
        updateVentaSummary();
        renderCarrito();
        
    } catch (error) {
        console.error('Error al finalizar venta:', error);
        alert(`❌ Fallo al finalizar la venta: ${error.message}`);
    }
}

/**
 * Función que realiza el CÁLCULO/REPORTE del corte (no el cierre definitivo en la BD).
 * ⚠️ Asume que tu backend tiene un endpoint /api/caja/calcular_reporte que llama a la nueva RPC.
 */
async function realizarCorteDeCaja(montoContado) {
    if (!corteId) {
        alert('No hay una caja abierta para cerrar.');
        return;
    }
    
    const montoContadoFloat = parseFloat(montoContado);
    if (isNaN(montoContadoFloat) || montoContadoFloat < 0) {
        alert('Monto inválido. El corte ha sido cancelado.');
        return;
    }
    
    try {
        // ⭐️ CAMBIO CRÍTICO: Llamar al endpoint de CÁLCULO/REPORTE ⭐️
        const response = await fetch(`${API_BASE_URL}/api/caja/calcular_reporte`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                id_corte: corteId,
                monto_declarado: montoContadoFloat // Se envía el monto contado actual
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // El modal de entrada (`modal-corte-caja`) permanece abierto para corregir.
            throw new Error(data.message || 'Error al calcular el corte.');
        }

        // 1. Cerramos el modal de entrada. EL CORTE SIGUE ABIERTO EN LA BD.
        document.getElementById('modal-corte-caja').style.display = 'none';

        // 2. Preparamos y Guardamos el Reporte Temporal
        const reporte = data.reporte;
        // Agregamos el monto_declarado al objeto reporte para el cierre final y la corrección
        reporte.monto_declarado = montoContadoFloat; 
        
        // ⭐️ GUARDAR EL REPORTE COMPLETO EN SESSIONSTORAGE ⭐️
        sessionStorage.setItem('corteReporteTemporal', JSON.stringify(reporte)); // ✅ CAMBIO A SESSIONSTORAGE

        // 3. Lógica de visualización del reporte
        const diferencia = reporte.diferencia;

        document.getElementById('reporte-inicial').textContent = reporte.monto_inicial.toFixed(2);
        document.getElementById('reporte-ventas').textContent = reporte.ventas_efectivo.toFixed(2);
        document.getElementById('reporte-teorico').textContent = reporte.monto_calculado.toFixed(2);
        document.getElementById('reporte-contado').textContent = montoContadoFloat.toFixed(2);
        document.getElementById('reporte-diferencia').textContent = diferencia.toFixed(2);

        const diferenciaSpan = document.getElementById('reporte-diferencia');
        diferenciaSpan.closest('td').style.color = diferencia < 0 ? '#f44336' : (diferencia > 0.01 ? '#ffc107' : '#4caf50');
        
        // 4. Mostrar el modal de reporte
        document.getElementById('modal-reporte-corte').style.display = 'block'; 

    } catch (error) {
        console.error('Error al realizar corte:', error);
        alert(`❌ Fallo al realizar el cálculo: ${error.message}`);
    }
}

/**
 * Función que realiza el cierre DEFINITIVO de la caja,
 * usando los datos del reporte temporal almacenado.
 * ⚠️ Llama al nuevo endpoint /api/caja/cerrar_definitivo
 */
async function aceptarYFinalizarCorte() {
    const reporteString = sessionStorage.getItem('corteReporteTemporal'); // ✅ CAMBIO A SESSIONSTORAGE
    if (!reporteString) {
        alert('No hay un reporte de corte para finalizar. Intente el cálculo de nuevo.');
        return;
    }
    const reporte = JSON.parse(reporteString);

    try {
        // ⭐️ CAMBIO CRÍTICO: Llamar al endpoint de CIERRE DEFINITIVO ⭐️
        const response = await fetch(`${API_BASE_URL}/api/caja/cerrar_definitivo`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                id_corte: corteId,
                monto_declarado: reporte.monto_declarado,
                monto_calculado: reporte.monto_calculado // Enviamos el valor ya calculado
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cerrar la caja definitivamente.');
        }

        // Éxito: Limpiar sesión y redirigir
        document.getElementById('modal-reporte-corte').style.display = 'none';
        sessionStorage.removeItem('currentCorteId'); // ✅ CAMBIO A SESSIONSTORAGE
        sessionStorage.removeItem('corteReporteTemporal'); // ✅ CAMBIO A SESSIONSTORAGE
        sessionStorage.removeItem('supabase-token'); // ✅ CAMBIO A SESSIONSTORAGE
        if (lockHeartbeat) clearInterval(lockHeartbeat);
        releaseLock(); 
        window.location.href = '../login/login.html';

    } catch (error) {
        console.error('Error al finalizar corte:', error);
        alert(`❌ Fallo al finalizar el corte. La caja permanece abierta: ${error.message}`);
    }
}


// =========================================================================
// 5. EVENT LISTENERS Y MANEJO DE MODALES
// =========================================================================

/**
 * Función genérica para cerrar cualquier modal de forma segura.
 */
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function setupEventListeners() {
    // ⭐️ 5.A. Manejo Seguro de Botones de Cierre de Modales (Usando IDs) ⭐️
    document.getElementById('close-modal-efectivo')?.addEventListener('click', () => cerrarModal('modal-efectivo'));
    document.getElementById('close-modal-corte')?.addEventListener('click', () => cerrarModal('modal-corte-caja'));
    // Este solo oculta el reporte, el cierre definitivo está en el botón 'Aceptar'
    document.getElementById('close-modal-reporte')?.addEventListener('click', () => cerrarModal('modal-reporte-corte'));
    
    // 5.1. Búsqueda de Productos 
    document.getElementById('input-sku').addEventListener('input', async (e) => {
        const query = e.target.value;
        const resultadosDiv = document.getElementById('resultados-busqueda');
        
        if (query.length > 2) {
            const resultados = await buscarProductos(query);
            
            resultadosDiv.innerHTML = ''; 

            if (resultados.length > 0) {
                resultados.forEach(p => {
                    const pElement = document.createElement('p');
                    pElement.className = 'resultado-item';
                    pElement.textContent = `${p.name} - $${p.price.toFixed(2)} (${p.stockQty > 0 ? 'Stock: ' + p.stockQty : 'Sin Stock'})`; 
                    
                    pElement.dataset.producto = JSON.stringify({
                        _id: p._id,
                        name: p.name,
                        price: p.price,
                        stockQty: p.stockQty 
                    });

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

    // 5.2. Pago en Efectivo (Muestra modal)
    document.getElementById('btn-pago-efectivo').addEventListener('click', () => {
        if (ventaActual.total <= 0) {
            alert('Agrega productos para pagar.');
            return;
        }
        document.getElementById('modal-efectivo').style.display = 'block';
        document.getElementById('monto-recibido').value = ventaActual.total.toFixed(2); 
        document.getElementById('monto-recibido').dispatchEvent(new Event('input')); 
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
    
    // Mostrar modal de Corte de Caja
    document.getElementById('btn-corte-caja').addEventListener('click', () => {
        if (!corteId) {
             alert('No hay una caja abierta para cerrar.');
             return;
        }
        // Limpiar el campo o cargar el último valor si existe un reporte temporal
        const reporteString = sessionStorage.getItem('corteReporteTemporal'); // ✅ CAMBIO A SESSIONSTORAGE
        if (reporteString) {
             try {
                const reporte = JSON.parse(reporteString);
                document.getElementById('monto-contado').value = reporte.monto_declarado.toFixed(2);
            } catch(e) {
                 document.getElementById('monto-contado').value = '';
            }
        } else {
            document.getElementById('monto-contado').value = ''; 
        }

        document.getElementById('modal-corte-caja').style.display = 'block';
        document.getElementById('monto-contado').focus();
    });

    // Confirmar Corte de Caja desde el modal
    document.getElementById('btn-confirmar-corte')?.addEventListener('click', () => {
        const montoContado = document.getElementById('monto-contado').value;
        if (montoContado !== null && !isNaN(parseFloat(montoContado))) {
            // ⭐️ LLAMA A realizarCorteDeCaja (solo CALCULA el reporte) ⭐️
            realizarCorteDeCaja(parseFloat(montoContado));
        } else {
            alert("Monto inválido. Por favor, ingrese un valor numérico positivo.");
            document.getElementById('monto-contado').focus();
        }
    });

    // ⭐️ LÓGICA DE MODIFICAR MONTO DECLARADO ⭐️
    document.getElementById('btn-modificar-corte')?.addEventListener('click', () => {
        // 1. Cerrar el modal de reporte
        cerrarModal('modal-reporte-corte');
        
        // 2. Abrir el modal de entrada de datos
        document.getElementById('modal-corte-caja').style.display = 'block';
        
        // 3. Precargar el último monto declarado del reporte temporal (para corrección)
        const reporteString = sessionStorage.getItem('corteReporteTemporal'); // ✅ CAMBIO A SESSIONSTORAGE
        if (reporteString) {
            try {
                const reporte = JSON.parse(reporteString);
                // Precargamos el último monto declarado por el usuario
                document.getElementById('monto-contado').value = reporte.monto_declarado.toFixed(2);
            } catch (e) {
                console.error("Error al parsear reporte temporal:", e);
            }
        }
        document.getElementById('monto-contado').focus();
    });

    // Aceptar Reporte y Cerrar Sesión Definitivamente
    document.getElementById('btn-aceptar-reporte')?.addEventListener('click', () => {
        // ⭐️ LLAMA A aceptarYFinalizarCorte (CIERRA LA CAJA EN BD) ⭐️
        aceptarYFinalizarCorte();
    });
    
    // Lógica de Logout MODIFICADA: Ahora obliga a realizar corte a través del modal
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (!corteId) {
            // Cierre de sesión normal si no hay corte activo
            if (lockHeartbeat) clearInterval(lockHeartbeat);
            releaseLock(); 
            sessionStorage.clear(); // ✅ CAMBIO A SESSIONSTORAGE para limpiar sesión
            window.location.href = '../login/login.html'; 
            return;
        }
        
        if (confirm('Al cerrar sesión se realizará el Corte de Caja. ¿Continuar?')) {
            // Muestra el modal de entrada para iniciar el flujo de corte/cierre
            document.getElementById('monto-contado').value = ''; 
            document.getElementById('modal-corte-caja').style.display = 'block';
            document.getElementById('monto-contado').focus();
        } else {
            alert("Cierre de sesión cancelado por el usuario.");
        }
    });

    // ⭐️ Listener para detectar si el candado fue robado por otra pestaña ⭐️
    window.addEventListener('storage', (event) => {
        if (event.key === SESSION_LOCK_KEY) {
            // Check if our lock was overwritten by a different instance
            const currentLockDataString = localStorage.getItem(SESSION_LOCK_KEY);
            if (currentLockDataString) {
                try {
                    const lockData = JSON.parse(currentLockDataString);
                    // If the new lock doesn't have our INSTANCE_ID, we lose the race/surrender.
                    if (lockData.instanceId !== INSTANCE_ID) {
                        // Stop our heartbeat and redirect immediately.
                        if (lockHeartbeat) clearInterval(lockHeartbeat);
                        alert('🚫 Control de sesión perdido. Otra pestaña ha tomado el mando.');
                        // Limpiamos la sesión actual del navegador para evitar conflictos futuros.
                        sessionStorage.removeItem('currentCorteId'); // ✅ CAMBIO A SESSIONSTORAGE
                        sessionStorage.removeItem('supabase-token'); // ✅ CAMBIO A SESSIONSTORAGE
                        window.location.href = '../login/login.html';
                    }
                } catch (e) {
                    // Ignorar errores de parseo
                }
            }
        }
    });
  
    // Cancelar Venta
    document.getElementById('btn-cancelar-venta').addEventListener('click', () => {
        if (confirm('¿Seguro que deseas CANCELAR la venta actual?')) {
            ventaActual.productos = [];
            updateVentaSummary();
            renderCarrito();
        }
    });
}


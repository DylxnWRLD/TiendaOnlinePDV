const $ = (id) => document.getElementById(id); // Utilidad para simplificar
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// Endpoint RPC a tu servidor que llamará a PostgreSQL
const RPC_ENDPOINT_URL = `${API_BASE_URL}/api/rpc/procesar_compra_online`; 

// -------------------------------------------------------------------------
// ⭐️ LÓGICA DE SESIÓN INTEGRADA ⭐️
// -------------------------------------------------------------------------

function getCurrentUserId() {
    const token = sessionStorage.getItem('supabase-token');
    if (!token) return null;
    
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        
        return JSON.parse(jsonPayload).sub;
    } catch (e) {
        console.error("Token inválido:", e);
        return null;
    }
}

function setupHeader() {
    const loginBtn = $("loginBtn"); 
    const token = sessionStorage.getItem('supabase-token'); 
    const role = sessionStorage.getItem('user-role');

    if (token && role) {
        if (loginBtn) {
            loginBtn.textContent = "Mi Cuenta";
            loginBtn.addEventListener("click", () => {
                window.location.href = "../cliente/cliente.html"; 
            });
        }
    } else {
        if (loginBtn) {
            loginBtn.textContent = "Iniciar sesión"; 
            loginBtn.addEventListener("click", () => {
                window.location.href = "../login/login.html";
            });
        }
    }
}

function getCartKey() {
    const userId = getCurrentUserId();
    if (!userId) {
        alert("Debes iniciar sesión para completar tu compra.");
        window.location.href = "../login/login.html";
        return null;
    }
    return `cart_${userId}`;
}

function loadCart() {
    const key = getCartKey();
    if (!key) return [];
    const cartJson = localStorage.getItem(key);
    return cartJson ? JSON.parse(cartJson) : [];
}

function clearCart() {
    const key = getCartKey();
    if (key) {
        localStorage.removeItem(key);
    }
}


// -------------------------------------------------------------------------
// INICIO DEL CÓDIGO CORE
// -------------------------------------------------------------------------

const carrito = loadCart();

// ELEMENTOS DOM
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");

// Modales e Inputs
const directionModal = document.getElementById("directionModal");
const confirmModal = document.getElementById("confirDatosModal");
const paymentModal = document.getElementById("paymentModal");
const confirmCardModal = document.getElementById("confirmCardModal");
const codeModal = document.getElementById("codeModal");
const inputDireccion = document.getElementById("direction");
const inputCorreo = document.getElementById("username");
const inputTelefono = document.getElementById("number");

// Botones y Elementos de Confirmación
const confirmDatos = document.getElementById("confirmDatos");
const yesNotes = document.getElementById("yesNotes");
const noNotes = document.getElementById("noNotes");
const confirmPayment = document.getElementById("confirmPayment");
const yesCard = document.getElementById("yesCard");
const noCard = document.getElementById("noCard");
const showDireccion = document.getElementById("showDireccion");
const showCorreo = document.getElementById("showCorreo");
const showTelefono = document.getElementById("showTelefono");

// Estado para almacenar temporalmente los datos del cliente y pago
let datosCliente = {};

function renderCarrito() {
    const cartItems = document.getElementById("cartItems");
    cartItems.innerHTML = "";

    let subtotal = 0;
    let descuento = 0;
    const payBtn = document.getElementById("payBtn");

    if (carrito.length === 0) {
        cartItems.innerHTML = '<p>Tu carrito está vacío. <a href="../../index.html">Volver a la tienda</a></p>';
        payBtn.disabled = true;
    } else {
        payBtn.disabled = false;
        carrito.forEach(item => {
            const itemQuantity = item.quantity || item.cantidad || 1; 
            const itemPrice = item.precio || 0;
            const itemDiscountPercent = item.descuento || 0;

            let totalProducto = itemPrice * itemQuantity;
            let descuentoProducto = totalProducto * (itemDiscountPercent / 100); 

            subtotal += totalProducto;
            descuento += descuentoProducto;

            cartItems.innerHTML += `
                <div class="cart-item">
                                    </div>
            `;
        });
    }

    let total = subtotal - descuento;

    subtotalEl.textContent = subtotal.toFixed(2);
    discountEl.textContent = descuento.toFixed(2);
    totalEl.textContent = total.toFixed(2);
    return total;
}

// -------------------------------------------------------------------------
// ⭐️ LÓGICA DE EVENTOS (AJUSTADA PARA GUARDAR DATOS) ⭐️
// -------------------------------------------------------------------------

// Listener: Botón "Realizar compra"
document.getElementById("payBtn").addEventListener("click", () => {
    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }
    directionModal.classList.remove("hidden");
});

// Listener: Botón "Confirmar datos" (Modal 1)
confirmDatos.addEventListener("click", () => {
    const direccion = inputDireccion.value.trim();
    const correo = inputCorreo.value.trim();
    const telefono = inputTelefono.value.trim();

    if (!direccion || !correo || !telefono || !correo.includes("@") || !correo.includes(".") || telefono.length !== 10 || isNaN(telefono)) {
        alert("Por favor completa los campos correctamente (Correo válido, Teléfono de 10 dígitos).");
        return;
    }

    // ⭐️ Guardar datos del cliente temporalmente
    datosCliente = { direccion, correo, telefono };

    // Mostrar datos y cambiar modales
    showDireccion.textContent = direccion;
    showCorreo.textContent = correo;
    showTelefono.textContent = telefono;
    directionModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
});

// Listener: Botón "Confirmar pago" (Modal 3)
confirmPayment.addEventListener("click", () => {
    let metodo = document.querySelector('input[name="payMethod"]:checked');
    const cardNumberInput = document.getElementById("cardNumber");
    const cvvInput = document.getElementById("cvv");
    
    let tarjeta = cardNumberInput.value.trim();
    let cvv = cvvInput.value.trim();

    if (!metodo || tarjeta.length !== 16 || isNaN(tarjeta) || cvv.length !== 3 || isNaN(cvv)) {
        alert("Por favor selecciona un método y verifica Tarjeta (16 dígitos) y CVV (3 dígitos).");
        return;
    }

    // ⭐️ Guardar método de pago para el RPC
    datosCliente.metodoPago = metodo.value === 'Debito' ? 'TARJETA DEBITO' : 'TARJETA CREDITO';

    // Mostrar confirmación
    paymentModal.classList.add("hidden");
    confirmCardModal.classList.remove("hidden");
    document.getElementById("showCard").textContent = tarjeta;
    document.getElementById("showCVV").textContent = cvv;
});


// ⭐️ Listener CRÍTICO: Botón "Sí" - Inicia la Transacción (Modal 5) ⭐️
yesCard.addEventListener("click", async () => {
    // Deshabilitar botones
    yesCard.disabled = true;
    noCard.disabled = true;

    confirmCardModal.classList.add("hidden");
    alert("Procesando pago... por favor espera."); 

    try {
        // Ejecutar la función RPC en el servidor
        const resultado = await procesarCompraFinal();

        if (resultado && resultado.codigo_ped) {
            // Éxito: limpiar carrito y mostrar modal de código
            clearCart();
            
            codeModal.classList.remove("hidden"); 
            document.getElementById("codigoGenerado").textContent = resultado.codigo_ped;

            // Redirección al seguimiento
            document.getElementById("finalRedirectBtn").onclick = function () {
                window.location.href = `../cliente/seguimiento-detalle.html?id=${resultado.codigo_ped}`;
            };
        } else {
            alert("Error al recibir el código de pedido. Intenta de nuevo.");
            paymentModal.classList.remove("hidden"); 
        }
    } catch (error) {
        console.error("Error en la transacción final:", error);
        alert(`Fallo en la compra: ${error.message || 'Error desconocido del servidor.'}`);
        paymentModal.classList.remove("hidden"); 
    } finally {
        yesCard.disabled = false;
        noCard.disabled = false;
    }
});


// -------------------------------------------------------------------------
// ⭐️ FUNCIÓN RPC DE COMUNICACIÓN CON EL BACKEND ⭐️
// -------------------------------------------------------------------------

async function procesarCompraFinal() {
    const totalFinal = parseFloat(totalEl.textContent) || 0;

    // 1. Mapear el carrito al formato JSONB que espera PostgreSQL
    const detallesVenta = carrito.map(item => ({
        id_producto_mongo: item.id || 'N/A', 
        nombre_producto: item.nombre || 'Producto Desconocido',
        cantidad: item.quantity || item.cantidad || 1,
        precio_unitario_venta: item.precio || 0,
        total_linea: (item.precio * (item.quantity || 1)) - ((item.precio * (item.quantity || 1)) * (item.descuento || 0) / 100)
    }));

    // 2. Construir el payload con todos los datos necesarios
    const payload = {
        p_correo: datosCliente.correo,
        p_direccion: datosCliente.direccion,
        p_telefono: datosCliente.telefono,
        p_total_final: totalFinal.toFixed(2),
        p_metodo_pago: datosCliente.metodoPago,
        p_detalles: detallesVenta
    };

    try {
        const token = sessionStorage.getItem('supabase-token');
        if (!token) {
            throw new Error("TOKEN_MISSING: Por favor, inicia sesión para completar la compra.");
        }

        const response = await fetch(RPC_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // CRÍTICO: Envía el token al servidor
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            let dbError = 'Error al comunicarse con la base de datos.';
            try {
                const errorData = JSON.parse(errorText);
                dbError = errorData.message || errorData.error || dbError;
            } catch {
                dbError = `Error HTTP ${response.status}: ${errorText.substring(0, 100)}...`;
            }
            throw new Error(dbError);
        }

        // PostgREST/Supabase devuelve un array de un solo elemento para el RPC
        const result = await response.json();
        
        if (result && result.length > 0) {
            return result[0]; // Retorna {id_v_online, codigo_ped}
        } else {
            throw new Error('Respuesta vacía o inesperada del servidor.');
        }

    } catch (e) {
        throw e;
    }
}

// -------------------------------------------------------------------------
// 🚀 INICIALIZACIÓN Y OTROS LISTENERS (SIN CAMBIOS DE LÓGICA) ⭐️
// -------------------------------------------------------------------------

// Mapeos adicionales (para que no fallen los listeners originales)
document.getElementById("payBtn").addEventListener("click", () => {
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }
    document.getElementById("directionModal").classList.remove("hidden");
});
document.getElementById("yesNotes").addEventListener("click", () => {
    document.getElementById("confirDatosModal").classList.add("hidden");
    document.getElementById("paymentModal").classList.remove("hidden");
});
document.getElementById("noNotes").addEventListener("click", () => {
    document.getElementById("confirDatosModal").classList.add("hidden");
    document.getElementById("directionModal").classList.remove("hidden");
});
document.getElementById("cancelPayment").addEventListener("click", () => {
    document.getElementById("paymentModal").classList.add("hidden");
    document.getElementById("cancelModal").classList.remove("hidden");
});
document.getElementById("yesCancel").addEventListener("click", () => {
    document.getElementById("cancelModal").classList.add("hidden");
    alert("Compra cancelada.");
    location.href = "../../index.html";
});
document.getElementById("noCancel").addEventListener("click", () => {
    document.getElementById("cancelModal").classList.add("hidden");
    document.getElementById("paymentModal").classList.remove("hidden");
});
document.getElementById("noCard").addEventListener("click", () => {
    document.getElementById("confirmCardModal").classList.add("hidden");
    document.getElementById("paymentModal").classList.remove("hidden");
});


document.addEventListener('DOMContentLoaded', () => {
    if (!getCurrentUserId()) {
        return;
    }
    setupHeader();
    renderCarrito(); 
});
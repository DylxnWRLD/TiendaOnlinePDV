const $ = (id) => document.getElementById(id); // Utilidad para simplificar
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// Endpoint RPC a tu servidor que llamará a PostgreSQL
const RPC_ENDPOINT_URL = `${API_BASE_URL}/api/rpc/procesar_compra_online`;
// ⭐️ NUEVO ENDPOINT PARA CONSULTAR DATOS DEL CLIENTE ⭐️
const CLIENTE_DATA_URL = `${API_BASE_URL}/api/cliente/data`;

// -------------------------------------------------------------------------
// ⭐️ LÓGICA DE SESIÓN Y DATOS ⭐️
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
// ESTADO Y DOM
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
const confirmPayment = document.getElementById("confirmPayment");
const yesCard = document.getElementById("yesCard");
const noCard = document.getElementById("noCard");
const showDireccion = document.getElementById("showDireccion");
const showCorreo = document.getElementById("showCorreo");
const showTelefono = document.getElementById("showTelefono");

// Botones de Navegación (Atrás)
const backBtnConfirm = document.getElementById("noNotes");
const backBtnPayment = document.getElementById("backBtnPayment");

// Estado para almacenar temporalmente los datos del cliente y pago
let datosCliente = {};

// -------------------------------------------------------------------------
// ⭐️ FUNCIÓN: RENDERIZAR CARRITO (IMAGEN CORREGIDA) ⭐️
// -------------------------------------------------------------------------

function renderCarrito() {
    const cartItems = document.getElementById("cartItems");
    cartItems.innerHTML = "";

    let subtotal = 0;
    let descuento = 0;
    const payBtn = document.getElementById("payBtn");

    if (carrito.length === 0) {
        cartItems.innerHTML = '<p>Tu carrito está vacío. <a href="../../index.html">Volver a la tienda</a></p>';
        if (payBtn) payBtn.disabled = true;
    } else {
        if (payBtn) payBtn.disabled = false;
        carrito.forEach(item => {
            const itemQuantity = item.quantity || item.cantidad || 1;
            const itemPrice = item.price || item.precio || 0;
            const itemDiscountPercent = item.descuento?.valor || item.descuento || 0;

            let totalProducto = itemPrice * itemQuantity;
            let descuentoProducto = totalProducto * (itemDiscountPercent / 100);

            subtotal += totalProducto;
            descuento += descuentoProducto;

            // ⭐️ CORRECCIÓN CLAVE: Lógica robusta para obtener la URL de la imagen ⭐️
            let imageUrl = 'https://placehold.co/50x50/cccccc/000000?text=IMG';
            if (Array.isArray(item.images) && item.images.length > 0) {
                imageUrl = item.images[0];
            } else if (item.image) {
                imageUrl = item.image;
            } else if (typeof item.images === 'string' && item.images.startsWith('http')) {
                imageUrl = item.images;
            }

            // HTML que renderiza el producto
            cartItems.innerHTML += `
                <div class="cart-item">
                    <img src="${item.imagen || 'https://via.placeholder.com/50'}" class="mini-img">
                    <p>${item.nombre || 'Producto sin nombre'}</p>
                    <p>Cant: ${itemQuantity}</p>
                    <p>$${(totalProducto - descuentoProducto).toFixed(2)}</p>
                </div>
            `;
        });
    }

    let total = subtotal - descuento;

    subtotalEl.textContent = total.toFixed(2); // Corregido: total en vez de subtotal
    discountEl.textContent = descuento.toFixed(2);
    totalEl.textContent = total.toFixed(2);
    return total;
}

// -------------------------------------------------------------------------
// ⭐️ FUNCIÓN: OBTENER DATOS DEL CLIENTE DESDE EL BACKEND (PRECarga) ⭐️
// -------------------------------------------------------------------------

async function fetchClienteData() {
    const token = sessionStorage.getItem('supabase-token');
    if (!token) return;

    try {
        const response = await fetch(CLIENTE_DATA_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // ⭐️ Precarga los campos del formulario con los datos guardados ⭐️
            inputCorreo.value = data.correo || '';
            inputDireccion.value = data.direccion || '';
            inputTelefono.value = data.telefono || '';
            console.log('Datos del cliente precargados.');
        } else if (response.status === 404) {
            console.log('Cliente nuevo. No hay datos previos para precargar.');
        } else {
            console.error('Error al obtener datos del cliente:', response.statusText);
        }
    } catch (e) {
        console.error('Fallo de red al obtener datos del cliente:', e);
    }
}


// -------------------------------------------------------------------------
// FUNCIÓN RPC DE COMUNICACIÓN CON EL BACKEND (procesarCompraFinal)
// -------------------------------------------------------------------------

async function procesarCompraFinal() {
    // ... (El cuerpo de procesarCompraFinal se mantiene igual) ...
    const totalFinal = parseFloat(totalEl.textContent) || 0;

    const detallesVenta = carrito.map(item => ({
        id_producto_mongo: item._id || item.id || 'N/A',
        nombre_producto: item.name || item.nombre || 'Producto Desconocido',
        cantidad: item.quantity || item.cantidad || 1,
        precio_unitario_venta: item.price || item.precio || 0,
        total_linea: (item.price || item.precio) * (item.quantity || 1) * (1 - (item.descuento?.valor || 0) / 100)
    }));

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
                'Authorization': `Bearer ${token}`
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

        const result = await response.json();

        if (result && result.length > 0) {
            return result[0];
        } else {
            throw new Error('Respuesta vacía o inesperada del servidor.');
        }

    } catch (e) {
        throw e;
    }
}

// -------------------------------------------------------------------------
// LISTENERS Y NAVEGACIÓN
// -------------------------------------------------------------------------

// Listener: Botón "Realizar compra"
document.getElementById("payBtn").addEventListener("click", () => {
    if (!getCurrentUserId()) {
        alert("Debes iniciar sesión para completar tu compra.");
        window.location.href = "../login/login.html";
        return;
    }
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }
    document.getElementById("directionModal").classList.remove("hidden");
});

// ⭐️ NUEVO LISTENER: Botón "Cancelar compra" en Modal 1 (Dirección) ⭐️
if (document.getElementById("cancelDatos")) {
    document.getElementById("cancelDatos").addEventListener("click", () => {
        directionModal.classList.add("hidden");
        document.getElementById("cancelModal").classList.remove("hidden");
    });
}

// Listener: Botón "Confirmar datos" (Modal 1 -> Modal 2)
confirmDatos.addEventListener("click", () => {
    const direccion = inputDireccion.value.trim();
    const correo = inputCorreo.value.trim();
    const telefono = inputTelefono.value.trim();

    if (!direccion || !correo || !telefono || !correo.includes("@") || !correo.includes(".") || telefono.length !== 10 || isNaN(telefono)) {
        alert("Por favor completa los campos correctamente (Correo válido, Teléfono de 10 dígitos).");
        return;
    }

    datosCliente = { direccion, correo, telefono };

    showDireccion.textContent = direccion;
    showCorreo.textContent = correo;
    showTelefono.textContent = telefono;
    directionModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
});


// Listener: Botón "Atrás"/"No" en Modal 2 (Confirmar Datos -> Dirección) 
if (document.getElementById("noNotes")) {
    document.getElementById("noNotes").addEventListener("click", () => {
        confirmModal.classList.add("hidden");
        directionModal.classList.remove("hidden");
    });
}


// Listener: Botón "Sí" - Datos Correctos (Modal 2 -> Modal 3: Pago)
yesNotes.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    paymentModal.classList.remove("hidden");
});


// Listener: Botón "Confirmar pago" (Modal 3 -> Modal 5)
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

    datosCliente.metodoPago = metodo.value === 'Debito' ? 'TARJETA DEBITO' : 'TARJETA CREDITO';

    paymentModal.classList.add("hidden");
    confirmCardModal.classList.remove("hidden");
    document.getElementById("showCard").textContent = tarjeta;
    document.getElementById("showCVV").textContent = cvv;
});


// Listener: Botón "Atrás" en Modal 3 (Pago -> Confirmar Datos) ⭐️
if (document.getElementById("backBtnPayment")) {
    document.getElementById("backBtnPayment").addEventListener("click", () => {
        paymentModal.classList.add("hidden");
        confirmModal.classList.remove("hidden");
    });
}


// Listener CRÍTICO: Botón "Sí" - Procesa la Transacción (Modal 5)
yesCard.addEventListener("click", async () => {
    yesCard.disabled = true;
    noCard.disabled = true;

    confirmCardModal.classList.add("hidden");
    try {
        const resultado = await procesarCompraFinal();

        if (resultado && resultado.codigo_ped) {
            clearCart();
            renderCarrito();

            codeModal.classList.remove("hidden");
            document.getElementById("codigoGenerado").textContent = resultado.codigo_ped;

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


// Otros listeners (cancelar, etc.)
document.getElementById("noCard").addEventListener("click", () => {
    document.getElementById("confirmCardModal").classList.add("hidden");
    document.getElementById("paymentModal").classList.remove("hidden");
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


// -------------------------------------------------------------------------
// 🚀 INICIALIZACIÓN 
// -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    renderCarrito();
    fetchClienteData(); 
});
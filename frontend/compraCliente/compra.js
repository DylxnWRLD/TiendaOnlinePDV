const $ = (id) => document.getElementById(id); // Utilidad para simplificar
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

const RPC_ENDPOINT_URL = `${API_BASE_URL}/api/rpc/procesar_compra_online`;
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
// ⭐️ FUNCIÓN: RENDERIZAR CARRITO ⭐️
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
            //const itemDiscountPercent = item.descuento?.valor || item.descuento || 0;

            let totalProducto = itemPrice * itemQuantity;
            let descuentoProducto = 0;

            if (item.descuento && item.descuento.activa) {
                const { tipo_descuento, valor } = item.descuento;
                if (tipo_descuento === 'PORCENTAJE') {
                    descuentoProducto = totalProducto * (valor / 100);
                } else if (tipo_descuento === 'MONTO') {
                    descuentoProducto = valor * itemQuantity;
                }
            }
            subtotal += totalProducto;
            descuento += descuentoProducto;

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

    subtotalEl.textContent = subtotal.toFixed(2); // Corregido: Subtotal antes de descuento
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

// -------------------------------------------------------------------------
// FUNCIÓN RPC DE COMUNICACIÓN CON EL BACKEND (procesarCompraFinal) - VERSIÓN SIMPLIFICADA
// -------------------------------------------------------------------------

async function procesarCompraFinal() {
    const totalFinal = parseFloat(totalEl.textContent) || 0;

    // ✅ DEBUG: Verificar datos antes de procesar
    console.group(" DEBUG PROCESAR COMPRA FINAL");
    console.log("Total Final:", totalFinal);
    console.log(" Carrito:", carrito);
    console.log(" Datos Cliente:", datosCliente);
    console.log("User ID:", getCurrentUserId());
    console.groupEnd();

    // Validación básica de datos críticos
    if (!datosCliente.correo || !datosCliente.direccion || !datosCliente.telefono) {
        throw new Error("Datos del cliente incompletos. Por favor, verifica tu información.");
    }

    if (totalFinal <= 0) {
        throw new Error("El total de la compra debe ser mayor a cero.");
    }

    // Preparar detalles de la venta
    const detallesVenta = carrito.map(item => {
        const cantidad = item.quantity || item.cantidad || 1;
        const precioUnitario = item.price || item.precio || 0;

        let totalLineaBruto = precioUnitario * cantidad;
        let descuentoLinea = 0;

        // Calcular descuentos si existen
        if (item.descuento && item.descuento.activa) {
            const { tipo_descuento, valor } = item.descuento;

            if (tipo_descuento === 'PORCENTAJE') {
                descuentoLinea = totalLineaBruto * (valor / 100);
            } else if (tipo_descuento === 'MONTO') {
                descuentoLinea = valor * cantidad;
            }
        }

        const totalLineaNeto = totalLineaBruto - descuentoLinea;

        return {
            id_producto_mongo: item._id || item.id || 'N/A',
            nombre_producto: item.name || item.nombre || 'Producto Desconocido',
            cantidad: cantidad,
            precio_unitario_venta: precioUnitario,
            total_linea: parseFloat(totalLineaNeto.toFixed(2))
        };
    });

    // Limpiar y validar teléfono
    datosCliente.telefono = datosCliente.telefono ? datosCliente.telefono.trim().replace(/\s/g, '') : '';

    if (datosCliente.telefono.length !== 10 || !/^\d+$/.test(datosCliente.telefono)) {
        throw new Error("El teléfono debe contener exactamente 10 dígitos numéricos.");
    }

    // ✅ UUID DIRECTO DEL REPARTIDOR
    const REPARTIDOR_UUID = '2acb3f97-2d15-4eea-a77d-493e5573dcf3';

    const payload = {
        p_correo: datosCliente.correo.trim(),
        p_direccion: datosCliente.direccion.trim(),
        p_telefono: datosCliente.telefono,
        p_total_final: parseFloat(totalFinal.toFixed(2)),
        p_metodo_pago: datosCliente.metodoPago,
        p_detalles: detallesVenta,
        p_id_repartidor: REPARTIDOR_UUID // ✅ UUID directo
    };

    // ✅ DEBUG DETALLADO del payload
    console.group(" PAYLOAD ENVIADO A RPC");
    console.log("Payload completo:", JSON.stringify(payload, null, 2));
    console.log("Número de items:", detallesVenta.length);
    console.log("Método de pago:", datosCliente.metodoPago);
    console.log("Repartidor asignado:", REPARTIDOR_UUID);
    console.groupEnd();

    try {
        const token = sessionStorage.getItem('supabase-token');
        if (!token) {
            throw new Error("TOKEN_MISSING: Por favor, inicia sesión para completar la compra.");
        }

        console.log(" Enviando solicitud a:", RPC_ENDPOINT_URL);

        const response = await fetch(RPC_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log(" Respuesta HTTP Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(" Error response from server:", errorText);

            // ✅ MANEJO ESPECÍFICO DE ERRORES HTTP
            let userFriendlyError = 'Error al procesar la compra.';

            switch (response.status) {
                case 401:
                    userFriendlyError = "Sesión expirada. Por favor, inicia sesión nuevamente.";
                    break;
                case 400:
                    userFriendlyError = "Datos inválidos en la solicitud. Verifica tu información.";
                    break;
                case 403:
                    userFriendlyError = "No tienes permisos para realizar esta acción.";
                    break;
                case 500:
                    userFriendlyError = "Error interno del servidor. Por favor, intenta más tarde.";
                    break;
            }

            // Intentar parsear error de base de datos
            try {
                const errorData = JSON.parse(errorText);
                const dbMessage = errorData.message || errorData.error || errorData.details;

                if (dbMessage) {
                    // ✅ MANEJO DE ERRORES ESPECÍFICOS DE SUPABASE
                    if (dbMessage.includes('DUPLICATE_DATA')) {
                        userFriendlyError = "El número de teléfono ya está asociado a otra cuenta.";
                    } else if (dbMessage.includes('INVALID_DATA')) {
                        userFriendlyError = "Datos inválidos. Verifica tu información de contacto.";
                    } else if (dbMessage.includes('check constraint')) {
                        userFriendlyError = "Información de pago inválida. Verifica los datos de tu tarjeta.";
                    } else {
                        userFriendlyError = dbMessage;
                    }
                }
            } catch (parseError) {
                // Si no se puede parsear JSON, usar el texto plano
                if (errorText.includes('duplicate key') || errorText.includes('unique constraint')) {
                    userFriendlyError = "El número de teléfono ya está registrado en otra cuenta.";
                }
            }

            throw new Error(userFriendlyError);
        }

        const result = await response.json();
        console.log("Respuesta RPC recibida:", result);

        // ✅ VERIFICACIÓN ROBUSTA DEL RESULTADO
        if (!result || !Array.isArray(result) || result.length === 0) {
            throw new Error('La respuesta del servidor está vacía o en formato incorrecto.');
        }

        const compraResult = result[0];

        // Verificar que tenemos los datos críticos
        if (!compraResult.id_pedido) {
            console.error(" Respuesta incompleta - Faltan datos:", compraResult);
            throw new Error('No se recibió el ID del pedido. La compra no se completó correctamente.');
        }

        if (!compraResult.codigo_ped) {
            console.error(" Respuesta incompleta - Sin código de pedido:", compraResult);
            throw new Error('No se generó el código de pedido. Contacta con soporte.');
        }

        console.log(" COMPRA EXITOSA - Datos recibidos:");
        console.log("   ID Pedido:", compraResult.id_pedido);
        console.log("    Código Pedido:", compraResult.codigo_ped);
        console.log("    ID Venta Online:", compraResult.id_v_online);

        return compraResult;

    } catch (error) {
        console.error("Error completo en procesarCompraFinal:", error);

        // ✅ RE-LANZAR ERROR CON INFORMACIÓN MEJORADA
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Error de conexión. Verifica tu internet e intenta nuevamente.');
        }

        throw error;
    }
}

// -------------------------------------------------------------------------
// FUNCIÓN DE DEBUG MEJORADA
// -------------------------------------------------------------------------

function debugProcesoCompraCompleto() {
    console.group("🧾 DEBUG COMPLETO PROCESO COMPRA");
    console.log("📦 Carrito items:", carrito.length);
    console.log("👤 Datos Cliente:", {
        correo: datosCliente.correo,
        direccion: datosCliente.direccion ? "PRESENTE" : "AUSENTE",
        telefono: datosCliente.telefono,
        metodoPago: datosCliente.metodoPago
    });
    console.log("💰 Total:", totalEl.textContent);
    console.log("🔑 User ID:", getCurrentUserId());
    console.log("🔐 Token:", sessionStorage.getItem('supabase-token') ? "PRESENTE" : "AUSENTE");
    console.log("🌐 API Base:", API_BASE_URL);
    console.log("🚚 Repartidor UUID:", '2acb3f97-2d15-4eea-a77d-493e5573dcf3');
    console.groupEnd();
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


yesCard.addEventListener("click", async () => {
    yesCard.disabled = true;
    noCard.disabled = true;
    confirmCardModal.classList.add("hidden");

    // ✅ DEBUG ANTES DE PROCESAR
    debugProcesoCompraCompleto();

    try {
        const resultado = await procesarCompraFinal();

        // ✅ VERIFICACIÓN FINAL
        if (resultado && resultado.id_pedido && resultado.codigo_ped) {
            clearCart();
            renderCarrito();
            codeModal.classList.remove("hidden");
            document.getElementById("codigoGenerado").textContent = resultado.codigo_ped;

            // ✅ REDIRECCIÓN CORRECTA CON ID_PEDIDO
            document.getElementById("finalRedirectBtn").onclick = function () {
                window.location.href = `../cliente/seguimiento-detalle.html?id=${resultado.id_pedido}`;
            };

            console.log("🎉 Redirección configurada con ID:", resultado.id_pedido);
        } else {
            throw new Error("Respuesta incompleta del servidor");
        }
    } catch (error) {
        console.error("❌ Error en la transacción:", error);
        alert(`❌ Error en la compra: ${error.message}`);
        confirmCardModal.classList.remove("hidden");
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
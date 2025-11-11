// dylxnwrld/tiendaonlinepdv/TiendaOnlinePDV-6fd25318790eabba740e5931df289c127ba0141b/frontend/compraCliente/compra.js

const $ = (id) => document.getElementById(id); // Utilidad para simplificar
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// -------------------------------------------------------------------------
// ⭐️ LÓGICA DE SESIÓN INTEGRADA (Adaptada para compra.html) ⭐️
// -------------------------------------------------------------------------

// 1. Obtiene el ID del usuario
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

// 2. Lógica para configurar el botón del encabezado
function setupHeader() {
    const loginBtn = $("loginBtn"); 
    const token = sessionStorage.getItem('supabase-token'); 
    const role = sessionStorage.getItem('user-role');

    if (token && role) {
        // --- Usuario LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Mi Cuenta";
            loginBtn.addEventListener("click", () => {
                // Redirige a la página del cliente
                window.location.href = "../cliente/cliente.html"; 
            });
        }
    } else {
        // --- Usuario NO LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Iniciar sesión"; 
            loginBtn.addEventListener("click", () => {
                // Redirige a la página de login
                window.location.href = "../login/login.html";
            });
        }
    }
}

// 3. Lógica para cargar el carrito guardado por usuario
function getCartKey() {
    const userId = getCurrentUserId();
    if (!userId) {
        // Si el usuario no está logueado, lo redirigimos al login
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

// -------------------------------------------------------------------------
// INICIO DEL CÓDIGO ORIGINAL (Ajustado)
// -------------------------------------------------------------------------

// ⚠️ CORREGIDO: Leer de sessionStorage y usar las funciones de sesión
const token = sessionStorage.getItem('supabase-token'); 
const corteId = sessionStorage.getItem('currentCorteId'); 
const role = sessionStorage.getItem('user-role'); 

// Estado local de la venta
let ventaActual = {
    productos: [], 
    subtotal: 0,
    descuento: 0,
    total: 0
};

// ⭐️ CORREGIDO: Cargar el carrito real del usuario logueado ⭐️
const carrito = loadCart();

// ELEMENTOS
const cartItems = document.getElementById("cartItems");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const payBtn = document.getElementById("payBtn");

// ELEMENTOS PARA LOS DATOS DE ENTREGA
//const directionModal = document.getElementById("datosEntrega")
//const confirmModal = document.getElementById("confirmDatosModal")

//ELEMENTO DE LOS DATOS ENTRANTES
//const inputDireccion = document.getElementById("direction")
//const inputCorreo = document.getElementById("username")
//const inputTelefono = document.getElementById("number")

//const showDireccion = document.getElementById("showDireccion")
//const showCorreo = ddocument.getElementById("showCorreo")
//const showTelefono = document.getElementById("showTelefono")

//const confirmDatos =  document.getElementById("confirmDatos")
//const yesNotes = document.getElementById("yesNotes")
//const noNotes = document.getElementById("noNotes")

// ELEMENTOS PARA LOS DATOS DE ENTREGA
const directionModal = document.getElementById("directionModal");
const confirmModal = document.getElementById("confirDatosModal");

// Inputs
const inputDireccion = document.getElementById("direction");
const inputCorreo = document.getElementById("username");
const inputTelefono = document.getElementById("number");

// Contenedores para mostrar los datos
const showDireccion = document.getElementById("showDireccion");
const showCorreo = document.getElementById("showCorreo");
const showTelefono = document.getElementById("showTelefono");

// Botones
const confirmDatos = document.getElementById("confirmDatos");
const yesNotes = document.getElementById("yesNotes");
const noNotes = document.getElementById("noNotes");

// ELEMENTOS DEL METOD DE PAGO
const paymentModal = document.getElementById("paymentModal");
const cancelModal = document.getElementById("cancelModal");

const confirmCardModal = document.getElementById("confirmCardModal");
const codeModal = document.getElementById("codeModal");

// BOTONES
const cancelPayment = document.getElementById("cancelPayment");
const confirmPayment = document.getElementById("confirmPayment");
const yesCancel = document.getElementById("yesCancel");
const noCancel = document.getElementById("noCancel");

// BOTONES DE CONFIRMACIÓN DE TARJETA
const yesCard = document.getElementById("yesCard");
const noCard = document.getElementById("noCard");

const cardNumberInput = document.getElementById("cardNumber");
const cvvInput = document.getElementById("cvv");

// ⚠️ CORREGIDO: showCVV se define correctamente desde el DOM para el modal
const showCard = document.getElementById("showCard");
const showCVV = document.getElementById("showCVV"); 

// Mostrar productos en pantalla
function renderCarrito() {
    cartItems.innerHTML = "";

    let subtotal = 0;
    let descuento = 0;

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
            // Descuento asumido como porcentaje
            let descuentoProducto = totalProducto * (itemDiscountPercent / 100); 

            subtotal += totalProducto;
            descuento += descuentoProducto;

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

    subtotalEl.textContent = subtotal.toFixed(2);
    discountEl.textContent = descuento.toFixed(2);
    totalEl.textContent = total.toFixed(2);
}

// Mostrar ventana de pago
payBtn.addEventListener("click", () => {
    // Seguridad adicional para evitar pago con carrito vacío
    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }
    directionModal.classList.remove("hidden");
});

confirmDatos.addEventListener("click", () => {
    const direccion = inputDireccion.value.trim();
    const correo = inputCorreo.value.trim();
    const telefono = inputTelefono.value.trim();

    if (!direccion || !correo || !telefono) {
        alert("Por favor completa todos los campos.");
        return;
    }

    // Validación de correo básico
    if (!correo.includes("@") || !correo.includes(".")) {
        alert("Ingresa un correo válido.");
        return;
    }

    // Validación de teléfono
    if (telefono.length !== 10 || isNaN(telefono)) {
        alert("El número de teléfono debe tener 10 dígitos.");
        return;
    }

    // Mostrar datos
    showDireccion.textContent = direccion;
    showCorreo.textContent = correo;
    showTelefono.textContent = telefono;

    // Cambiar modales
    directionModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
});

// datos correctos → pasar al método de pago
yesNotes.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    paymentModal.classList.remove("hidden");
});

// corregir → regresar al modal de dirección
noNotes.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    directionModal.classList.remove("hidden");
});

//Mostrar Pantalla de confirmar datos de entrega
//confirmDatos.addEventListener("click", () => {
//    let direccion = inputDireccion.value.trim();
//    let correo = inputCorreo.value.trim();
//    let telefono = inputTelefono.value.trim();

//    if (direccion === "" || correo === "" || telefono === "") {
//       alert("Por favor llena todos los campos.");
//        return;
//    }

//    showDireccion.textContent = direccion;
//    showCorreo.textContent = correo;
//    showTelefono.textContent = telefono;

//    directionModal.classList.add("hidden");
//    confirmModal.classList.remove("hidden");
//});

//Confirmacion de los datos 
//yesNotes.addEventListener("click", () => {
//    confirmModal.classList.add("hidden");
//    paymentModal.classList.remove("hidden");
//});

//noNotes.addEventListener("click", () => {
//    confirmModal.classList.add("hidden");
//    directionModal.classList.remove("hidden");
//});



// Cancelar compra (abre confirmación)
cancelPayment.addEventListener("click", () => {
    paymentModal.classList.add("hidden");
    cancelModal.classList.remove("hidden");
});

// SI cancela (redirige al inicio)
yesCancel.addEventListener("click", () => {
    cancelModal.classList.add("hidden");
    alert("Compra cancelada.");
    location.href = "../../index.html";
});

// NO cancela (vuelve al modal de pago)
noCancel.addEventListener("click", () => {
    cancelModal.classList.add("hidden");
    paymentModal.classList.remove("hidden");
});

// Confirmar método y datos antes de pagar
confirmPayment.addEventListener("click", () => {
    let metodo = document.querySelector('input[name="payMethod"]:checked');
    let tarjeta = cardNumberInput.value.trim();
    let cvv = cvvInput.value.trim();

    // VALIDACIONES
    if (!metodo) {
        alert("Selecciona Débito o Crédito.");
        return;
    }
    if (tarjeta.length !== 16 || isNaN(tarjeta)) {
        alert("El número de tarjeta debe tener 16 dígitos.");
        return;
    }
    if (cvv.length !== 3 || isNaN(cvv)) {
        alert("El CVV debe tener 3 dígitos.");
        return;
    }

    // Mostrar confirmación
    paymentModal.classList.add("hidden");
    confirmCardModal.classList.remove("hidden");
    // ⭐️ Muestra la información en los spans del HTML ⭐️
    showCard.textContent = tarjeta;
    showCVV.textContent = cvv;
});

// Si los datos de la tarjeta son correctos → generar código y redirigir
yesCard.addEventListener("click", () => {
    confirmCardModal.classList.add("hidden");
    codeModal.classList.remove("hidden"); 

    const codigo = "ENT-" + Math.floor(Math.random() * 999999);
    document.getElementById("codigoGenerado").textContent = codigo;

    console.log("Código enviado al repartidor:", codigo);

    const finalRedirectBtn = document.getElementById("finalRedirectBtn");
    if (finalRedirectBtn) {
        finalRedirectBtn.onclick = function () {
            // Redirige al detalle de seguimiento
            window.location.href = `../cliente/seguimiento-detalle.html?id=${codigo}`;
        };
    }
});

// Si NO son correctos → regresar
noCard.addEventListener("click", () => {
    confirmCardModal.classList.add("hidden");
    paymentModal.classList.remove("hidden");
});

// -------------------------------------------------------------------------
// 🚀 INICIALIZACIÓN
// -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa la sesión en el header (Cambia "Iniciar sesión" a "Mi Cuenta")
    setupHeader();

    // 2. Render inicial del carrito
    renderCarrito();
});
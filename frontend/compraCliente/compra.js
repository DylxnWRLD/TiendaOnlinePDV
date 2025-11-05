const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com'; // ⭐️ Revisa esta URL para Render ⭐️

// Obtención de datos de sesión del localStorage
const token = localStorage.getItem('supabase-token'); 
const corteId = localStorage.getItem('currentCorteId');
const role = localStorage.getItem('user-role'); 

// Estado local de la venta (el "carrito")
let ventaActual = {
    productos: [], // Contiene {id_producto_mongo, nombre_producto, precio_unitario, cantidad, monto_descuento, stock_disponible}
    subtotal: 0,
    descuento: 0,
    total: 0
};

// Ejemplo de productos cargados desde la base o LocalStorage
//const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ELEMENTOS
const cartItems = document.getElementById("cartItems");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const payBtn = document.getElementById("payBtn");

const paymentModal = document.getElementById("paymentModal");
const cancelModal = document.getElementById("cancelModal");
const confirmCardModal = document.getElementById("confirmCardModal");
const codeModal = document.getElementById("codeModal");

// BOTONES
const cancelPayment = document.getElementById("cancelPayment");
const confirmPayment = document.getElementById("confirmPayment");
const yesCancel = document.getElementById("yesCancel");
const noCancel = document.getElementById("noCancel");

const yesCard = document.getElementById("yesCard");
const noCard = document.getElementById("noCard");

const cardNumberInput = document.getElementById("cardNumber");
const cvvInput = document.getElementById("cvv");
const showCard = document.getElementById("showCard");
const showCVV = document.getElementById("showCVV");

// Mostrar productos en pantalla
function renderCarrito() {
    cartItems.innerHTML = "";

    let subtotal = 0;
    let descuento = 0;

    carrito.forEach(item => {
        let totalProducto = item.precio * item.cantidad;
        let descuentoProducto = item.descuento ? (totalProducto * (item.descuento/100)) : 0;

        subtotal += totalProducto;
        descuento += descuentoProducto;

        cartItems.innerHTML += `
            <div class="cart-item">
                <img src="${item.imagen}" class="mini-img">
                <p>${item.nombre}</p>
                <p>Cant: ${item.cantidad}</p>
                <p>$${(totalProducto - descuentoProducto).toFixed(2)}</p>
            </div>
        `;
    });

    let total = subtotal - descuento;

    subtotalEl.textContent = subtotal.toFixed(2);
    discountEl.textContent = descuento.toFixed(2);
    totalEl.textContent = total.toFixed(2);
}

// Mostrar ventana de pago
payBtn.addEventListener("click", () => {
    paymentModal.classList.remove("hidden");
});

// Cancelar compra (abre confirmación)
cancelPayment.addEventListener("click", () => {
    paymentModal.classList.add("hidden");
    cancelModal.classList.remove("hidden");
});

// SI cancela
yesCancel.addEventListener("click", () => {
    cancelModal.classList.add("hidden");
    alert("Compra cancelada.");
    location.href = "../../index.html";
});

// NO cancela
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
    showCard.textContent = tarjeta;
    showCVV.textContent = cvv;
});

// Si los datos son correctos → generar código
yesCard.addEventListener("click", () => {
    confirmCardModal.classList.add("hidden");
    codeModal.classList.remove("hidden");

    let codigo = "PED-" + Math.floor(Math.random() * 900000 + 100000);
    document.getElementById("codigoGenerado").textContent = codigo;
});

// Si NO son correctos → regresar
noCard.addEventListener("click", () => {
    confirmCardModal.classList.add("hidden");
    paymentModal.classList.remove("hidden");
});

// Render inicial
renderCarrito();


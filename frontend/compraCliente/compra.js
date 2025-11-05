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

// Abrir modal de pago
document.getElementById("payBtn").addEventListener("click", () => {
  document.getElementById("paymentModal").style.display = "flex";
});

// Confirmar pago y generar código
document.getElementById("confirmPayment").addEventListener("click", () => {
  const tarjeta = document.getElementById("cardNumber").value.trim();
  if (tarjeta.length < 8) {
    alert("Ingrese un número de tarjeta válido");
    return;
  }

  const codigo = "ENT-" + Math.floor(Math.random() * 999999);

  document.getElementById("codigoGenerado").innerText = codigo;
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("codeModal").style.display = "flex";

  console.log("Código enviado al repartidor:", codigo);
});

// Abrir modal de cancelar compra
document.getElementById("cancelPayment").addEventListener("click", () => {
  document.getElementById("cancelModal").style.display = "flex";
});

// Si confirma cancelar
document.getElementById("yesCancel").addEventListener("click", () => {
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("cancelModal").style.display = "none";
  alert("La compra ha sido cancelada.");
});

// Si NO cancela
document.getElementById("noCancel").addEventListener("click", () => {
  document.getElementById("cancelModal").style.display = "none";
});

// Cerrar todo
function closeAll() {
  document.getElementById("codeModal").style.display = "none";
}

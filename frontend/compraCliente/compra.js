// dylxnwrld/tiendaonlinepdv/TiendaOnlinePDV-6fd25318790eabba740e5931df289c127ba0141b/frontend/compraCliente/compra.js

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

  // ⭐️ INICIO DE CÓDIGO AÑADIDO ⭐️
  const finalRedirectBtn = document.getElementById("finalRedirectBtn");
  if (finalRedirectBtn) {
    // La ruta relativa a 'frontend/cliente/seguimiento.html' desde 'frontend/compraCliente/' es '../cliente/seguimiento.html'
    finalRedirectBtn.onclick = function() {
        // Redirige al seguimiento, pasando el código generado como ID de pedido en el parámetro 'id'
        window.location.href = `../cliente/seguimiento.html?id=${codigo}`; 
    };
  }
  // ⭐️ FIN DE CÓDIGO AÑADIDO ⭐️

  console.log("Código enviado al repartidor:", codigo);
});

// ✅ Abrir modal de confirmar cancelación
document.getElementById("cancelPayment").addEventListener("click", () => {
  document.getElementById("cancelModal").style.display = "flex";
});

// ✅ Si confirma cancelar
document.getElementById("yesCancel").addEventListener("click", () => {
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("cancelModal").style.display = "none";
  alert("✅ La compra ha sido cancelada.");
});

// ✅ Si NO cancela
document.getElementById("noCancel").addEventListener("click", () => {
  document.getElementById("cancelModal").style.display = "none";
});
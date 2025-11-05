// ==========================================
// 🔹 MANEJO DE ESTADO (Logueado / No Logueado)
// ==========================================

const loginBtn = document.getElementById("loginBtn");
const cartBtn = document.getElementById("cartBtn");
const menuToggle = document.getElementById("menuToggle");

if (token && role) {
  // --- Usuario LOGUEADO ---

  if (loginBtn) {
    loginBtn.textContent = "Mi Cuenta"; // ⭐️ Cambia el texto del botón

    loginBtn.addEventListener("click", () => {
      // Redirige a la página de perfil/panel correcta según el rol
      switch (role) {
        case 'Admin':
          window.location.href = 'frontend/admin/admin.html';
          break;
        case 'Cajero':
          window.location.href = 'frontend/cajero/apertura_caja.html';
          break;
        case 'AdminInventario':
          window.location.href = 'frontend/admin_inv/admininv.html';
          break;
        case 'Repartidor':
          window.location.href = 'frontend/repartidor/repartidor.html';
          break;
        case 'Cliente':
        default:
          // ⭐️ Redirige a la página de perfil del cliente
          window.location.href = "frontend/cliente/cliente.html";
          break;
      }
    });
  }

  // El botón de comprar funciona normalmente (va al carrito)
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "frontend/compraCliente/compra.html";
    });
  }

} else {
  // --- Usuario NO LOGUEADO ---

  // El botón de login funciona normalmente (va a login)
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "frontend/login/login.html";
    });
  }

  // ⭐️ El botón de comprar AHORA redirige a login
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      // Opcional: alertar al usuario
      // alert("Debes iniciar sesión para poder comprar.");
      window.location.href = "frontend/login/login.html";
    });
  }
}

// Menú hamburguesa (lógica movida aquí, es igual para ambos)
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    alert("Aquí podría abrir un menú lateral 🧭");
  });
}

// ==========================================
// 🔸 NUEVO CARRUSEL
// ==========================================

//flechas y el contenedor del carrusel
const carouselContainer = document.getElementById("carousel");
const prevArrow = document.getElementById("prev");
const nextArrow = document.getElementById("next");

if (carouselContainer && prevArrow && nextArrow) {
  const scrollAmount = 250; // distancia que se moverá cada vez

  prevArrow.addEventListener("click", () => {
    carouselContainer.scrollBy({
      left: -scrollAmount,
      behavior: "smooth",
    });
  });

  nextArrow.addEventListener("click", () => {
    carouselContainer.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  });
}

// ==========================================
// (animación continua)
// ==========================================
setInterval(() => {
  if (carouselContainer) {
    carouselContainer.scrollBy({ left: 250, behavior: "smooth" });
  }
}, 4000);

// ✅ Permite que las product-card abran su enlace normalmente
document.querySelectorAll(".product-card a").forEach(card => {
  card.addEventListener("click", (e) => {
    e.stopPropagation(); // evita que otro evento bloquee el click
  });
});

// ===========================================
// Conexion a la base de datos
// ==========================================
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

// =========================
// Funcionalidad de Bsuqueda
// =========================

const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");

function filtrarProductos() {
  const texto = searchInput.value.toLowerCase().trim();
  const productos = document.querySelectorAll(".product-card");

  productos.forEach(card => {
    const contenido = card.innerText.toLowerCase();
    card.style.display = contenido.includes(texto) ? "flex" : "none";
  });
}

// Filtrar mientras escribe
if (searchInput) {
  searchInput.addEventListener("input", filtrarProductos);
}

// Filtrar al presionar el botón
if (searchBtn) {
  searchBtn.addEventListener("click", filtrarProductos);
}
// ==========================================
// 🔹 BOTONES PRINCIPALES
// ==========================================
const loginBtn = document.getElementById("loginBtn");
const cartBtn = document.getElementById("cartBtn");
const menuToggle = document.getElementById("menuToggle");

// Redirigir al login
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "frontend/login/login.html";
  });
}

// Redirigir al carrito
if (cartBtn) {
  cartBtn.addEventListener("click", () => {
    window.location.href = "frontend/compraCliente/compra.html";
  });
}

// Menú hamburguesa
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

// Movimiento de carrusel

document.querySelectorAll(".arrow").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    const carousel = document.getElementById(target);

    // Mover 250px por clic (puedes ajustar)
    const scrollAmount = 250;

    if (btn.classList.contains("right")) {
      carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
    } else {
      carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  });
});

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
    window.location.href = "frontend/carrito/carrito.html";
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


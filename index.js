// Obtener los botones
const loginBtn = document.getElementById('loginBtn');
const cartBtn = document.getElementById('cartBtn');
const menuToggle = document.getElementById('menuToggle');
//Carrusel
const carousel = document.querySelector('.carousel');
const items = document.querySelectorAll('.carousel-item');
const prevBtn = document.querySelector('.prev');
const nextBtn = document.querySelector('.next');
// Redirigir al login
loginBtn.addEventListener('click', () => {
  window.location.href = 'frontend/login/login.html';
});

// Redirigir al carrito
//cartBtn.addEventListener('click', () => {
//  window.location.href = 'frontend/carrito/carrito.html';
//});

// Menú hamburguesa (ejemplo funcional futuro)
menuToggle.addEventListener('click', () => {
  alert('Aquí podría abrir un menú lateral 🧭');
});

// Funcionalidad del carrusel
let index = 0;

function showSlide(i) {
  if (i < 0) index = items.length - 1;
  else if (i >= items.length) index = 0;
  else index = i;

  carousel.style.transform = `translateX(${-index * 100}%)`;
}

prevBtn.addEventListener('click', () => showSlide(index - 1));
nextBtn.addEventListener('click', () => showSlide(index + 1));

// Auto-slide cada 4 segundos
setInterval(() => showSlide(index + 1), 4000);
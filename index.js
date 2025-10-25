// Obtener los botones
const loginBtn = document.getElementById('loginBtn');
const cartBtn = document.getElementById('cartBtn');
const menuToggle = document.getElementById('menuToggle');

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


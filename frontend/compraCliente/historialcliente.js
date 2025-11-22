// ==========================================
// CONFIGURACIÓN
// ==========================================
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// 2. Configuración del Cliente de Supabase
const SUPABASE_URL = 'https://TU_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

let supabase;
try {
  supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error("Error inicializando Supabase:", e);
}

// ==========================================
// INICIALIZACIÓN (DOM)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    setupHeaderAndMenu();

    // 2. Carga el historial de compras (la nueva función)
    loadPurchaseHistory();
});

// ==========================================
// LÓGICA DEL HISTORIAL
// ==========================================

async function loadPurchaseHistory() {
  const container = document.getElementById('history-container');
  const loadingMessage = document.getElementById('loading-message');

  const token = sessionStorage.getItem('supabase-token');

  // Guardia de autenticación: si no hay token, no hay historial.
  if (!token) {
    loadingMessage.innerHTML = '<p style="color: red;">Debes iniciar sesión para ver tu historial.</p>';
    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      window.location.href = '../../frontend/login/login.html';
    }, 2000);
    return;
  }

  try {
    // 1. Llamar al NUEVO ENDPOINT DEL BACKEND
    // (Asumimos que tu backend creará este endpoint)
    const response = await fetch(`${API_BASE_URL}/api/cliente/historial`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Enviar el token para autenticación
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    // El backend debe devolver el objeto con el cliente y sus ventas
    const data = await response.json();

    // 2. Procesar y pintar los datos
    if (!data.ventasonline || data.ventasonline.length === 0) {
      loadingMessage.innerHTML = '<p>Aún no tienes ninguna compra registrada.</p>';
      return;
    }

    // Ocultar el mensaje de "cargando"
    loadingMessage.style.display = 'none';

    // 3. Crear una tarjeta por cada venta
    data.ventasonline.forEach(venta => {
      const orderCard = createOrderCard(venta);
      container.appendChild(orderCard);
    });

  } catch (error) {
    console.error('Error al cargar historial:', error);
    loadingMessage.innerHTML = `<p style="color: red;">Error al cargar tu historial: ${error.message}</p>`;
  }
}

/**
 * Crea el elemento HTML para una sola tarjeta de pedido.
 * @param {object} venta - El objeto de la venta con sus detalles.
 */
function createOrderCard(venta) {
  const card = document.createElement('div');
  card.className = 'order-card';

  // Formatear la fecha
  const fecha = new Date(venta.fecha_hora).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Crear el HTML interno
  card.innerHTML = `
    <div class="order-header">
      <span class="order-id">Pedido: #${venta.codigo_pedido || 'N/A'}</span>
      <span class="order-date">Fecha: ${fecha}</span>
      <span class="order-total">Total: $${parseFloat(venta.total_final).toFixed(2)}</span>
      <span class="order-toggle-icon">+</span>
    </div>
    <div class="order-details">
      <h4>Detalles del Pedido (ID: ${venta.id_ventaonline})</h4>
      <ul class="product-list">
        ${/* Iterar sobre los detalles de la venta */
          venta.detalle_ventaonline.map(item => `
            <li class="product-item">
              <span>(${item.cantidad}x) ${item.nombre_producto}</span>
              <span>$${(item.cantidad * item.precio_unitario_venta).toFixed(2)}</span>
            </li>
          `).join('')
        }
      </ul>
    </div>
  `;

  // Lógica del Acordeón (hacer clic para expandir/colapsar)
  const header = card.querySelector('.order-header');
  const details = card.querySelector('.order-details');
  const icon = card.querySelector('.order-toggle-icon');

  header.addEventListener('click', () => {
    if (card.classList.contains('active')) {
      card.classList.remove('active');
      details.style.display = 'none';
      icon.textContent = '+';
    } else {
      card.classList.add('active');
      details.style.display = 'block';
      icon.textContent = '−';
    }
  });

  return card;
}


// ==========================================
// LÓGICA DEL HEADER
// ==========================================

function setupHeaderAndMenu() {
  const loginBtn = document.getElementById("loginBtn");
  const cartBtn = document.getElementById("cartBtn");
  const menuToggle = document.getElementById("menuToggle");
  const sideMenu = document.getElementById("clientSideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const clientMenuLinks = document.getElementById("clientMenuLinks");
  const searchInput = document.getElementById("search");
  const searchBtn = document.getElementById("searchBtn");

  // --- Lógica de Sesión ---
  const token = sessionStorage.getItem('supabase-token');
  const role = sessionStorage.getItem('user-role');

  if (token && role) {
    // --- Usuario LOGUEADO ---
    if (loginBtn) {
      loginBtn.textContent = "Mi Cuenta";
    }
    if (cartBtn) {
      cartBtn.addEventListener("click", () => {
        // Redirigir al carrito
        window.location.href = "compra.html"; // Asumiendo que está en la misma carpeta
      });
    }

    // Lógica del Menú Hamburguesa (Solo Cliente)
    if (menuToggle) {
      if (role === 'Cliente') {
        menuToggle.style.display = 'block';

        const toggleMenu = () => {
          const isMenuOpen = sideMenu.style.left === '0px';
          sideMenu.style.left = isMenuOpen ? '-250px' : '0px';
          menuOverlay.style.display = isMenuOpen ? 'none' : 'block';
        };

        menuToggle.addEventListener("click", toggleMenu);
        menuOverlay.addEventListener("click", toggleMenu);

        // Lógica de los enlaces del menú
        clientMenuLinks.addEventListener('click', (e) => {
          const action = e.target.getAttribute('data-action');
          if (action) {
            handleClientMenuAction(action);
          }
        });
      } else {
        // Ocultar menú para roles no-cliente
        menuToggle.style.display = 'none';
        if (sideMenu) sideMenu.style.display = 'none';
      }
    }

  } else {
    // --- Usuario NO LOGUEADO ---
    // Redirigir al login si llega aquí sin sesión
    window.location.href = "../../frontend/login/login.html";
  }

  // Deshabilitamos la búsqueda en esta página
  if(searchInput) searchInput.disabled = true;
  if(searchBtn) searchBtn.disabled = true;
}

// Función para manejar las acciones del menú
function handleClientMenuAction(action) {
  // Cerramos el menú
  document.getElementById('clientSideMenu').style.left = '-250px';
  document.getElementById('menuOverlay').style.display = 'none';

  switch (action) {
    case 'rastreo':
      // Asumiendo que tienes una página 'buscador.html' en la carpeta 'cliente'
      window.location.href = "../cliente/buscador.html";
      break;
    case 'favoritos':
      window.location.href = "../cliente/favoritos.html";
      break;
    case 'historial':
      // Ya estamos en esta página, no hacemos nada
      console.log("Ya estás en el historial.");
      break;
    case 'logout':
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        sessionStorage.clear();
        window.location.href = "../../frontend/login/login.html";
      }
      break;
    default:
      console.error("Acción de menú desconocida:", action);
  }
}
// ==========================================
// 🔹 CONFIGURACIÓN
// ==========================================
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// Helper para seleccionar elementos por ID
const $ = (id) => document.getElementById(id);

// ==========================================
// 🔸 INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Configurar Menú y Header (Igual que en Product Detail)
    setupHeader();

    // 2. Cargar los productos favoritos
    loadFavoriteProducts();
});

// ==========================================
// 🔹 LÓGICA DEL MENÚ Y HEADER (Adaptada)
// ==========================================
function setupHeader() {
    const loginBtn = $("loginBtn");
    const menuToggle = $("menuToggle");
    const sideMenu = $("clientSideMenu");
    const menuOverlay = $("menuOverlay");
    const clientMenuLinks = $("clientMenuLinks");
    const cartBtn = $("cartBtn");

    const token = sessionStorage.getItem('supabase-token');

    // Configuración del botón carrito
    if (cartBtn) {
        cartBtn.addEventListener("click", () => {
             // Ajustamos la ruta para ir a compra desde la carpeta cliente
            window.location.href = "../compraCliente/compra.html"; 
        });
    }

    if (token) {
        // --- Usuario LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Mi Cuenta";
            loginBtn.addEventListener("click", () => {
                // Ya estamos en la carpeta cliente, así que recargamos o vamos al dashboard
                window.location.href = "./cliente.html";
            });
        }

        // --- Menú Hamburguesa ---
        if (menuToggle) {
            menuToggle.style.display = 'block'; // Mostrar hamburguesa

            const toggleMenu = () => {
                if (sideMenu.style.left === '0px') {
                    sideMenu.style.left = '-250px';
                    menuOverlay.style.display = 'none';
                } else {
                    sideMenu.style.left = '0px';
                    menuOverlay.style.display = 'block';
                }
            };

            menuToggle.addEventListener("click", toggleMenu);
            menuOverlay.addEventListener("click", toggleMenu);

            // Manejo de clics en los enlaces del menú
            if (clientMenuLinks) {
                clientMenuLinks.addEventListener('click', (e) => {
                    const action = e.target.getAttribute('data-action');
                    if (action) {
                        sideMenu.style.left = '-250px';
                        menuOverlay.style.display = 'none';
                        handleClientMenuAction(action);
                    }
                });
            }
        }
    } else {
        // --- Usuario NO LOGUEADO ---
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                window.location.href = "../login/login.html";
            });
        }
        if (menuToggle) menuToggle.style.display = 'none';
    }
}

// 🔹 Rutas corregidas para estar dentro de frontend/cliente/
function handleClientMenuAction(action) {
    switch (action) {
        case 'rastreo':
            // Ya estamos en cliente, ruta directa
            window.location.href = "./buscador.html"; 
            break;
        case 'favoritos':
            // Ya estamos en favoritos
            window.location.href = "./favoritos.html"; 
            break;
        case 'historial':
            // Subimos y bajamos a compraCliente
            window.location.href = "../compraCliente/historialcliente.html"; 
            break;
        case 'logout':
            if (confirm("¿Seguro que deseas cerrar sesión?")) {
                sessionStorage.clear();
                window.location.href = "../login/login.html";
            }
            break;
        default:
            console.error("Acción desconocida:", action);
    }
}

// =======================
// 🔹 LÓGICA DE FAVORITOS 
// =======================
async function loadFavoriteProducts() {
    const grid = $('favorites-grid');
    const token = sessionStorage.getItem('supabase-token');

    if (!token) {
        grid.innerHTML = '<p style="text-align: center;">Debes <a href="../login/login.html">iniciar sesión</a> para ver tus favoritos.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('No se pudieron cargar los favoritos.');

        const productos = await response.json();
        grid.innerHTML = ''; 

        if (productos.length === 0) {
            grid.innerHTML = '<p style="text-align: center;">Aún no tienes productos favoritos.</p>';
            return;
        }

        productos.forEach(producto => {
            const imageUrl = producto.images && producto.images[0]
                ? producto.images[0]
                : '../images/conXbox.jpg'; // Placeholder

            // Ajustamos la ruta del enlace al detalle del producto
            const productHTML = `
                <a href="../productos/product_detail.html?id=${producto._id}" class="product-link">
                    <div class="product-card">
                        <img src="${imageUrl}" alt="${producto.name}" />
                        <p>${producto.name}</p>
                        <p class="precio">$${producto.price.toFixed(2)}</p>
                    </div>
                </a>
            `;
            grid.innerHTML += productHTML;
        });

    } catch (error) {
        console.error(error);
        grid.innerHTML = `<p style="text-align: center; color: red;">Error: ${error.message}</p>`;
    }
}
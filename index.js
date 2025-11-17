// ==========================================
// 🔹 CONFIGURACIÓN
// ==========================================

// Apunta a tu servidor de Render (el mismo que usan tus otros JS)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

// ==========================================
// 🔸 INICIALIZACIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // ⭐️ NUEVO: Carga los productos desde la API
    cargarProductosDinamicos();

    // Código de tu compañero (Manejo de estado y botones)
    setupHeaderAndMenu();

    // Código de tu compañero (Flechas del carrusel)
    setupCarouselArrows();
});

// ==========================================
// 🔹 LÓGICA DE CARGA DE PRODUCTOS (NUEVO)
// ==========================================

/**
 * Esta función llama al backend, obtiene los productos de Mongo
 * y los dibuja en el HTML.
 */
async function cargarProductosDinamicos(searchQuery = "") {
    const carousel1 = document.getElementById('carousel1');
    const carousel2 = document.getElementById('carousel2');
    const productGrid = document.getElementById('product-grid');

    if (!carousel1 || !carousel2 || !productGrid) {
        console.error("No se encontraron los contenedores de productos.");
        return;
    }

    // Mostrar un "cargando..."
    carousel1.innerHTML = '<p style="color: #333; padding: 20px;">Cargando productos...</p>';
    carousel2.innerHTML = '';
    productGrid.innerHTML = '';

    try {
        // 1. Llama a tu backend para "jalar" los datos de MongoDB
        const response = await fetch(`${API_BASE_URL}/api/products?search=${searchQuery}`);

        if (!response.ok) {
            throw new Error(`No se pudieron cargar los productos (Error ${response.status})`);
        }

        const { items: productos } = await response.json();

        // 2. Limpiamos los contenedores
        carousel1.innerHTML = '';
        carousel2.innerHTML = '';
        productGrid.innerHTML = '';

        if (productos.length === 0) {
            carousel1.innerHTML = '<p style="color: #333; padding: 20px;">No se encontraron productos.</p>';
            return;
        }

        // 3. Creamos la "plantilla" HTML dinámicamente
        productos.forEach((producto, index) => {

            // Usamos una imagen de placeholder si no existe una
            const imageUrl = producto.images && producto.images[0]
                ? producto.images[0]
                : 'frontend/images/conXbox.jpg'; // Placeholder

            // Esta es la plantilla.
            const productHTML = `
                <!-- ⭐️ CADA TARJETA ES UN ENLACE A LA PÁGINA DE DETALLE ⭐️ -->
                <a href="frontend/productos/product_detail.html?id=${producto._id}" class="product-link">
                    <div class="product-card">
                        <img src="${imageUrl}" alt="${producto.name}" />
                        <p>${producto.name}</p>
                        <p class="precio">$${producto.price.toFixed(2)}</p>
                    </div>
                </a>
            `;

            // Dividimos los productos entre los diferentes contenedores
            if (index < 5) {
                carousel1.innerHTML += productHTML;
            } else if (index < 10) {
                carousel2.innerHTML += productHTML;
            } else {
                productGrid.innerHTML += productHTML;
            }
        });

    } catch (error) {
        console.error(error);
        carousel1.innerHTML = `<p style="color: #333; padding: 20px;">Error al cargar productos: ${error.message}</p>`;
    }
}

// ==========================================
// 🔹 FUNCIONES DE BOTONES (CÓDIGO DE TU COMPAÑERO MEJORADO)
// ==========================================

function setupHeaderAndMenu() {
    const loginBtn = document.getElementById("loginBtn");
    const cartBtn = document.getElementById("cartBtn");
    const menuToggle = document.getElementById("menuToggle");
    const searchInput = document.getElementById("search");
    const searchBtn = document.getElementById("searchBtn");

    // ⭐️ NUEVOS ELEMENTOS DEL MENÚ LATERAL ⭐️
    const sideMenu = document.getElementById("clientSideMenu");
    const menuOverlay = document.getElementById("menuOverlay");
    const clientMenuLinks = document.getElementById("clientMenuLinks");


    // --- Lógica de Sesión (de tu compañero) ---
    const token = sessionStorage.getItem('supabase-token');
    const role = sessionStorage.getItem('user-role');

    if (token && role) {
        // --- Usuario LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Mi Cuenta";
            loginBtn.addEventListener("click", () => {
                // Redirección basada en el rol
                if (role === 'Cliente') {
                    // Se asume la existencia de la página cliente.html
                    window.location.href = "frontend/cliente/cliente.html";
                } else if (role === 'Admin') {
                    window.location.href = "frontend/admin/admin.html";
                } else if (role === 'Cajero') {
                    window.location.href = "frontend/cajero/apertura_caja.html";
                } else if (role === 'AdminInventario') {
                    window.location.href = "frontend/admin_inv/admininv.html";
                } else if (role === 'Repartidor') {
                    window.location.href = "frontend/repartidor/repartidor.html";
                } else {
                    window.location.href = "frontend/cliente/cliente.html";
                }
            });
        }
        if (cartBtn) {
            cartBtn.addEventListener("click", () => {
                window.location.href = "frontend/compraCliente/compra.html";
            });
        }

        // ⭐️ Lógica del Menú Hamburguesa (Solo visible y funcional para Cliente) ⭐️
        if (menuToggle) {
            if (role === 'Cliente') {
                menuToggle.style.display = 'block'; // Asegurar que esté visible

                // Función para abrir/cerrar menú
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

                // Clic en el overlay para cerrar el menú
                menuOverlay.addEventListener("click", toggleMenu);

                // Lógica de los nuevos enlaces del menú
                clientMenuLinks.addEventListener('click', (e) => {
                    const action = e.target.getAttribute('data-action');
                    if (action) {
                        // Cerrar el menú antes de ejecutar la acción
                        sideMenu.style.left = '-250px';
                        menuOverlay.style.display = 'none';
                        handleClientMenuAction(action);
                    }
                });
            } else {
                // Ocultar el menú hamburguesa para roles no-cliente
                menuToggle.style.display = 'none';
                if (sideMenu) sideMenu.style.display = 'none';
            }
        }
    } else {
        // --- Usuario NO LOGUEADO ---
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                window.location.href = "frontend/login/login.html";
            });
        }
        if (cartBtn) {
            cartBtn.addEventListener("click", () => {
                // Redirigir al login si intenta comprar sin sesión
                window.location.href = "frontend/login/login.html";
            });
        }
        if (menuToggle) {
            menuToggle.style.display = 'none';
        }
    }

    // --- ⭐️ Lógica de Búsqueda (MODIFICADA) ⭐️ ---
    // Ahora la búsqueda llama a la API
    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
            cargarProductosDinamicos(searchInput.value);
        });
    }
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') {
                cargarProductosDinamicos(searchInput.value);
            }
        });
    }
}

// ⭐️ FUNCIÓN: Manejar las acciones del menú del cliente (Nueva) ⭐️
function handleClientMenuAction(action) {
    switch (action) {
        case 'rastreo':
            // Redirige al buscador de pedidos
            window.location.href = "frontend/cliente/buscador.html";
            break;
        case 'favoritos':
            alert("Favoritos: Función no implementada aún.");
            // Aquí iría la lógica de redirección a la página de favoritos
            break;
        case 'historial':
            // Redirigir a la nueva página de historial
            window.location.href = "frontend/compraCliente/historialcliente.html";
            break;
        case 'logout':
            if (confirm("¿Seguro que deseas cerrar sesión?")) {
                sessionStorage.clear(); // Limpiar todos los datos de sesión
                // Asegurarse de que el botón de login en el header se vea como "Iniciar sesión"
                window.location.href = "frontend/login/login.html";
            }
            break;
        default:
            console.error("Acción de menú desconocida:", action);
    }
}
// ==========================================
// 🔹 FUNCIONES DEL CARRUSEL (CÓDIGO DE TU COMPAÑERO)
// ==========================================

function setupCarouselArrows() {
    const arrows = document.querySelectorAll(".arrow");

    arrows.forEach(arrow => {
        arrow.addEventListener("click", () => {
            const targetId = arrow.dataset.target;
            const carouselContainer = document.getElementById(targetId);
            if (!carouselContainer) return;
            const scrollAmount = 300;

            if (arrow.classList.contains("left")) {
                carouselContainer.scrollBy({ left: -scrollAmount, behavior: "smooth" });
            } else {
                carouselContainer.scrollBy({ left: scrollAmount, behavior: "smooth" });
            }
        });
    });

    // Animación continua (de tu compañero)
    setInterval(() => {
        const carousel1 = document.getElementById('carousel1');
        if (carousel1) {
            if (carousel1.scrollLeft + carousel1.clientWidth >= carousel1.scrollWidth) {
                carousel1.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                carousel1.scrollBy({ left: 300, behavior: 'smooth' });
            }
        }
    }, 5000);

    // Click en tarjetas (de tu compañero)
    document.querySelectorAll(".product-card a").forEach(card => {
        card.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    });
}
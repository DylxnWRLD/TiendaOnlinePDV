// dylxnwrld/tiendaonlinepdv/TiendaOnlinePDV-6fd25318790eabba740e5931df289c127ba0141b/index.js (UNIFICADO)

// ==========================================
// 🔹 CONFIGURACIÓN
// ==========================================

// Apunta a tu servidor de Render (el mismo que usan tus otros JS)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com'; // Corregida la URL base para consistencia

// ==========================================
// 🔸 INICIALIZACIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // ⭐️ Llama a la función unificada de setup ⭐️
    setupHeaderAndMenu();

    // Carga los productos desde la API
    cargarProductosDinamicos();

    // Flechas del carrusel
    setupCarouselArrows();
});

// ==========================================
// 🔹 LÓGICA DE CARGA DE PRODUCTOS
// ==========================================

/**
 * Esta función llama al backend, obtiene los productos de Mongo
 * y los dibuja en el HTML.
 */
async function cargarProductosDinamicos(searchQuery = "") {
    const carousel1 = document.getElementById('carousel1');
    const carousel2 = document.getElementById('carousel2');
    // ASUMIDO: Añadir product-grid al index.html si es necesario
    const productGrid = document.getElementById('product-grid');

    if (!carousel1 || !carousel2) { // productGrid puede ser opcional
        console.error("No se encontraron los contenedores de carrusel.");
        return;
    }

    // Mostrar un "cargando..."
    carousel1.innerHTML = '<p style="color: #333; padding: 20px;">Cargando productos...</p>';
    carousel2.innerHTML = '';
    if (productGrid) productGrid.innerHTML = '';

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
        if (productGrid) productGrid.innerHTML = '';

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

            // Esta es la plantilla. Usamos product_detail.html
            const productHTML = `
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
            } else if (productGrid) {
                productGrid.innerHTML += productHTML;
            }
        });

    } catch (error) {
        console.error(error);
        carousel1.innerHTML = `<p style="color: #333; padding: 20px;">Error al cargar productos: ${error.message}</p>`;
    }
}

// ==========================================
// 🔹 FUNCIONES DE BOTONES Y MENÚ (UNIFICADO)
// ==========================================

function setupHeaderAndMenu() {
    const loginBtn = document.getElementById("loginBtn");
    const cartBtn = document.getElementById("cartBtn");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarMenu = document.getElementById("sidebarMenu");
    const closeMenu = document.getElementById("closeMenu");
    const searchInput = document.getElementById("search");
    const searchBtn = document.getElementById("searchBtn");

    // --- Elementos del Menú Lateral ---
    const menuCerrarSesion = document.getElementById("menuCerrarSesion");
    const userSpecificItems = document.querySelectorAll('.menu-item.user-specific');

    // NUEVO: Ítems a ocultar (Requiere que añadas la clase 'category-to-remove' en tu HTML)
    const itemsToRemove = document.querySelectorAll('.category-to-remove');

    // --- Lógica de Sesión (usando localStorage para consistencia) ---
    const token = localStorage.getItem('supabase-token');
    const role = localStorage.getItem('user-role');
    const isLoggedIn = !!token;

    // ===============================================
    // ⭐️ CAMBIO 1: Ocultar el botón de menú hamburguesa si no está logeado ⭐️
    if (menuToggle) {
        if (!isLoggedIn) {
            menuToggle.style.display = 'none';
        } else {
            // Asegura que sea visible si está logeado
            menuToggle.style.display = 'block'; // O el valor que corresponda a su visualización
        }
    }

    // ===============================================
    // ⭐️ CAMBIO 2: Ocultar los ítems "Videojuegos" y "Consolas" ⭐️
    itemsToRemove.forEach(item => {
        item.style.display = 'none';
    });
    // ===============================================


    // 1. LÓGICA DE VISIBILIDAD DE ENLACES EN SIDEBAR (Mi Cuenta, Favoritos, Historial, Cerrar Sesión)
    userSpecificItems.forEach(item => {
        if (isLoggedIn) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });


    // 2. LÓGICA DE BOTONES DEL HEADER
    if (isLoggedIn) {
        // --- Usuario LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Mi Cuenta";
            loginBtn.addEventListener("click", () => {
                window.location.href = "frontend/cliente/cliente.html";
            });
        }
        if (cartBtn) {
            cartBtn.addEventListener("click", () => {
                window.location.href = "frontend/compraCliente/compra.html";
            });
        }
    } else {
        // --- Usuario NO LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Iniciar sesión";
            loginBtn.addEventListener("click", () => {
                window.location.href = "frontend/login/login.html";
            });
        }
        if (cartBtn) {
            // Redirige a login si intenta comprar sin sesión
            cartBtn.addEventListener("click", () => {
                window.location.href = "frontend/login/login.html";
            });
        }
    }


    // 3. LÓGICA DEL SIDEBAR (TOGGLE Y CERRAR SESIÓN)
    if (menuToggle && sidebarMenu && closeMenu) {

        // TOGGLE: Al presionar hamburguesa, abre o cierra 
        menuToggle.addEventListener("click", () => {
            // Solo abrimos/cerramos si el menú es visible (i.e., el usuario está logeado)
            if (menuToggle.style.display !== 'none') {
                sidebarMenu.classList.toggle("open");
            }
        });

        // Cierre con la 'X'
        closeMenu.addEventListener("click", () => {
            sidebarMenu.classList.remove("open");
        });

        // Lógica de Cerrar Sesión
        if (menuCerrarSesion) {
            menuCerrarSesion.addEventListener("click", (e) => {
                e.preventDefault();

                if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                    localStorage.removeItem('supabase-token');
                    localStorage.removeItem('user-role');
                    localStorage.removeItem('currentCorteId');
                    // Redirigir a la página principal
                    window.location.href = 'index.html';
                }
            });
        }
    } else if (menuToggle) {
        // En caso de que no se encuentre el sidebar, mantener el alert original como fallback
        menuToggle.addEventListener("click", () => {
            alert("Aquí podría abrir un menú lateral 🧭");
        });
    }

    // --- Lógica de Búsqueda (MODIFICADA) ---
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

// ==========================================
// 🔹 FUNCIONES DEL CARRUSEL
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
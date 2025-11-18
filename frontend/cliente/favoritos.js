// Define la URL base de tu API (como en index.js)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

document.addEventListener("DOMContentLoaded", () => {
    // La función setupHeaderAndMenu() de index.js (que ya se cargó)
    // debería manejar el header.

    // Cargamos los productos favoritos
    loadFavoriteProducts();
});

async function loadFavoriteProducts() {
    const grid = document.getElementById('favorites-grid');
    const token = sessionStorage.getItem('supabase-token');

    // Seguridad: Si no hay token, no hay favoritos
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

        if (!response.ok) {
            throw new Error('No se pudieron cargar los favoritos.');
        }

        const productos = await response.json();

        // Limpiar "Cargando..."
        grid.innerHTML = ''; 

        if (productos.length === 0) {
            grid.innerHTML = '<p style="text-align: center;">Aún no tienes productos favoritos. ¡Añade algunos desde la tienda!</p>';
            return;
        }

        // Reusamos la lógica de renderizado de index.js
        productos.forEach(producto => {
            const imageUrl = producto.images && producto.images[0]
                ? producto.images[0]
                : '../images/conXbox.jpg'; // Ajusta la ruta del placeholder si es necesario

            // Usamos la misma plantilla HTML de index.js
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
        grid.innerHTML = `<p style="text-align: center; color: red;">Error al cargar favoritos: ${error.message}</p>`;
    }
}
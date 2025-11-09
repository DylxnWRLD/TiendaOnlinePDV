// #################################################
// 🔹 CONFIGURACIÓN Y UTILIDADES
// #################################################
const $ = (id) => document.getElementById(id);
const RENDER_SERVER_URL = 'https://tiendaonlinepdv-hm20.onrender.com';

let currentProduct = null;
let currentStockQty = 0;

// Obtiene el ID del producto de la URL (ej. product_detail.html?id=123)
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// ⭐️ NUEVO: Obtiene el ID del usuario de forma segura ⭐️
function getCurrentUserId() {
    const token = localStorage.getItem('supabase-token');
    if (!token) return null;
    
    try {
        // Decodificamos el token para sacar el ID del usuario (campo 'sub')
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        
        return JSON.parse(jsonPayload).sub;
    } catch (e) {
        console.error("Token inválido:", e);
        return null; // Si el token está corrupto, no hay usuario
    }
}

// Función para mostrar mensajes flotantes (Toasts)
function showToast(message, type = 'info') {
    const toastContainer = $('toastContainer');
    if (!toastContainer) return;

    const colorClass = type === 'ok' ? 'toast-ok' : type === 'err' ? 'toast-err' : 'toast-info';
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${colorClass}`;
    toastElement.textContent = message;

    toastContainer.appendChild(toastElement);
    
    // Pequeña pausa para que la animación CSS funcione
    setTimeout(() => toastElement.classList.add('toast-show'), 10);

    // Quitar el toast después de 3 segundos
    setTimeout(() => {
        toastElement.classList.remove('toast-show');
        toastElement.addEventListener('transitionend', () => toastElement.remove());
    }, 3000);
}

// #################################################
// 🔸 LÓGICA DEL CARRITO (PERSONALIZADO POR USUARIO)
// #################################################

// Genera una clave única para el carrito de ESTE usuario
function getCartKey() {
    const userId = getCurrentUserId();
    if (!userId) return null; // Si no hay usuario, no hay clave
    return `cart_${userId}`;  // Ej: "cart_abc123"
}

function loadCart() {
    const key = getCartKey();
    if (!key) return []; // 🔒 Si no está logueado, el carrito siempre está vacío
    
    const cartJson = localStorage.getItem(key);
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    const key = getCartKey();
    if (key) { // Solo guardamos si hay un usuario logueado
        localStorage.setItem(key, JSON.stringify(cart));
        updateCartUI(cart);
    }
}

// Actualiza el numerito rojo del carrito en el header
function updateCartUI(cart) {
    const countElement = $('cart-count');
    if (countElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countElement.textContent = totalItems;
    }
}

// Agrega el producto actual al carrito
function addToCart(quantityToAdd, silent = false) {
    // 🔒 1. Seguridad: ¿Está logueado?
    if (!getCurrentUserId()) {
        alert("Debes iniciar sesión para comprar.");
        // REDIRECCIÓN AL LOGIN (Ajusta la ruta si es diferente)
        window.location.href = '../login/login.html';
        return false;
    }

    if (!currentProduct || quantityToAdd <= 0) return false;

    const cart = loadCart();
    const existingItem = cart.find(item => item.id === currentProduct._id);
    let newQuantity = quantityToAdd;

    if (existingItem) {
        newQuantity = existingItem.quantity + quantityToAdd;
    }

    // 2. Validar Stock
    if (newQuantity > currentStockQty) {
        showToast(`No hay suficiente stock. Máximo: ${currentStockQty}`, 'err');
        return false;
    }

    // 3. Guardar en el carrito
    if (existingItem) {
        existingItem.quantity = newQuantity;
    } else {
        cart.push({
            id: currentProduct._id,
            nombre: currentProduct.name,
            precio: currentProduct.price,
            // Usa la primera imagen o un placeholder si no tiene
            imagen: currentProduct.images?.[0] || 'https://via.placeholder.com/50',
            quantity: quantityToAdd,
            maxStock: currentStockQty
        });
    }

    saveCart(cart);
    if (!silent) showToast("Producto agregado al carrito", "ok");
    renderCartModal(); // Actualiza el modal visualmente
    return true;
}

// #################################################
// ⚡ VISUALIZACIÓN DEL CARRITO (MODAL)
// #################################################

function renderCartModal() {
    const cart = loadCart();
    const container = $('cartItemsContainer');
    const totalElement = $('cart-total-price');
    const checkoutBtn = $('checkoutBtnModal');

    if (!container || !totalElement || !checkoutBtn) return;

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío.</p>';
        checkoutBtn.disabled = true;
        totalElement.textContent = "$0.00";
    } else {
        checkoutBtn.disabled = false;
        cart.forEach(item => {
            const lineTotal = item.precio * item.quantity;
            total += lineTotal;
            
            // Plantilla HTML para cada item del carrito
            container.innerHTML += `
                <div class="cart-item-row">
                    <img src="${item.imagen}" alt="${item.nombre}">
                    <div class="cart-item-info">
                        <p>${item.nombre}</p>
                        <small>$${item.precio.toFixed(2)} x ${item.quantity}</small>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn-qty minus" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="btn-qty plus" data-id="${item.id}">+</button>
                        <button class="btn-remove" data-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
    updateCartUI(cart);
}

// #################################################
// 🔹 CARGA DEL PRODUCTO DESDE EL SERVIDOR
// #################################################

async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);
        if (!response.ok) throw new Error("Producto no encontrado");
        
        currentProduct = await response.json();
        currentStockQty = currentProduct.stockQty || 0;

        // Rellenar la página con los datos
        $('productTitlePage').textContent = `${currentProduct.name} - LEVEL ONE`;
        $('productName').textContent = currentProduct.name;
        $('productSku').textContent = `SKU: ${currentProduct.sku}`;
        $('productBrand').textContent = `Marca: ${currentProduct.brand || 'Genérico'}`;
        $('productDescription').textContent = currentProduct.description || 'Sin descripción.';
        $('productPrice').textContent = `$${currentProduct.price.toFixed(2)}`;

        // Manejo de stock y botones
        const stockLabel = $('productStock');
        const canBuy = currentProduct.active && currentStockQty > 0;
        
        $('addToCartBtn').disabled = !canBuy;
        $('buyNowBtn').disabled = !canBuy;
        
        if (canBuy) {
            stockLabel.textContent = `En Stock (${currentStockQty} disponibles)`;
            stockLabel.style.color = '#198754'; // Verde
        } else {
            stockLabel.textContent = 'Agotado / No disponible';
            stockLabel.style.color = '#dc3545'; // Rojo
        }

        // Imagen principal
        if (currentProduct.images && currentProduct.images.length > 0) {
            $('productImage').src = currentProduct.images[0];
        }

    } catch (error) {
        console.error(error);
        $('productName').textContent = "Error cargando producto";
        showToast("No se pudo cargar el producto", "err");
    }
}

// #################################################
// 🚀 INICIALIZACIÓN (EVENT LISTENERS)
// #################################################

document.addEventListener('DOMContentLoaded', () => {
    const productId = getProductIdFromUrl();
    if (productId) {
        fetchProductDetails(productId);
    } else {
        // Si no hay ID en la URL, volver al inicio
        window.location.href = '../../index.html';
    }

    // --- Botones de Cantidad ---
    const qtyInput = $('productQuantity');
    $('plusQuantity')?.addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 1;
        if (val < currentStockQty) qtyInput.value = val + 1;
    });
    $('minusQuantity')?.addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
    });

    // --- ACCIÓN: Agregar al Carrito ---
    $('addToCartBtn')?.addEventListener('click', () => {
        addToCart(parseInt(qtyInput.value));
    });

    // --- ACCIÓN: Comprar Ahora ---
    $('buyNowBtn')?.addEventListener('click', () => {
        // Intenta agregar al carrito. Si tiene éxito (true), redirige.
        if (addToCart(parseInt(qtyInput.value), true)) {
            // 🛒 REDIRECCIÓN A LA PÁGINA DE COMPRA
            window.location.href = '../compraCliente/compra.html';
        }
    });

    // --- MODAL DEL CARRITO ---
    const cartModal = $('cartModal');
    
    // Abrir modal
    $('cartBtn')?.addEventListener('click', () => {
        // Si no está logueado, no abre el modal, manda al login
        if (!getCurrentUserId()) {
            window.location.href = '../login/login.html';
            return;
        }
        renderCartModal();
        cartModal.style.display = 'flex';
    });
    
    // Cerrar modal
    $('closeCartModal')?.addEventListener('click', () => cartModal.style.display = 'none');
    cartModal?.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.style.display = 'none';
    });

    // Delegación de eventos dentro del modal (para botones dinámicos)
    $('cartItemsContainer')?.addEventListener('click', (e) => {
        // Buscar el botón más cercano (por si se hizo clic en el icono)
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!id) return;

        const cart = loadCart();
        const item = cart.find(i => i.id === id);
        if (!item) return;

        if (btn.classList.contains('plus')) {
            updateCartItemQuantity(id, item.quantity + 1);
        } else if (btn.classList.contains('minus')) {
            updateCartItemQuantity(id, item.quantity - 1);
        } else if (btn.classList.contains('remove-cart-item-btn')) {
            removeFromCart(id);
        }
    });

    // Botón "Proceder al Pago" en el modal -> Redirige a compra.html
    $('checkoutBtnModal')?.addEventListener('click', () => {
        // Ajusta esta ruta si es necesario
        window.location.href = '../compraCliente/compra.html';
    });

    // Inicializar el contador del header al cargar la página
    updateCartUI(loadCart());
});
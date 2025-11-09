// #################################################
// 🔹 CONFIGURACIÓN Y UTILIDADES
// #################################################
const $ = (id) => document.getElementById(id);
// Ajusta la URL de Render si es necesario
const RENDER_SERVER_URL = 'https://tiendaonlinepdv-hm20.onrender.com';

let currentProduct = null;
let currentStockQty = 0;

// Función para obtener el ID del producto de la URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // Retorna el ID o null si no existe
    return params.get('id');
}

// Función para obtener el ID del usuario actual desde el token de Supabase
function getCurrentUserId() {
    const token = localStorage.getItem('supabase-token'); // O sessionStorage, según tu login.js
    if (!token) return null;
    try {
        // Decodificar el payload del token JWT (la segunda parte)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload).sub; // 'sub' es el ID del usuario en Supabase
    } catch (e) {
        console.error("Error al decodificar token:", e);
        return null;
    }
}

// Función para mostrar un Toast (CSS Puro)
function showToast(message, type = 'info') {
    const toastContainer = $('toastContainer');
    if (!toastContainer) return;

    const colorClass = type === 'ok' ? 'toast-ok' : type === 'err' ? 'toast-err' : 'toast-info';
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${colorClass}`;
    toastElement.textContent = message;

    toastContainer.appendChild(toastElement);
    // Forzar re-flow para que la transición funcione
    void toastElement.offsetWidth;
    toastElement.classList.add('toast-show');

    setTimeout(() => {
        toastElement.classList.remove('toast-show');
        toastElement.addEventListener('transitionend', () => {
            if (toastElement.parentNode === toastContainer) {
                toastContainer.removeChild(toastElement);
            }
        });
    }, 3000);
}


// #################################################
// 🔸 LÓGICA DEL CARRITO (POR USUARIO)
// #################################################

// Obtiene la clave de localStorage específica para el usuario actual
function getCartKey() {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return `cart_${userId}`; // Ej: cart_user123abc
}

function loadCart() {
    const cartKey = getCartKey();
    // Si no hay usuario logueado, retornamos carrito vacío (o podrías manejar un carrito temporal)
    if (!cartKey) return []; 
    const cartJson = localStorage.getItem(cartKey);
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    const cartKey = getCartKey();
    if (cartKey) {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCartUI(cart);
    }
}

// Actualiza el contador del carrito en el header
function updateCartUI(cart) {
    const cartCountElement = $('cart-count');
    if (cartCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
    }
}

function addToCart(productId, quantityToAdd, silent = false) {
    // 1. Verificar si el usuario está logueado
    if (!getCurrentUserId()) {
        alert("Debes iniciar sesión para agregar productos al carrito.");
        // Ajusta la ruta relativa al login si es necesario
        window.location.href = '../login/login.html';
        return false;
    }

    if (!currentProduct || quantityToAdd <= 0) return false;

    const cart = loadCart();
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    let newQuantity = quantityToAdd;

    if (existingItemIndex > -1) {
        newQuantity = cart[existingItemIndex].quantity + quantityToAdd;
    }

    // Validar Stock
    if (newQuantity > currentStockQty) {
        showToast(`No hay suficiente stock. Máximo disponible: ${currentStockQty}`, 'err');
        return false;
    }

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity = newQuantity;
    } else {
        // Usar una imagen válida o un placeholder si no hay imágenes
        const imgUrl = (currentProduct.images && currentProduct.images.length > 0) 
            ? currentProduct.images[0] 
            : 'https://via.placeholder.com/50'; // Placeholder simple

        cart.push({
            id: currentProduct._id,
            nombre: currentProduct.name,
            precio: currentProduct.price,
            imagen: imgUrl,
            quantity: quantityToAdd,
            maxStock: currentStockQty // Guardamos el stock máx para validaciones futuras en el carrito
        });
    }

    saveCart(cart);
    if (!silent) {
        showToast(`"${currentProduct.name}" agregado al carrito.`, 'ok');
    }
    // Opcional: abrir el modal automáticamente al agregar
    // renderCartModal(); openCartModal();
    return true;
}

function removeFromCart(productId) {
    let cart = loadCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCartModal(); // Re-renderizar el modal si está abierto
}

function updateCartItemQuantity(productId, newQuantity) {
    let cart = loadCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }
        // Validar contra el stock guardado (o el actual si es el mismo producto de la página)
        const maxStock = (currentProduct && currentProduct._id === productId) ? currentStockQty : (item.maxStock || 999);
        
        if (newQuantity > maxStock) {
            showToast(`Stock máximo alcanzado (${maxStock})`, 'info');
            item.quantity = maxStock;
        } else {
             item.quantity = newQuantity;
        }
        saveCart(cart);
        renderCartModal();
    }
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
            // Plantilla de ítem del carrito
            container.innerHTML += `
                <div class="cart-item-row">
                    <div style="flex: 2; display: flex; align-items: center;">
                        <img src="${item.imagen}" alt="${item.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 10px;">
                        <div>
                            <p style="margin: 0; font-weight: 600; font-size: 0.9em;">${item.nombre}</p>
                            <small style="color: #666;">$${item.precio.toFixed(2)} x ${item.quantity}</small>
                        </div>
                    </div>
                    <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;">
                         <button class="btn-qty minus" data-id="${item.id}">-</button>
                         <span style="width: 30px; text-align: center;">${item.quantity}</span>
                         <button class="btn-qty plus" data-id="${item.id}">+</button>
                    </div>
                    <div style="flex: 1; text-align: right; font-weight: bold;">
                        $${lineTotal.toFixed(2)}
                    </div>
                    <div style="width: 30px; text-align: right;">
                        <button class="btn-remove remove-cart-item-btn" data-id="${item.id}" title="Eliminar" style="border:none; background:none; cursor:pointer; color:red;">
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
// 🔹 CARGA Y DESPLIEGUE DE DETALLES DEL PRODUCTO
// #################################################

async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);
        if (!response.ok) throw new Error("Producto no encontrado");
        const product = await response.json();

        currentProduct = product;
        currentStockQty = product.stockQty || 0;

        // Renderizar textos en la página
        $('productTitlePage').textContent = `${product.name} - LEVEL ONE`;
        $('productName').textContent = product.name;
        $('productSku').textContent = product.sku;
        $('productBrand').textContent = product.brand || 'Genérico';
        $('productDescription').textContent = product.description || '';
        $('productPrice').textContent = `$${product.price.toFixed(2)}`;

        // Stock y estado de botones
        const stockLabel = $('productStock');
        const btnCart = $('addToCartBtn');
        const btnBuy = $('buyNowBtn');
        
        if (currentStockQty > 0 && product.active) {
            stockLabel.textContent = `En Stock (${currentStockQty} disponibles)`;
            stockLabel.className = 'stock-status in-stock';
            btnCart.disabled = false;
            btnBuy.disabled = false;
        } else {
            stockLabel.textContent = 'Agotado';
            stockLabel.className = 'stock-status out-of-stock';
            btnCart.disabled = true;
            btnBuy.disabled = true;
        }

        // Imagen principal
        const mainImg = $('productImage');
        if (mainImg) {
            mainImg.src = (product.images && product.images.length > 0) 
                ? product.images[0] 
                : 'https://via.placeholder.com/400?text=Sin+Imagen';
        }

    } catch (error) {
        console.error(error);
        showToast("Error al cargar el producto. Verifica el ID.", "err");
    }
}

// #################################################
// ⚡ INICIALIZACIÓN Y LISTENERS
// #################################################

document.addEventListener('DOMContentLoaded', () => {
    const productId = getProductIdFromUrl();
    if (productId) {
        fetchProductDetails(productId);
    } else {
        // Si no hay ID, redirigir al inicio
        window.location.href = '../../index.html';
    }

    // --- Control de Cantidad en la Página ---
    const qtyInput = $('productQuantity');
    $('plusQuantity')?.addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 1;
        if (val < currentStockQty) qtyInput.value = val + 1;
    });
    $('minusQuantity')?.addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
    });

    // --- Botones de Acción Principales ---
    
    // 1. Agregar al carrito
    $('addToCartBtn')?.addEventListener('click', () => {
        addToCart(currentProduct._id, parseInt(qtyInput.value));
    });

    // 2. Comprar ahora -> Redirige a compra.html
    $('buyNowBtn')?.addEventListener('click', () => {
        if (addToCart(currentProduct._id, parseInt(qtyInput.value), true)) {
             // Ajusta esta ruta si tu estructura de carpetas es diferente
            window.location.href = '../compraCliente/compra.html';
        }
    });

    // --- Botones y Modal del Carrito ---
    const cartModal = $('cartModal');
    $('cartBtn')?.addEventListener('click', () => {
        renderCartModal();
        cartModal.style.display = 'flex';
    });
    $('closeCartModal')?.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
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

    // Inicializar el contador del header al cargar
    updateCartUI(loadCart());
});
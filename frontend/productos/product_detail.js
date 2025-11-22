// #################################################
// 🔹 CONFIGURACIÓN Y UTILIDADES
// #################################################
const $ = (id) => document.getElementById(id);
const RENDER_SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

let currentProduct = null;
let currentStockQty = 0;
let isCurrentlyFavorite = false;
let currentProductId = getProductIdFromUrl();
const token = sessionStorage.getItem('supabase-token');

// Obtiene el ID del producto de la URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Obtiene el ID del usuario de forma segura
function getCurrentUserId() {
    const token = sessionStorage.getItem('supabase-token');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));

        return JSON.parse(jsonPayload).sub;
    } catch (e) {
        console.error("Token inválido:", e);
        return null;
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
    setTimeout(() => toastElement.classList.add('toast-show'), 10);
    setTimeout(() => {
        toastElement.classList.remove('toast-show');
        toastElement.addEventListener('transitionend', () => toastElement.remove());
    }, 3000);
}

function formatDate(isoString) {
    if (!isoString) return 'Fecha desconocida';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return 'Fecha inválida'; }
}

// =======================================================
// CONFIGURACIÓN DEL HEADER Y MENÚ LATERAL
// =======================================================
function setupHeader() {
    const loginBtn = $("loginBtn");
    const menuToggle = $("menuToggle"); // Botón hamburguesa
    
    // Elementos del menú lateral
    const sideMenu = $("clientSideMenu");
    const menuOverlay = $("menuOverlay");
    const clientMenuLinks = $("clientMenuLinks");

    // Leemos la sesión
    const token = sessionStorage.getItem('supabase-token');
    
    // 1. Si hay token, asumimos que es Cliente
    if (token) {
        // --- Usuario LOGUEADO ---
        if (loginBtn) {
            loginBtn.textContent = "Mi Cuenta";
            loginBtn.addEventListener("click", () => {
                // Redirige directo al perfil del cliente
                window.location.href = "../cliente/cliente.html";
            });
        }

        // --- Menú Hamburguesa (Visible para quien esté logueado) ---
        if (menuToggle) {
            menuToggle.style.display = 'block'; 

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

            // Click en los enlaces del menú lateral
            if (clientMenuLinks) {
                clientMenuLinks.addEventListener('click', (e) => {
                    const action = e.target.getAttribute('data-action');
                    if (action) {
                        // Cerrar menú antes de ejecutar la acción
                        sideMenu.style.left = '-250px';
                        menuOverlay.style.display = 'none';
                        handleClientMenuAction(action);
                    }
                });
            }
        }

    } else {
        // --- Usuario NO LOGUEADO (Visitante) ---
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                window.location.href = "../login/login.html";
            });
        }
        // Ocultar hamburguesa si no está logueado
        if (menuToggle) {
            menuToggle.style.display = 'none';
        }
    }
}

// ⭐️ Manejador de acciones del menú (Rutas ajustadas para /productos/) ⭐️
function handleClientMenuAction(action) {
    switch (action) {
        case 'rastreo':
            window.location.href = "../cliente/buscador.html";
            break;
        case 'favoritos':
            window.location.href = "../cliente/favoritos.html";
            break;
        case 'historial':
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

// #################################################
// 🔸 LÓGICA DEL CARRITO
// #################################################

function getCartKey() {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return `cart_${userId}`;
}

function loadCart() {
    const key = getCartKey();
    if (!key) return [];
    const cartJson = localStorage.getItem(key);
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    const key = getCartKey();
    if (key) {
        localStorage.setItem(key, JSON.stringify(cart));
        updateCartUI(cart);
    }
}

function updateCartUI(cart) {
    const countElement = $('cart-count');
    if (countElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countElement.textContent = totalItems;
    }
}

function addToCart(quantityToAdd, silent = false) {
    if (!getCurrentUserId()) {
        showToast("Debes iniciar sesión para comprar.", 'err');
        setTimeout(() => window.location.href = '../login/login.html', 1500);
        return false;
    }

    if (!currentProduct || quantityToAdd <= 0) return false;

    const cart = loadCart();
    const existingItem = cart.find(item => item.id === currentProduct._id);
    let newQuantity = quantityToAdd;

    if (existingItem) {
        newQuantity = existingItem.quantity + quantityToAdd;
    }

    if (newQuantity > currentStockQty) {
        showToast(`No hay suficiente stock. Máximo: ${currentStockQty}`, 'err');
        return false;
    }

    // Cálculo de precio con descuento
    const precioBase = currentProduct.price || 0;
    let precioFinal = precioBase;
    if (currentProduct.descuento && currentProduct.descuento.activa) {
        const { tipo_descuento, valor } = currentProduct.descuento;
        if (tipo_descuento === 'PORCENTAJE') {
            precioFinal = precioBase * (1 - (valor / 100));
        } else if (tipo_descuento === 'FIJO') {
            precioFinal = Math.max(precioBase - valor, 0);
        }
    }

    if (existingItem) {
        existingItem.quantity = newQuantity;
    } else {
        cart.push({
            id: currentProduct._id,
            nombre: currentProduct.name,
            precio: precioFinal,
            descuento: currentProduct.descuento && currentProduct.descuento.activa ? currentProduct.descuento : null,
            imagen: currentProduct.images?.[0] || 'https://via.placeholder.com/50',
            quantity: quantityToAdd,
            maxStock: currentStockQty
        });
    }

    saveCart(cart);
    if (!silent) showToast("Producto agregado al carrito", "ok");
    renderCartModal();
    return true;
}

function updateCartItemQuantity(id, newQuantity) {
    let cart = loadCart();
    const itemIndex = cart.findIndex(i => i.id === id);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    if (newQuantity <= 0) {
        removeFromCart(id);
        return;
    }
    if (newQuantity > item.maxStock) {
        showToast(`No puedes agregar más. Stock máximo: ${item.maxStock}`, 'err');
        return;
    }
    item.quantity = newQuantity;
    saveCart(cart);
    renderCartModal();
}

function removeFromCart(id) {
    let cart = loadCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    showToast("Producto eliminado del carrito", 'info');
    renderCartModal();
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
// ⭐️ COMENTARIOS
// #################################################

async function fetchComments(productId) {
    const reviewsContainer = $('productReviews');
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}/comments`);
        if (!response.ok) throw new Error('No se pudieron cargar las reseñas.');
        const comments = await response.json();
        renderComments(comments);
    } catch (error) {
        console.error(error);
        reviewsContainer.innerHTML = '<p>Error al cargar reseñas.</p>';
    }
}

function renderComments(comments) {
    const reviewsContainer = $('productReviews');
    reviewsContainer.innerHTML = '';
    if (comments.length === 0) {
        reviewsContainer.innerHTML = '<p>No hay reseñas aún. ¡Sé el primero!</p>';
        return;
    }
    comments.forEach(comment => {
        const author = comment.cliente_online?.correo;
        const date = formatDate(comment.created_at); 
        reviewsContainer.innerHTML += `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">Publicado por: ${author}</span>
                    <small class="review-date">${date}</small>
                </div>
                <p>${comment.comentario}</p>
            </div>
        `;
    });
}

async function handleCommentSubmit(event) {
    event.preventDefault();
    const commentText = $('commentText').value.trim();
    const productId = getProductIdFromUrl();
    const token = sessionStorage.getItem('supabase-token');

    if (!commentText) { showToast("Por favor, escribe un comentario.", 'err'); return; }
    if (!productId || !token) { showToast("Error de autenticación.", 'err'); return; }

    $('submitCommentBtn').disabled = true;
    $('submitCommentBtn').textContent = 'Publicando...';

    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ comentario: commentText })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al publicar.');

        showToast("Comentario publicado con éxito", 'ok');
        $('commentText').value = '';
        fetchComments(productId);
    } catch (error) {
        showToast(error.message, 'err');
    } finally {
        $('submitCommentBtn').disabled = false;
        $('submitCommentBtn').textContent = 'Publicar';
    }
}

function setupCommentSection() {
    const userId = getCurrentUserId();
    if (userId) {
        $('commentForm').style.display = 'block';
        $('commentLoginPrompt').style.display = 'none';
        $('commentForm').addEventListener('submit', handleCommentSubmit);
    } else {
        $('commentForm').style.display = 'none';
        $('commentLoginPrompt').style.display = 'block';
    }
}

// #################################################
// 🔹 CARGA DEL PRODUCTO
// #################################################

async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);
        if (!response.ok) throw new Error("Producto no encontrado");

        currentProduct = await response.json();
        currentStockQty = currentProduct.stockQty || 0;

        $('productTitlePage').textContent = `${currentProduct.name} - LEVEL ONE`;
        $('productName').textContent = currentProduct.name;
        $('productSku').textContent = `SKU: ${currentProduct.sku}`;
        $('productBrand').textContent = `Marca: ${currentProduct.brand || 'Genérico'}`;
        $('productDescription').textContent = currentProduct.description || 'Sin descripción.';

        const precioBase = currentProduct.price || 0;
        let precioFinal = precioBase;
        let tienePromo = currentProduct.descuento && currentProduct.descuento.activa;

        if (tienePromo) {
            const { tipo_descuento, valor, nombre_promo } = currentProduct.descuento;
            if (tipo_descuento === 'PORCENTAJE') {
                precioFinal = precioBase * (1 - (valor / 100));
            } else if (tipo_descuento === 'FIJO') {
                precioFinal = Math.max(precioBase - valor, 0);
            }
            $('productPrice').textContent = `$${precioFinal.toFixed(2)}`;
            $('productOldPrice').textContent = `$${precioBase.toFixed(2)}`;

            let textoPromo = nombre_promo || 'Promoción aplicada';
            if (tipo_descuento === 'PORCENTAJE') textoPromo += ` (-${valor}% )`;
            else if (tipo_descuento === 'FIJO') textoPromo += ` (-$${valor.toFixed(2)})`;
            
            $('productDiscount').textContent = textoPromo;
        } else {
            $('productPrice').textContent = `$${precioBase.toFixed(2)}`;
            $('productOldPrice').textContent = '';
            $('productDiscount').textContent = '';
        }

        const stockLabel = $('productStock');
        const canBuy = currentProduct.active && currentStockQty > 0;

        $('addToCartBtn').disabled = !canBuy;
        $('buyNowBtn').disabled = !canBuy;

        if (canBuy) {
            stockLabel.textContent = `En Stock (${currentStockQty} disponibles)`;
            stockLabel.style.color = '#198754';
        } else {
            stockLabel.textContent = 'Agotado / No disponible';
            stockLabel.style.color = '#dc3545';
        }

        if (currentProduct.images && currentProduct.images.length > 0) {
            $('productImage').src = currentProduct.images[0];
            const thumbnailsContainer = $('productThumbnails');
            thumbnailsContainer.innerHTML = '';
            currentProduct.images.forEach(imgUrl => {
                const thumb = document.createElement('img');
                thumb.src = imgUrl;
                thumb.className = 'thumbnail';
                thumb.addEventListener('click', () => $('productImage').src = imgUrl);
                thumbnailsContainer.appendChild(thumb);
            });
        }

        $('detailMaterial').textContent = currentProduct.details?.material || 'No especificado';
        $('detailColor').textContent = currentProduct.details?.color || 'No especificado';

    } catch (error) {
        console.error(error);
        $('productName').textContent = "Error cargando producto";
        showToast("No se pudo cargar el producto", "err");
        $('addToCartBtn').disabled = true;
        $('buyNowBtn').disabled = true;
    }
}

// #################################################
// 🚀 INICIALIZACIÓN
// #################################################

document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    if (currentProductId) {
        fetchProductDetails(currentProductId);
        fetchComments(currentProductId);

        if (token) {
            checkFavoriteStatus(currentProductId);
            $('favoriteBtn').style.display = 'inline-block';
        }
    } else {
        window.location.href = '../../index.html';
    }

    setupCommentSection();

    const qtyInput = $('productQuantity');
    $('plusQuantity')?.addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 1;
        if (val < currentStockQty) qtyInput.value = val + 1;
    });
    $('minusQuantity')?.addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
    });
    qtyInput?.addEventListener('change', () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val < 1) val = 1;
        if (val > currentStockQty) val = currentStockQty;
        qtyInput.value = val;
    });

    $('addToCartBtn')?.addEventListener('click', () => addToCart(parseInt(qtyInput.value)));
    $('buyNowBtn')?.addEventListener('click', () => {
        if (addToCart(parseInt(qtyInput.value), true)) {
            window.location.href = '../compraCliente/compra.html';
        }
    });

    $('favoriteBtn')?.addEventListener('click', handleFavoriteToggle);

    const cartModal = $('cartModal');
    $('cartBtn')?.addEventListener('click', () => {
        if (!getCurrentUserId()) {
            window.location.href = '../login/login.html';
            return;
        }
        renderCartModal();
        cartModal.style.display = 'flex';
    });

    $('closeCartModal')?.addEventListener('click', () => cartModal.style.display = 'none');
    cartModal?.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.style.display = 'none';
    });

    $('cartItemsContainer')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!id) return;
        const cart = loadCart();
        const item = cart.find(i => i.id === id);
        if (!item) return;

        if (btn.classList.contains('plus')) updateCartItemQuantity(id, item.quantity + 1);
        else if (btn.classList.contains('minus')) updateCartItemQuantity(id, item.quantity - 1);
        else if (btn.classList.contains('btn-remove')) removeFromCart(id);
    });

    $('checkoutBtnModal')?.addEventListener('click', () => {
        window.location.href = '../compraCliente/compra.html';
    });

    updateCartUI(loadCart());
});

// #################################################
// ⭐️ FAVORITOS (LÓGICA)
// #################################################

async function checkFavoriteStatus(productId) {
    if (!token) return;
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/favorites/status/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const { isFavorite } = await response.json();
        isCurrentlyFavorite = isFavorite;
        updateFavoriteButtonUI();
    } catch (error) { console.error("Error al chequear favoritos:", error); }
}

function updateFavoriteButtonUI() {
    const btn = $('favoriteBtn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (isCurrentlyFavorite) {
        btn.classList.add('is-favorite');
        icon.classList.remove('far');
        icon.classList.add('fas');
        btn.title = "Quitar de favoritos";
        icon.style.fontWeight = '900'; 
    } else {
        btn.classList.remove('is-favorite');
        icon.classList.remove('fas');
        icon.classList.add('far');
        btn.title = "Añadir a favoritos";
        icon.style.fontWeight = '400';
    }
}

function handleFavoriteToggle() {
    if (!token || !getCurrentUserId()) {
        showToast("Debes iniciar sesión para añadir favoritos.", 'err');
        setTimeout(() => window.location.href = '../login/login.html', 1500);
        return;
    }
    if (isCurrentlyFavorite) removeFromFavorites(currentProductId);
    else addToFavorites(currentProductId);
}

async function addToFavorites(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id_producto_mongo: productId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al añadir');
        isCurrentlyFavorite = true;
        updateFavoriteButtonUI();
        showToast("Añadido a favoritos", "ok");
    } catch (error) { showToast(error.message, 'err'); }
}

async function removeFromFavorites(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/favorites/${productId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al quitar');
        isCurrentlyFavorite = false;
        updateFavoriteButtonUI();
        showToast("Quitado de favoritos", "info");
    } catch (error) { showToast(error.message, 'err'); }
}
// #################################################
// 🔹 CONFIGURACIÓN Y UTILIDADES
// #################################################
const $ = (id) => document.getElementById(id);
const RENDER_SERVER_URL = 'https://tiendaonlinepdv.onrender.com';

let currentProduct = null;
let currentStockQty = 0;

// Función para obtener el ID del producto de la URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // Usamos un ID de prueba si no hay uno
    return params.get('id') || '690e30791482493fe2cd7db3';
}

// ⭐️ MODIFICADA: Función para mostrar un Toast (CSS Puro)
function showToast(message, type = 'info') {
    const toastContainer = $('toastContainer');
    if (!toastContainer) {
        console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
        return;
    }

    // Clases de color (de tu CSS)
    const colorClass = type === 'ok' ? 'toast-ok' : type === 'err' ? 'toast-err' : 'toast-info';

    const toastElement = document.createElement('div');
    toastElement.className = `toast ${colorClass}`;
    toastElement.textContent = message;

    toastContainer.appendChild(toastElement);

    // Forzar re-dibujo para animar la entrada
    setTimeout(() => {
        toastElement.classList.add('toast-show');
    }, 10); // Pequeño delay

    // Ocultar y eliminar el toast
    setTimeout(() => {
        toastElement.classList.remove('toast-show');
        // Eliminar del DOM después de que termine la animación de salida
        toastElement.addEventListener('transitionend', () => {
            // Asegurarse de que el nodo todavía existe antes de intentar eliminarlo
            if (toastElement.parentNode === toastContainer) {
                toastContainer.removeChild(toastElement);
            }
        });
    }, 4000); // Duración del toast
}


// #################################################
// 🔸 LÓGICA DEL CARRITO (LOCALSTORAGE)
// #################################################

function loadCart() {
    const cartJson = localStorage.getItem('shoppingCart');
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    updateCartUI(cart);
}

function updateCartUI(cart) {
    const cartCountElement = $('cart-count');
    // Suma la cantidad total de productos, no la cantidad de ítems únicos.
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountElement) {
        cartCountElement.textContent = totalItems;
    }
}

function addToCart(productId, quantityToAdd) {
    if (!currentProduct || quantityToAdd <= 0) {
        showToast('No se pudo agregar al carrito. Producto o cantidad inválida.', 'err');
        return;
    }

    const cart = loadCart();
    const existingItem = cart.find(item => item.id === productId);
    let newQuantity = quantityToAdd;

    if (existingItem) {
        newQuantity = existingItem.quantity + quantityToAdd;
    }

    // Validar Stock
    if (newQuantity > currentStockQty) {
        const availableToAdd = currentStockQty - (existingItem ? existingItem.quantity : 0);

        if (availableToAdd > 0) {
            showToast(`Advertencia: Solo pudimos agregar ${availableToAdd} unidad(es) más. Stock máximo alcanzado.`, 'err');
            newQuantity = currentStockQty;
            quantityToAdd = availableToAdd;
        } else {
            showToast(`Error: Ya tienes ${existingItem ? existingItem.quantity : 0} unidades. No hay más stock (${currentStockQty}).`, 'err');
            return;
        }
    }

    if (existingItem) {
        existingItem.quantity = newQuantity;
        showToast(`Se agregaron ${quantityToAdd} unidad(es) más de ${currentProduct.name}.`, 'ok');
    } else {
        cart.push({
            id: currentProduct._id,
            nombre: currentProduct.name,
            precio: currentProduct.price,
            imagen: currentProduct.images && currentProduct.images[0] ? currentProduct.images[0] : 'https://placehold.co/50x50/ADB5BD/1f2937?text=Game',
            quantity: quantityToAdd
        });
        showToast(`"${currentProduct.name}" agregado al carrito.`, 'ok');
    }

    saveCart(cart);
    updateCartUI(cart);
    renderCartModal(); // Actualiza el modal (incluso si está oculto)
}

function updateCartItemQuantity(productId, newQuantity) {
    let cart = loadCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        const product = cart[itemIndex];

        // Validar stock (usa el stock actual si es el producto de la página, o 99 como default)
        let itemStock = (currentProduct && currentProduct._id === productId) ? currentStockQty : 99;

        if (newQuantity > itemStock) {
            showToast(`Error: Solo quedan ${itemStock} unidades en stock.`, 'err');
            newQuantity = itemStock;
        } else if (newQuantity < 1) {
            // Si la cantidad es 0 o menos, elimina el item
            removeFromCart(productId);
            return;
        }

        product.quantity = newQuantity;
        saveCart(cart);

        // Forzar actualización visual
        renderCartModal();
    }
}


function removeFromCart(productId) {
    let cart = loadCart();
    cart = cart.filter(item => item.id !== productId);
    showToast('Producto eliminado del carrito.', 'info');

    saveCart(cart);
    updateCartUI(cart);
    renderCartModal(); // Vuelve a renderizar el modal
}


// #################################################
// ⚡ VISUALIZACIÓN DEL CARRITO (CSS Puro)
// #################################################

function renderCartModal() {
    const cart = loadCart();
    const container = $('cartItemsContainer');
    const totalElement = $('cart-total-price');
    // const emptyMsg = $('emptyCartMessage'); // <--- ❌ ELIMINAMOS ESTA LÍNEA
    const checkoutBtn = $('checkoutBtnModal');

    // ✅ CORRECCIÓN: Ya no buscamos 'emptyMsg' en esta comprobación
    if (!container || !totalElement || !checkoutBtn) {
        console.error("Error: Faltan elementos clave del modal (container, totalElement o checkoutBtn).");
        return;
    }

    container.innerHTML = ''; // Limpiar items anteriores (esto ahora es seguro)
    let total = 0;

    if (cart.length === 0) {
        // ✅ CORRECCIÓN: En lugar de 'appendChild', re-insertamos el HTML del mensaje
        container.innerHTML = '<p id="emptyCartMessage" class="empty-cart-msg">Tu carrito está vacío.</p>';
        checkoutBtn.disabled = true;
    } else {
        checkoutBtn.disabled = false;

        cart.forEach(item => {
            const lineTotal = item.precio * item.quantity;
            total += lineTotal;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item-row';
            itemDiv.innerHTML = `
                <div style="display: flex; align-items: center; flex: 2;">
                    <img src="${item.imagen}" alt="${item.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div>
                        <p style="margin: 0; font-weight: 600;">${item.nombre}</p>
                        <small style="color: #666;">$${item.precio.toFixed(2)} c/u</small>
                    </div>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <button class="btn-custom-secondary minus-cart-modal" type="button" data-id="${item.id}" style="padding: 5px 10px; font-size: 0.8rem;">-</button>
                    <input type="number" value="${item.quantity}" min="1" data-id="${item.id}" style="width: 40px; text-align: center; border: 1px solid #ccc; border-radius: 4px;" disabled>
                    <button class="btn-custom-secondary plus-cart-modal" type="button" data-id="${item.id}" style="padding: 5px 10px; font-size: 0.8rem;">+</button>
                </div>
                <div style="flex: 1; text-align: right; font-weight: 700;">
                    $${lineTotal.toFixed(2)}
                </div>
                <div style="flex: 0 0 40px; text-align: right;">
                    <button class="remove-cart-item-btn" data-id="${item.id}" title="Eliminar" style="background: none; border: none; color: #dc3545; font-size: 1.2rem; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    totalElement.textContent = `$${total.toFixed(2)}`;
    updateCartUI(cart); // Sincroniza el contador del header
}


// #################################################
// 🔹 CARGA Y DESPLIEGUE DE DETALLES 
// #################################################

async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Producto no encontrado (status: ${response.status})`);
        }

        const product = await response.json();
        const stock = product.stockQty || 20; // Default stock si no viene

        currentProduct = {
            _id: product._id,
            name: product.name,
            price: product.price,
            stockQty: stock,
            oldPrice: product.oldPrice,
            images: product.images,
            sku: product.sku,
            brand: product.brand,
            description: product.description,
        };
        currentStockQty = stock;

        displayProductDetails(currentProduct);

    } catch (error) {
        console.error('Error al obtener los detalles del producto:', error);
        showToast(`Error al cargar: ${error.message}. Usando datos de ejemplo.`, 'err');

        // FALLBACK a datos mockeados 
        const mockProduct = {
            _id: productId,
            name: "Consola de Juegos (FALLBACK)",
            price: 13999.00,
            oldPrice: 15000.00,
            stockQty: 5,
            images: ['https://via.placeholder.com/400'],
            sku: 'PS5-ULTRA',
            brand: 'Sony',
            description: 'Consola de última generación con gráficos 4K y ray tracing. (Datos de demostración)'
        };

        currentProduct = mockProduct;
        currentStockQty = mockProduct.stockQty;
        displayProductDetails(mockProduct);
    }
}

function displayProductDetails(product) {
    $('productTitlePage').textContent = `${product.name} - LEVEL ONE`;
    $('productName').textContent = product.name;
    $('productSku').textContent = product.sku;
    $('productBrand').textContent = product.brand;
    $('productDescription').textContent = product.description;

    $('productPrice').textContent = `$${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Manejo de Descuentos
    const discountPriceEl = $('productOldPrice');
    const discountBadgeEl = $('productDiscount');
    if (product.oldPrice && product.oldPrice > product.price) {
        discountPriceEl.textContent = `$${product.oldPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const discount = ((product.oldPrice - product.price) / product.oldPrice) * 100;
        discountBadgeEl.textContent = `Ahorro ${discount.toFixed(0)}%`;
        discountPriceEl.style.display = 'inline';
        discountBadgeEl.style.display = 'inline';
    } else {
        discountPriceEl.style.display = 'none';
        discountBadgeEl.style.display = 'none';
    }

    // Stock y disponibilidad
    const addToCartBtn = $('addToCartBtn');
    const buyNowBtn = $('buyNowBtn');
    const productStock = $('productStock');

    if (product.stockQty > 0) {
        productStock.textContent = `${product.stockQty} unidades en stock`;
        productStock.style.color = '#198754'; // Verde (basado en tu CSS)
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (buyNowBtn) buyNowBtn.disabled = false;
    } else {
        productStock.textContent = 'Agotado';
        productStock.style.color = '#dc3545'; // Rojo (un rojo estándar)
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }

    // Imágenes
    const mainImage = $('productImage');
    const thumbnailsContainer = $('productThumbnails');

    if (product.images && product.images.length > 0) {
        if (mainImage) {
            mainImage.src = product.images[0] || 'https://via.placeholder.com/400';
            mainImage.alt = product.name;
        }

        if (thumbnailsContainer) {
            thumbnailsContainer.innerHTML = '';
            product.images.forEach((imgUrl, index) => {
                const thumbImg = document.createElement('img');
                thumbImg.src = imgUrl;
                thumbImg.alt = `${product.name} miniatura ${index + 1}`;
                // Usamos la clase 'active' de tu CSS
                if (index === 0) {
                    thumbImg.classList.add('active');
                }
                thumbImg.addEventListener('click', () => {
                    if ($('productImage')) $('productImage').src = imgUrl;
                    // Quitar 'active' de todos
                    Array.from(thumbnailsContainer.children).forEach(t => t.classList.remove('active'));
                    // Añadir 'active' a la clickeada
                    thumbImg.classList.add('active');
                });
                thumbnailsContainer.appendChild(thumbImg);
            });
        }
    } else {
        if (mainImage) mainImage.src = 'https://via.placeholder.com/400';
        if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
    }

    // Detalles adicionales (Mockeados como en tu JS original)
    const detailsList = $('productDetailsList');
    if (detailsList) {
        detailsList.innerHTML = '';
        const mockDetails = {
            "Material": "Plástico ABS reforzado",
            "Peso": "2.5 kg",
            "Conectividad": "Wi-Fi 6, Bluetooth 5.0"
        };

        for (const [key, value] of Object.entries(mockDetails)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${key}:</strong> ${value}`;
            detailsList.appendChild(li);
        }
    }
}


// #################################################
// 💥 DELEGACIÓN DE EVENTOS DEL MODAL
// #################################################
function setupModalDelegation() {
    const modalElement = $('cartModal'); // Escucha en el overlay

    if (!modalElement) {
        console.error('❌ No se encontró el elemento del modal');
        return;
    }

    console.log('✅ Configurando delegación de eventos del modal');

    modalElement.addEventListener('click', function (e) {
        const target = e.target;

        // Buscar el botón clickeado (incluye íconos Font Awesome)
        const button = target.closest('.remove-cart-item-btn') ||
            target.closest('.plus-cart-modal') ||
            target.closest('.minus-cart-modal');

        if (!button) return;

        const productId = button.getAttribute('data-id');
        if (!productId) return;

        if (button.classList.contains('remove-cart-item-btn')) {
            removeFromCart(productId);
        }
        else if (button.classList.contains('plus-cart-modal')) {
            // Busca el input de cantidad *dentro* del modal
            const qtyInput = modalElement.querySelector(`input[data-id="${productId}"][disabled]`);
            if (qtyInput) {
                const newQuantity = parseInt(qtyInput.value) + 1;
                updateCartItemQuantity(productId, newQuantity);
            }
        }
        else if (button.classList.contains('minus-cart-modal')) {
            const qtyInput = modalElement.querySelector(`input[data-id="${productId}"][disabled]`);
            if (qtyInput) {
                const newQuantity = parseInt(qtyInput.value) - 1;
                updateCartItemQuantity(productId, newQuantity);
            }
        }
    });
}


// #################################################
// ⚡ INICIALIZACIÓN Y LISTENERS PRINCIPALES
// #################################################

function setupQuantityControls() {
    const quantityInput = $('productQuantity');
    const plusBtn = $('plusQuantity');
    const minusBtn = $('minusQuantity');

    // Botones +/-
    if (plusBtn) {
        plusBtn.addEventListener('click', () => {
            let current = parseInt(quantityInput.value);
            if (!isNaN(current) && current < currentStockQty) {
                quantityInput.value = current + 1;
            } else if (!isNaN(current) && current >= currentStockQty) {
                showToast(`Stock máximo alcanzado (${currentStockQty} unidades).`, 'info');
            }
        });
    }
    if (minusBtn) {
        minusBtn.addEventListener('click', () => {
            let current = parseInt(quantityInput.value);
            if (!isNaN(current) && current > 1) {
                quantityInput.value = current - 1;
            }
        });
    }
    // Listener para validación manual
    if (quantityInput) {
        quantityInput.addEventListener('change', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 1) {
                e.target.value = 1;
            } else if (value > currentStockQty) {
                e.target.value = currentStockQty;
                showToast(`Se ajustó la cantidad al stock máximo (${currentStockQty}).`, 'info');
            }
        });
    }
}

function setupActionButtons() {
    const quantityInput = $('productQuantity');

    // 1. Agregar al Carrito
    $('addToCartBtn').addEventListener('click', () => {
        if (!currentProduct) {
            showToast('Esperando la carga del producto. Inténtalo de nuevo.', 'err');
            return;
        }
        const quantity = parseInt(quantityInput.value);
        addToCart(currentProduct._id, quantity);
    });

    // 2. Comprar Ahora (Agrega al carrito y redirige)
    $('buyNowBtn').addEventListener('click', () => {
        if (!currentProduct) return;
        const quantity = parseInt(quantityInput.value);
        addToCart(currentProduct._id, quantity);

        // Redirección al checkout
        window.location.href = '../../detalle_pedido.html';
    });

    // 3. Botón de Checkout dentro del Modal
    $('checkoutBtnModal').addEventListener('click', () => {
        const cart = loadCart();
        if (cart.length > 0) {
            // ⭐️ MODIFICADO: Llama a la función de cierre personalizada
            closeCartModal();
            window.location.href = '../../detalle_pedido.html';
        } else {
            showToast('El carrito está vacío. Agrega productos antes de pagar.', 'err');
        }
    });
}

// ⭐️ AÑADIDO: Funciones para controlar el modal (CSS Puro)
function openCartModal() {
    console.log('🎯 Abriendo modal - renderizando carrito');
    renderCartModal(); // Renderiza el contenido primero
    const modal = $('cartModal');
    if (modal) modal.style.display = 'flex'; // Muestra el overlay
}

function closeCartModal() {
    console.log('📦 Cerrando modal');
    const modal = $('cartModal');
    if (modal) modal.style.display = 'none'; // Oculta el overlay

    // Actualizar contador en header por si hubo cambios
    updateCartUI(loadCart());
}


// ⭐️ MODIFICADA: Configuración del Modal (CSS Puro)
function setupCartModal() {
    const cartModalElement = $('cartModal');
    if (!cartModalElement) return;

    // 1. Botón del Header para ABRIR
    $('cartBtn').addEventListener('click', openCartModal);

    // 2. Botón 'X' en el modal para CERRAR
    $('closeCartModal').addEventListener('click', closeCartModal);

    // 3. Clic en el overlay (fondo) para CERRAR
    cartModalElement.addEventListener('click', (e) => {
        // Si se hizo clic directamente en el overlay (y no en un hijo)
        if (e.target.id === 'cartModal') {
            closeCartModal();
        }
    });
}


// Ejecutar inmediatamente al cargar el script para inicializar el contador del header
updateCartUI(loadCart());

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Inicializando página de detalle (CSS Puro)...');

    // 1. Cargar producto
    fetchProductDetails(getProductIdFromUrl());

    // 2. Configurar controles básicos
    setupQuantityControls();
    setupActionButtons();

    // 3. Configura los listeners para ABRIR/CERRAR el modal
    setupCartModal();

    // 4. Configura los listeners para botones DENTRO del modal
    setupModalDelegation();

    // 5. Inicializar UI del carrito (redundante, pero asegura)
    updateCartUI(loadCart());

    console.log('✅ Página inicializada correctamente');

    // Debug: ver estado inicial
    console.log('🛒 Carrito inicial:', loadCart());
});
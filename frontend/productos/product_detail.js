// #################################################
// 🔹 CONFIGURACIÓN Y UTILIDADES
// #################################################
const $ = (id) => document.getElementById(id);
const RENDER_SERVER_URL = 'https://tiendaonlinepdv.onrender.com';

let currentProduct = null;
let currentStockQty = 0; 
// 🛑 Instancia de Modal de Bootstrap (necesaria para controlar el modal)
let cartModalInstance = null; 

// Función para obtener el ID del producto de la URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // Usamos un ID de prueba si no hay uno, para fines de demostración de la interfaz
    return params.get('id') || '690e30791482493fe2cd7db3'; 
}

// Función para mostrar un Toast de mensaje (Usando la API de Bootstrap)
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer || typeof bootstrap === 'undefined' || !bootstrap.Toast) {
        // Fallback si Bootstrap JS no cargó (aunque debería)
        console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
        return;
    }

    // Clases de color de Bootstrap
    const colorClass = type === 'ok' ? 'text-bg-success' : type === 'err' ? 'text-bg-danger' : 'text-bg-info';

    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center ${colorClass} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.appendChild(toastElement);

    // Crea y muestra la instancia de Toast de Bootstrap
    const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 });
    bsToast.show();
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
    
    if (newQuantity > currentStockQty) {
        showToast(`Error: Solo quedan ${currentStockQty} unidades en stock. No se pudo agregar.`, 'err');
        return;
    }

    if (existingItem) {
        existingItem.quantity = newQuantity;
        showToast(`Se agregaron ${quantityToAdd} unidades más de ${currentProduct.name}.`, 'ok');
    } else {
        cart.push({
            id: productId,
            nombre: currentProduct.name,
            precio: currentProduct.price,
            quantity: quantityToAdd
        });
        showToast(`"${currentProduct.name}" agregado al carrito.`, 'ok');
    }

    saveCart(cart);
    
    // 🛑 SOLUCIÓN VISUAL: Abrir el modal inmediatamente después de agregar 🛑
    if (cartModalInstance) {
        // Aseguramos que el contenido del modal esté actualizado antes de mostrar
        renderCartModal(); 
        cartModalInstance.show(); 
    }
}

function removeFromCart(productId) {
    let cart = loadCart();
    const initialLength = cart.length;
    cart = cart.filter(item => item.id !== productId);
    
    if (cart.length < initialLength) {
        showToast('Producto eliminado del carrito.', 'info');
    }

    saveCart(cart);
    renderCartModal(); // Vuelve a renderizar el modal
}


// #################################################
// ⚡ VISUALIZACIÓN DEL CARRITO (Modal - Usando clases Bootstrap)
// #################################################

function renderCartModal() {
    const cart = loadCart();
    const container = $('cartItemsContainer');
    const totalElement = $('cart-total-price');
    const emptyMsg = $('emptyCartMessage');
    const checkoutBtn = $('checkoutBtnModal');

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        emptyMsg.style.display = 'block';
        checkoutBtn.disabled = true;
    } else {
        emptyMsg.style.display = 'none';
        checkoutBtn.disabled = false;
        
        cart.forEach(item => {
            const lineTotal = item.precio * item.quantity;
            total += lineTotal;

            const itemDiv = document.createElement('div');
            // Usamos clases de Bootstrap (d-flex, align-items-center, etc.)
            itemDiv.className = 'd-flex justify-content-between align-items-center py-2 border-bottom';
            itemDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="https://placehold.co/50x50/ADB5BD/1f2937?text=Game" class="rounded me-3" alt="${item.nombre}">
                    <div>
                        <p class="mb-0 fw-semibold">${item.nombre}</p>
                        <small class="text-muted">${item.quantity} x $${item.precio.toFixed(2)}</small>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <span class="fw-bold me-3">$${lineTotal.toFixed(2)}</span>
                    <!-- Botón de eliminación con Font Awesome -->
                    <button 
                        class="btn btn-sm btn-outline-danger" 
                        data-id="${item.id}"
                        title="Eliminar Producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(itemDiv);

            // Añadir evento al botón de eliminar
            itemDiv.querySelector('.btn-outline-danger').addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                removeFromCart(productId);
            });
        });
    }

    totalElement.textContent = `$${total.toFixed(2)}`;
}


// #################################################
// 🔹 CARGA Y DESPLIEGUE DE DETALLES (Tu lógica original)
// #################################################

async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Producto no encontrado. Usando datos mockeados.');
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar el producto.');
        }

        const product = await response.json();
        // Fallback de stock para que la lógica funcione si la API no lo devuelve
        const stock = product.stockQty || 20; 

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
        showToast(`Error al cargar el producto: ${error.message}. Usando datos de ejemplo.`, 'err');
        
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
    // Implementación de displayProductDetails (omito por brevedad, asumiendo que ya funciona con tu HTML)
    // ... Tu lógica de displayProductDetails va aquí ...

    $('productTitlePage').textContent = `${product.name} - LEVEL ONE`;
    $('productName').textContent = product.name;
    $('productSku').textContent = product.sku;
    $('productBrand').textContent = product.brand;
    $('productDescription').textContent = product.description;

    $('productPrice').textContent = `$${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Manejo de Descuentos (Bootstrap)
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
        productStock.parentElement.classList.replace('text-danger', 'text-success');
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (buyNowBtn) buyNowBtn.disabled = false;
    } else {
        productStock.textContent = 'Agotado';
        productStock.parentElement.classList.replace('text-success', 'text-danger');
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

        if(thumbnailsContainer) {
            thumbnailsContainer.innerHTML = '';
            product.images.forEach((imgUrl, index) => {
                const thumbImg = document.createElement('img');
                thumbImg.src = imgUrl;
                thumbImg.alt = `${product.name} miniatura ${index + 1}`;
                // Clases de Bootstrap
                thumbImg.className = 'img-thumbnail rounded mx-1 cursor-pointer';
                if (index === 0) {
                    thumbImg.classList.add('border', 'border-primary');
                }
                thumbImg.addEventListener('click', () => {
                    if ($('productImage')) $('productImage').src = imgUrl;
                    Array.from(thumbnailsContainer.children).forEach(t => t.classList.remove('border', 'border-primary'));
                    thumbImg.classList.add('border', 'border-primary');
                });
                thumbnailsContainer.appendChild(thumbImg);
            });
        }
    } else {
        if (mainImage) mainImage.src = 'https://via.placeholder.com/400';
        if(thumbnailsContainer) thumbnailsContainer.innerHTML = '';
    }
    
    // Detalles adicionales
    const detailsList = $('productDetailsList');
    if (detailsList) {
        detailsList.innerHTML = ''; 
        if (product.description) {
            product.description.split('\n').forEach(line => {
                if(line.trim() !== '') {
                    const li = document.createElement('li');
                    li.textContent = line.trim();
                    detailsList.appendChild(li);
                }
            });
        }
    }
}


// #################################################
// ⚡ INICIALIZACIÓN Y LISTENERS PRINCIPALES
// #################################################

function setupQuantityControls() {
    const quantityInput = $('productQuantity');
    const plusBtn = $('plusQuantity');
    const minusBtn = $('minusQuantity');

    // ... (Lógica de +/- y validación manual de cantidad) ...
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
    
    // 2. Comprar Ahora
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
            cartModalInstance.hide(); // Oculta el modal
            window.location.href = '../../detalle_pedido.html'; 
        } else {
            showToast('El carrito está vacío. Agrega productos antes de pagar.', 'err');
        }
    });
}

function setupCartModal() {
    const cartModalElement = $('cartModal');
    
    // 🛑 Crea la instancia de Bootstrap Modal
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        cartModalInstance = new bootstrap.Modal(cartModalElement);
    }
    
    // Listener para asegurar que el contenido se renderice justo antes de mostrar el modal
    cartModalElement.addEventListener('show.bs.modal', renderCartModal);

    // Nota: El botón #cartBtn ya abre el modal automáticamente gracias a data-bs-toggle/target
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos y desplegar UI
    fetchProductDetails(getProductIdFromUrl());
    
    // 2. Configurar controles y botones
    setupQuantityControls();
    setupActionButtons();
    
    // 3. Configurar el modal de carrito (Bootstrap)
    setupCartModal();
    updateCartUI(loadCart()); // Inicializar el contador
});
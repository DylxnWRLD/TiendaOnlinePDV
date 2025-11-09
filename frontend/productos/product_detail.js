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
        // Calcular cuánto se puede agregar realmente
        const availableToAdd = currentStockQty - (existingItem ? existingItem.quantity : 0);
        
        if (availableToAdd > 0) {
             // Si el stock permite al menos agregar uno de lo que pidió
             showToast(`Advertencia: Solo pudimos agregar ${availableToAdd} unidad(es) más. Stock máximo alcanzado.`, 'err');
             newQuantity = currentStockQty; // Ajustar a stock máximo
             quantityToAdd = availableToAdd; // Cantidad REALMENTE agregada
        } else {
             // El carrito ya tiene el stock máximo
             showToast(`Error: Ya tienes ${existingItem.quantity} unidades. No hay más stock (${currentStockQty}).`, 'err');
             return;
        }
    }

    if (existingItem) {
        existingItem.quantity = newQuantity;
        showToast(`Se agregaron ${quantityToAdd} unidad(es) más de ${currentProduct.name}.`, 'ok');
    } else {
        cart.push({
            id: currentProduct._id, // Usar _id del objeto currentProduct
            nombre: currentProduct.name,
            precio: currentProduct.price,
            imagen: currentProduct.images && currentProduct.images[0] ? currentProduct.images[0] : 'https://placehold.co/50x50/ADB5BD/1f2937?text=Game',
            quantity: quantityToAdd
        });
        showToast(`"${currentProduct.name}" agregado al carrito.`, 'ok');
    }

    saveCart(cart);
    
    // Renderiza el modal para actualizar el contenido al instante si está visible o si se abre justo después.
    renderCartModal(); 
}

function updateCartItemQuantity(productId, newQuantity) {
    let cart = loadCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        const product = cart[itemIndex];
        
        if (newQuantity > currentStockQty) { // Asumiendo que el stock es el mismo para todos los ítems por simplicidad.
            showToast(`Error: Solo quedan ${currentStockQty} unidades en stock.`, 'err');
            newQuantity = currentStockQty;
        } else if (newQuantity < 1) {
            // Si la cantidad es 0 o menos, lo eliminamos
            removeFromCart(productId);
            return;
        }
        
        product.quantity = newQuantity;
        saveCart(cart);
        renderCartModal(); // Actualizar el renderizado del modal
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

    if (!container || !totalElement || !emptyMsg || !checkoutBtn) {
          console.error("Error: Faltan elementos clave del modal. Asegúrate de que los IDs estén correctos.");
          return;
    }

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
            // Usamos la clase 'cart-item-row' para identificar los elementos de item
            itemDiv.className = 'd-flex justify-content-between align-items-center py-2 border-bottom cart-item-row';
            itemDiv.innerHTML = `
                <div class="d-flex align-items-center col-6">
                    <img src="${item.imagen}" class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;" alt="${item.nombre}">
                    <div>
                        <p class="mb-0 fw-semibold">${item.nombre}</p>
                        <small class="text-muted">$${item.precio.toFixed(2)} c/u</small>
                    </div>
                </div>
                
                <div class="col-3">
                    <div class="input-group input-group-sm w-75">
                        <button class="btn btn-outline-secondary btn-sm minus-cart-modal" type="button" data-id="${item.id}">-</button>
                        <input type="number" class="form-control text-center cart-qty-modal" value="${item.quantity}" min="1" data-id="${item.id}" readonly style="width: 20px;">
                        <button class="btn btn-outline-secondary btn-sm plus-cart-modal" type="button" data-id="${item.id}">+</button>
                    </div>
                </div>
                
                <div class="col-2 text-end">
                    <span class="fw-bold">$${lineTotal.toFixed(2)}</span>
                </div>
                
                <div class="col-1 text-end">
                    <button 
                        class="btn btn-sm btn-outline-danger remove-cart-item-btn" 
                        data-id="${item.id}"
                        title="Eliminar Producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(itemDiv);
        });

        // 🚨 AÑADIR LISTENERS DINÁMICOS DESPUÉS DE RENDERIZAR
        setupCartItemListeners();
    }

    totalElement.textContent = `$${total.toFixed(2)}`;
}

// Nueva función para configurar los listeners de los ítems del carrito (Eliminar, +/–)
function setupCartItemListeners() {
    // 1. Botón de Eliminar
    document.querySelectorAll('.remove-cart-item-btn').forEach(button => {
        // Aseguramos que el listener se agregue solo una vez si es posible, o re-agregamos después de cada render.
        // Usaremos .replaceWith() si se quiere optimizar, pero re-agregar es más simple.
        button.onclick = (e) => { 
            const productId = e.currentTarget.getAttribute('data-id');
            removeFromCart(productId);
        };
    });

    // 2. Botón de Aumentar Cantidad
    document.querySelectorAll('.plus-cart-modal').forEach(button => {
        button.onclick = (e) => {
            const productId = e.currentTarget.getAttribute('data-id');
            const input = document.querySelector(`.cart-qty-modal[data-id="${productId}"]`);
            const newQuantity = parseInt(input.value) + 1;
            updateCartItemQuantity(productId, newQuantity);
        };
    });
    
    // 3. Botón de Disminuir Cantidad
    document.querySelectorAll('.minus-cart-modal').forEach(button => {
        button.onclick = (e) => {
            const productId = e.currentTarget.getAttribute('data-id');
            const input = document.querySelector(`.cart-qty-modal[data-id="${productId}"]`);
            const newQuantity = parseInt(input.value) - 1;
            // updateCartItemQuantity se encarga de llamar a removeFromCart si newQuantity < 1
            updateCartItemQuantity(productId, newQuantity); 
        };
    });
}


// #################################################
// 🔹 CARGA Y DESPLIEGUE DE DETALLES (Tu lógica original)
// #################################################

async function fetchProductDetails(productId) {
    // ... (Tu código de fetchProductDetails se mantiene igual) ...
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
    // ... (Tu código de displayProductDetails se mantiene igual) ...
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
                thumbImg.style.width = '75px'; // Añadir estilo para miniatura
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
        // Mostrar detalles como una lista, asumiendo que el campo 'description'
        // ahora contiene texto normal, no una lista. Usaremos detalles mockeados.
        const mockDetails = {
            "Material": "Plástico ABS reforzado",
            "Peso": "2.5 kg",
            "Conectividad": "Wi-Fi 6, Bluetooth 5.0"
        };
        
        // Cargar detalles mockeados
        for (const [key, value] of Object.entries(mockDetails)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${key}:</strong> ${value}`;
            detailsList.appendChild(li);
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
        // Opcional: Re-establecer la cantidad a 1 después de añadir
        quantityInput.value = 1;
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
            cartModalInstance.hide(); // Oculta el modal de Bootstrap
            window.location.href = '../../detalle_pedido.html'; 
        } else {
            showToast('El carrito está vacío. Agrega productos antes de pagar.', 'err');
        }
    });
}

function setupCartModal() {
    const cartModalElement = $('cartModal');
    
    // Crea la instancia de Bootstrap Modal
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        cartModalInstance = new bootstrap.Modal(cartModalElement);
    }
    
    // Listener para asegurar que el contenido se renderice justo antes de mostrar el modal
    cartModalElement.addEventListener('show.bs.modal', renderCartModal);

    // Nota: El botón #cartBtn ya abre el modal automáticamente gracias a data-bs-toggle/target
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el contador del carrito ANTES de cargar los productos
    updateCartUI(loadCart()); 

    // 2. Cargar datos y desplegar UI
    fetchProductDetails(getProductIdFromUrl());
    
    // 3. Configurar controles y botones
    setupQuantityControls();
    setupActionButtons();
    
    // 4. Configurar el modal de carrito (Bootstrap)
    setupCartModal();
});
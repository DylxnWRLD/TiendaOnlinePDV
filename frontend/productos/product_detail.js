// ==========================================
// 🔹 CONFIGURACIÓN Y UTILIDADES
// ==========================================

// Helper para seleccionar elementos más fácil
const $ = (id) => document.getElementById(id);

// URL de tu servidor de Render (asegúrate de que sea la correcta)
const RENDER_SERVER_URL = 'https://tiendaonlinepdv-hm20.onrender.com';

// Almacena el objeto del producto cargado para acceso global por los handlers
let currentProduct = null;
let currentStockQty = 0; // Para facilitar la lógica de +/-

// Función para obtener el ID del producto de la URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id'); // Busca un parámetro 'id' en la URL
}

// Función para mostrar un Toast de mensaje (usando un placeholder simple)
function toast(message, type = 'info') {
    // Implementación simple de toast (reemplaza con tu lógica de Bootstrap si es necesario)
    console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
    // Podrías implementar una UI real de toast aquí si no usas Bootstrap
}


// ==========================================
// 🔸 LÓGICA DEL CARRITO (LOCALSTORAGE)
// ==========================================

/**
 * Carga los ítems del carrito desde localStorage.
 * @returns {Array<Object>} Lista de ítems del carrito.
 */
function loadCart() {
    const cartJson = localStorage.getItem('shoppingCart');
    return cartJson ? JSON.parse(cartJson) : [];
}

/**
 * Guarda los ítems del carrito en localStorage.
 * @param {Array<Object>} cart - Lista de ítems del carrito.
 */
function saveCart(cart) {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

/**
 * Agrega o actualiza un producto en el carrito, verificando el stock.
 * @param {string} productId - ID del producto (Mongo ID).
 * @param {number} quantityToAdd - Cantidad a agregar.
 */
function addToCart(productId, quantityToAdd) {
    if (!currentProduct || quantityToAdd <= 0) {
        toast('No se pudo agregar al carrito. Producto o cantidad inválida.', 'err');
        return;
    }

    const cart = loadCart();
    const existingItem = cart.find(item => item.id === productId);

    let newQuantity = quantityToAdd;

    if (existingItem) {
        newQuantity = existingItem.quantity + quantityToAdd;
    }
    
    // 1. Verificar stock
    if (newQuantity > currentStockQty) {
        toast(`Error: Solo quedan ${currentStockQty} unidades en stock. No se pudo agregar.`, 'err');
        return;
    }

    // 2. Realizar la adición o actualización
    if (existingItem) {
        existingItem.quantity = newQuantity;
        toast(`Se agregaron ${quantityToAdd} unidades más de ${currentProduct.name}.`, 'ok');
    } else {
        cart.push({
            id: productId,
            nombre: currentProduct.name,
            precio: currentProduct.price,
            quantity: quantityToAdd
        });
        toast(`"${currentProduct.name}" agregado al carrito.`, 'ok');
    }

    saveCart(cart);
}

// ==========================================
// 🔹 CARGA Y DESPLIEGUE DE DETALLES (Tu lógica original)
// ==========================================

async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Producto no encontrado.');
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar el producto.');
        }

        const product = await response.json();
        currentProduct = product; // Guardamos el objeto completo
        currentStockQty = product.stockQty || 0; // Guardamos el stock para el carrito

        console.log('Producto cargado:', currentProduct);
        displayProductDetails(product);

    } catch (error) {
        console.error('Error al obtener los detalles del producto:', error);
        toast(`No se pudo cargar el producto: ${error.message}`, 'err');
        // Redirigir a la página principal en caso de error crítico
        window.location.href = '../../index.html';
    }
}

function displayProductDetails(product) {
    // Título de la página
    $('productTitlePage').textContent = `${product.name} - LEVEL ONE`;

    // Información principal
    $('productName').textContent = product.name;
    $('productSku').textContent = product.sku;
    $('productBrand').textContent = product.brand;
    $('productDescription').textContent = product.description;

    // Precio
    $('productPrice').textContent = `$${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Asumiendo que `oldPrice` existe en tu modelo si hay descuento
    if (product.oldPrice && product.oldPrice > product.price) {
        $('productOldPrice').textContent = `$${product.oldPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const discount = ((product.oldPrice - product.price) / product.oldPrice) * 100;
        $('productDiscount').textContent = `Ahorro ${discount.toFixed(0)}%`;
        // Asegúrate de que estos elementos existen y tienen las clases de estilo
        if ($('productDiscount')) $('productDiscount').style.display = 'inline-block'; 
        if ($('productOldPrice')) $('productOldPrice').style.display = 'inline-block';
    } else {
        if ($('productOldPrice')) $('productOldPrice').style.display = 'none';
        if ($('productDiscount')) $('productDiscount').style.display = 'none';
    }

    // Stock y disponibilidad
    const addToCartBtn = $('addToCartBtn');
    const buyNowBtn = $('buyNowBtn');
    const productStock = $('productStock');

    if (product.stockQty > 0) {
        if (productStock) {
            productStock.textContent = `${product.stockQty} unidades en stock`;
            productStock.classList.remove('text-danger');
            productStock.classList.add('text-success'); // Asumo que tienes clases CSS para estos colores
        }
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (buyNowBtn) buyNowBtn.disabled = false;
    } else {
        if (productStock) {
            productStock.textContent = 'Agotado';
            productStock.classList.remove('text-success');
            productStock.classList.add('text-danger');
        }
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }

    // Imagen principal
    if (product.images && product.images.length > 0) {
        if ($('productImage')) $('productImage').src = product.images[0];
        if ($('productImage')) $('productImage').alt = product.name;

        // Miniaturas (si hay más de una imagen)
        const thumbnailsContainer = $('productThumbnails');
        if (thumbnailsContainer) {
             thumbnailsContainer.innerHTML = ''; // Limpiar miniaturas anteriores
             product.images.forEach((imgUrl, index) => {
                 const thumbImg = document.createElement('img');
                 thumbImg.src = imgUrl;
                 thumbImg.alt = `${product.name} miniatura ${index + 1}`;
                 thumbImg.className = 'img-thumbnail rounded mx-1 cursor-pointer';
                 if (index === 0) {
                     thumbImg.classList.add('active'); // Marca la primera como activa
                 }
                 thumbImg.addEventListener('click', () => {
                     $('productImage').src = imgUrl; // Cambia la imagen principal al hacer clic
                     // Quita 'active' de todas y ponlo en la clickeada
                     Array.from(thumbnailsContainer.children).forEach(t => t.classList.remove('active'));
                     thumbImg.classList.add('active');
                 });
                 thumbnailsContainer.appendChild(thumbImg);
             });
        }
    } else {
        if ($('productImage')) {
            $('productImage').src = 'https://via.placeholder.com/400?text=Sin+Imagen'; // Imagen por defecto
            $('productImage').alt = 'Producto sin imagen';
        }
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


// ==========================================
// ⚡ INICIALIZACIÓN Y LISTENERS PRINCIPALES
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const quantityInput = $('productQuantity');
    const plusBtn = $('plusQuantity');
    const minusBtn = $('minusQuantity');
    const addToCartButton = $('addToCartBtn');
    
    // 1. Cargar detalles del producto al cargar la página
    const productId = getProductIdFromUrl();
    if (productId) {
        fetchProductDetails(productId);
    } else {
        toast('ID de producto no especificado en la URL.', 'err');
        window.location.href = '../../index.html'; 
        return;
    }

    // 2. Control de cantidad (+/-)
    if (plusBtn && quantityInput) {
        plusBtn.addEventListener('click', () => {
            let current = parseInt(quantityInput.value);
            // Limitamos al stock disponible
            if (!isNaN(current) && current < currentStockQty) { 
                quantityInput.value = current + 1;
            } else if (!isNaN(current) && current >= currentStockQty) {
                 toast(`Stock máximo alcanzado (${currentStockQty} unidades).`, 'info');
            }
        });
    }
    if (minusBtn && quantityInput) {
        minusBtn.addEventListener('click', () => {
            let current = parseInt(quantityInput.value);
            if (!isNaN(current) && current > 1) { // Cantidad mínima de 1
                quantityInput.value = current - 1;
            }
        });
    }
    // Aseguramos que el valor inicial sea 1 si existe el input
    if (quantityInput) {
        if (isNaN(parseInt(quantityInput.value)) || parseInt(quantityInput.value) < 1) {
            quantityInput.value = 1;
        }
        // Listener para que no escriban números mayores al stock
        quantityInput.addEventListener('change', (e) => {
             let value = parseInt(e.target.value);
             if (isNaN(value) || value < 1) {
                 e.target.value = 1;
             } else if (value > currentStockQty) {
                 e.target.value = currentStockQty;
                 toast(`Se ajustó la cantidad al stock máximo (${currentStockQty}).`, 'info');
             }
        });
    }

    // 3. Event listener para el botón "Agregar al carrito"
    if (addToCartButton) {
        addToCartButton.addEventListener('click', () => {
            if (!currentProduct) {
                 toast('Esperando la carga del producto. Inténtalo de nuevo.', 'err');
                 return;
            }
            
            // Si no hay input de cantidad (usamos 1 por defecto)
            const quantity = parseInt(quantityInput ? quantityInput.value : 1);
            
            addToCart(currentProduct._id, quantity);
        });
    }
    
    // 4. (Opcional) Buy Now
    const buyNowBtn = $('buyNowBtn');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
             if (!currentProduct) return;
             // Lógica para agregar al carrito e ir directo a checkout
             const quantity = parseInt(quantityInput ? quantityInput.value : 1);
             addToCart(currentProduct._id, quantity);
             window.location.href = '../../detalle_pedido.html'; 
        });
    }
});
// Helper para seleccionar elementos más fácil
const $ = (id) => document.getElementById(id);

// URL de tu servidor de Render (asegúrate de que sea la correcta)
const RENDER_SERVER_URL = 'https://tiendaonlinepdv.onrender.com';

// Función para obtener el ID del producto de la URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id'); // Busca un parámetro 'id' en la URL
}

// Función para mostrar un Toast de mensaje
function toast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || document.createElement('div');
    if (!toastContainer.classList.contains('toast-container')) {
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${type === 'ok' ? 'success' : type === 'err' ? 'danger' : 'info'} border-0`;
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

    const bsToast = new bootstrap.Toast(toastElement);
    bsToast.show();
}


async function fetchProductDetails(productId) {
    try {
        // No enviamos token aquí si las rutas de GET son públicas para los clientes
        const response = await fetch(`${RENDER_SERVER_URL}/api/products/${productId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Producto no encontrado.');
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar el producto.');
        }

        const product = await response.json();
        console.log('Producto cargado:', product);
        displayProductDetails(product);

    } catch (error) {
        console.error('Error al obtener los detalles del producto:', error);
        toast(`No se pudo cargar el producto: ${error.message}`, 'err');
        // Podrías redirigir a una página de error o mostrar un mensaje en la UI
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
        $('productDiscount').style.display = 'inline-block'; // Muestra el badge
    } else {
        $('productOldPrice').style.display = 'none';
        $('productDiscount').style.display = 'none';
    }

    // Stock y disponibilidad
    if (product.stockQty > 0) {
        $('productStock').textContent = `${product.stockQty} unidades en stock`;
        $('addToCartBtn').disabled = false;
        $('buyNowBtn').disabled = false;
    } else {
        $('productStock').textContent = 'Agotado';
        $('productStock').classList.remove('text-success');
        $('productStock').classList.add('text-danger');
        $('addToCartBtn').disabled = true;
        $('buyNowBtn').disabled = true;
    }

    // Imagen principal
    if (product.images && product.images.length > 0) {
        $('productImage').src = product.images[0];
        $('productImage').alt = product.name;

        // Miniaturas (si hay más de una imagen)
        const thumbnailsContainer = $('productThumbnails');
        thumbnailsContainer.innerHTML = ''; // Limpiar miniaturas anteriores
        product.images.forEach((imgUrl, index) => {
            const thumbImg = document.createElement('img');
            thumbImg.src = imgUrl;
            thumbImg.alt = `${product.name} miniatura ${index + 1}`;
            thumbImg.className = 'img-thumbnail rounded mx-1';
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
    } else {
        $('productImage').src = 'https://via.placeholder.com/400?text=Sin+Imagen'; // Imagen por defecto
        $('productImage').alt = 'Producto sin imagen';
    }

    // Detalles adicionales (asumiendo que los guardas en `description` o en un nuevo campo `details`)
    const detailsList = $('productDetailsList');
    detailsList.innerHTML = ''; // Limpiar detalles anteriores
    // Aquí podrías parsear la descripción o si tuvieras un campo 'details' en Mongo
    if (product.description) {
        // Ejemplo básico: Si la descripción tiene líneas, las muestra como lista
        product.description.split('\n').forEach(line => {
            if(line.trim() !== '') {
                const li = document.createElement('li');
                li.textContent = line.trim();
                detailsList.appendChild(li);
            }
        });
    }
    // Puedes agregar más detalles específicos si los tienes en tu modelo de producto
    // Por ejemplo: if(product.material) {$('detailMaterial').textContent = product.material;}
}

// Handlers para el control de cantidad (opcional, puedes mover esto a otro archivo si quieres)
document.addEventListener('DOMContentLoaded', () => {
    const quantityInput = $('productQuantity');
    const plusBtn = $('plusQuantity');
    const minusBtn = $('minusQuantity');

    if (plusBtn) {
        plusBtn.addEventListener('click', () => {
            let current = parseInt(quantityInput.value);
            if (!isNaN(current) && current < product.stockQty) { // Limitar a stock disponible
                quantityInput.value = current + 1;
            }
        });
    }
    if (minusBtn) {
        minusBtn.addEventListener('click', () => {
            let current = parseInt(quantityInput.value);
            if (!isNaN(current) && current > 1) { // Cantidad mínima de 1
                quantityInput.value = current - 1;
            }
        });
    }

    // Cargar detalles del producto al cargar la página
    const productId = getProductIdFromUrl();
    if (productId) {
        fetchProductDetails(productId);
    } else {
        toast('ID de producto no especificado en la URL.', 'err');
        // Podrías redirigir a la página principal o de error
        window.location.href = '../../index.html'; 
    }

    // Event listener para el botón "Agregar al carrito"
    const addToCartButton = $('addToCartBtn');
    if (addToCartButton) {
        addToCartButton.addEventListener('click', () => {
            const productId = getProductIdFromUrl();
            const quantity = parseInt(quantityInput.value);
            if (productId && quantity > 0) {
                // Aquí iría la lógica para agregar al carrito
                // Por ahora, solo un mensaje
                toast(`Agregado ${quantity}x ${$('productName').textContent} al carrito.`, 'ok');
                console.log(`Producto ${productId}, Cantidad: ${quantity} agregados al carrito.`);
            } else {
                toast('No se puede agregar al carrito. Verifica el producto y la cantidad.', 'err');
            }
        });
    }
});
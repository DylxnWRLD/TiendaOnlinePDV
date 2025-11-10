// frontend/cajero/apertura_caja.js - VERSIÓN CORREGIDA PARA USAR SESSIONSTORAGE

// Define la API base URL (¡Ajusta tu URL de Render!)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';


// 2. Inicialización y manejo de formulario
document.addEventListener('DOMContentLoaded', () => {
    // ⭐️ Agregamos una comprobación de redirección si ya está abierto ⭐️
    // ✅ CAMBIO A SESSIONSTORAGE para leer el estado actual de la sesión
    const token = sessionStorage.getItem('supabase-token');
    const corteId = sessionStorage.getItem('currentCorteId'); 
    const role = sessionStorage.getItem('user-role');
    
    // Si ya tienes token, rol y corteId, redirige directamente al PDV.
    if (token && role === 'Cajero' && corteId) {
        document.getElementById('apertura-error').textContent = 'Tienes un turno activo. Redirigiendo...';
        setTimeout(() => {
            window.location.href = './pdv.html'; 
        }, 100); // Redirección rápida
        return;
    }

    const aperturaForm = document.getElementById('aperturaForm');
    // Verificamos que el formulario exista antes de añadir el listener
    if (aperturaForm) {
        aperturaForm.addEventListener('submit', handleAperturaSubmit);
    }
});


async function handleAperturaSubmit(e) {
    e.preventDefault();

    const montoInicialInput = document.getElementById('montoInicial');
    const montoInicial = parseFloat(montoInicialInput.value);
    const errorMessage = document.getElementById('apertura-error');
    errorMessage.textContent = '';

    // ⭐️ CORRECCIÓN: Leemos el token de sessionStorage para consistencia con login.js ⭐️
    const token = sessionStorage.getItem('supabase-token'); // ✅ CAMBIO A SESSIONSTORAGE

    // Validación de entrada
    if (isNaN(montoInicial) || montoInicial < 0) {
        errorMessage.textContent = 'Por favor, ingresa un monto inicial válido.';
        return;
    }

    // Validación de Token (temprana)
    if (!token) {
        errorMessage.textContent = 'Sesión no encontrada. Redirigiendo al login.';
        setTimeout(() => { window.location.href = '../../login/login.html'; }, 1000);
        return;
    }

    const submitButton = document.querySelector('.btn-abrir');
    submitButton.disabled = true;
    submitButton.textContent = 'Abriendo Caja...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/caja/abrir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // ⭐️ CRUCIAL: Usamos el token correcto de sessionStorage ⭐️
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ monto_inicial: montoInicial })
        });

        const data = await response.json();

        // 3. Manejo de Éxito (200) y Conflicto (409)
        if (response.ok || response.status === 409) {
            
            // Si el backend te devuelve un 409, es el error CAJA_ACTIVA_EXISTENTE.
            // El backend DEBE devolver el ID del corte activo en la propiedad 'corteId'.
            if (data.corteId) {
                // ✅ CORRECTO: El corteId SÍ va en sessionStorage para consistencia
                sessionStorage.setItem('currentCorteId', data.corteId); // ✅ CAMBIO A SESSIONSTORAGE
            }

            // Nota: Cambié './cajero.html' a './pdv.html' para ser consistente con el archivo
            const redirectPath = './pdv.html'; 

            const message = response.status === 409
                ? data.message + ' Redirigiendo a tu turno activo.'
                : 'Caja abierta exitosamente. Redirigiendo al PDV...';

            errorMessage.textContent = message;

            setTimeout(() => {
                window.location.href = redirectPath;
            }, response.status === 409 ? 1500 : 500);

        } else if (response.status === 401 || response.status === 403) {
            // 4. Fallo de Seguridad/Autorización (Rechazado por el BACKEND)
            errorMessage.textContent = data.message || 'Sesión inválida o expirada. Redirigiendo al login.';

            // ⭐️⭐️ CORRECCIÓN: Limpia la sesión de sessionStorage ⭐️⭐️
            sessionStorage.removeItem('supabase-token'); // ✅ CAMBIO A SESSIONSTORAGE
            sessionStorage.removeItem('user-role'); // ✅ CAMBIO A SESSIONSTORAGE
            sessionStorage.removeItem('currentCorteId'); // ✅ CAMBIO A SESSIONSTORAGE

            setTimeout(() => {
                window.location.href = '../../login/login.html';
            }, 1000);

        } else {
            // 5. Manejo de otros errores (400, 500, etc.)
            errorMessage.textContent = data.message || `Error (${response.status}) al abrir la caja.`;
        }
    } catch (error) {
        // Error de red
        errorMessage.textContent = 'Error de conexión con el servidor. Verifica tu red.';
        console.error('Error al abrir caja:', error);
    } finally {
        // Restaura el botón al estado inicial (sin importar si hubo éxito o fallo)
        submitButton.disabled = false;
        submitButton.textContent = 'Abrir Caja';
    }
}
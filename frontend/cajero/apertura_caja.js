// cajero/apertura_caja.js

// Define la API base URL (¡Ajusta tus URLs de entorno!)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';

const token = localStorage.getItem('sessionToken');
const role = localStorage.getItem('userRole');

// 1. Verificar Sesión y Rol (Cajero) - RESTAURADA
function checkAuthentication() {
    if (!token || role !== 'Cajero') {
        alert('Acceso no autorizado o sesión expirada. Redirigiendo al login.');
        // Ruta relativa: Subir dos niveles (cajero/ -> login/)
        window.location.href = '../../login/login.html'; 
        // 🛑 Importante: Detener la ejecución si la autenticación falla
        throw new Error("No autenticado. Redirigido a login.");
    }
}

// 2. Inicialización y manejo de formulario
document.addEventListener('DOMContentLoaded', () => {
    try {
        checkAuthentication(); // Ahora esto es seguro de llamar

        const aperturaForm = document.getElementById('aperturaForm');
        aperturaForm.addEventListener('submit', handleAperturaSubmit);
    } catch (e) {
        // Ignora el error de 'No autenticado' ya que la redirección lo maneja
        if (e.message !== "No autenticado. Redirigido a login.") {
            console.error(e);
        }
    }
});


async function handleAperturaSubmit(e) {
    e.preventDefault();

    const montoInicialInput = document.getElementById('montoInicial');
    const montoInicial = parseFloat(montoInicialInput.value);
    const errorMessage = document.getElementById('apertura-error');
    errorMessage.textContent = '';
    
    // ... (Validación) ...

    const submitButton = document.querySelector('.btn-abrir');
    submitButton.disabled = true;
    submitButton.textContent = 'Abriendo Caja...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/caja/abrir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ monto_inicial: montoInicial })
        });

        const data = await response.json();

        if (response.ok || response.status === 409) {
            // Maneja Éxito (200) y Conflicto (409)
            if (data.corteId) {
                localStorage.setItem('currentCorteId', data.corteId);
            }
            
            const redirectPath = 'cajero.html'; // ⬅️ Usamos pdv.html (o el nombre correcto)

            const message = response.status === 409
                ? data.message + ' Redirigiendo a tu turno activo.'
                : 'Caja abierta exitosamente. Redirigiendo al PDV...';
            
            errorMessage.textContent = message;

            setTimeout(() => {
                window.location.href = redirectPath; 
            }, response.status === 409 ? 1500 : 500);

        } else {
            // 5. Manejo de otros errores (400, 500, etc.)
            errorMessage.textContent = data.message || `Error (${response.status}) al abrir la caja.`;
        }
    } catch (error) {
        // 🛑 IMPORTANTE: Si la conexión falla (catch), el botón se debe restaurar
        errorMessage.textContent = 'Error de conexión con el servidor. Verifica tu red.';
        console.error('Error al abrir caja:', error);
    } finally {
        // ⭐️ ESTE BLOQUE ES CRUCIAL: Se ejecuta siempre, asegurando que el botón se libere ⭐️
        submitButton.disabled = false;
        submitButton.textContent = 'Abrir Caja';
    }
}
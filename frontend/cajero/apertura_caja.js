// cajero/apertura_caja.js

// Define la API base URL (¡Ajusta tu URL de Render!)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';


// 1. Verificar Sesión y Rol (Cajero) - CORREGIDA
function checkAuthentication() {
    // ⭐️ CORRECCIÓN: Leemos localStorage AQUÍ para obtener el valor más reciente ⭐️
    const token = localStorage.getItem('sessionToken');
    const role = localStorage.getItem('userRole');
    
    if (!token || role !== 'Cajero') {
        alert('Acceso no autorizado o sesión expirada. Redirigiendo al login.');
        // Ruta relativa: Sube dos niveles (cajero/ -> login/)
        window.location.href = '../../login/login.html'; 
        throw new Error("No autenticado. Redirigido a login.");
    }
}


// 2. Inicialización y manejo de formulario
document.addEventListener('DOMContentLoaded', () => {
    try {
        checkAuthentication(); // Esto ahora es seguro y usa datos frescos

        const aperturaForm = document.getElementById('aperturaForm');
        aperturaForm.addEventListener('submit', handleAperturaSubmit);
    } catch (e) {
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
    
    // ⭐️ RELECTURA DE TOKEN Y ROL AQUÍ (NECESARIO PARA EL ENCABEZADO) ⭐️
    const token = localStorage.getItem('sessionToken');
    
    // VALIDACIÓN PENDIENTE: Puedes añadir tu lógica de 'if (isNaN...)' aquí.
    if (isNaN(montoInicial) || montoInicial < 0) {
        errorMessage.textContent = 'Por favor, ingresa un monto inicial válido.';
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
                // ⭐️ CRUCIAL: Usar el token re-leído o asegurarnos de que la variable global exista ⭐️
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
            
            // Asumiendo que 'cajero.html' es tu PDV
            const redirectPath = './cajero.html'; 

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
        // Error de red
        errorMessage.textContent = 'Error de conexión con el servidor. Verifica tu red.';
        console.error('Error al abrir caja:', error);
    } finally {
        // Este bloque es crucial para restaurar el botón
        submitButton.disabled = false;
        submitButton.textContent = 'Abrir Caja';
    }
}
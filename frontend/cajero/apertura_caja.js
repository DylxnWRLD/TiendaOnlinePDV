const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000' // <-- Usar 127.0.0.1 para que el origen coincida con el servidor Express
    : 'https://tiendaonlinepdv.onrender.com';
const token = localStorage.getItem('sessionToken');
const role = localStorage.getItem('userRole');


/*
// 1. Verificar Sesión y Rol (Cajero)
function checkAuthentication() {
    if (!token || role !== 'Cajero') {
        alert('Acceso no autorizado o sesión expirada. Redirigiendo al login.');
        // Subir dos niveles (cajero/ -> login/)
        window.location.href = '../login/login.html';
    }
}
*/

// 2. Manejar el envío del formulario
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();

    const aperturaForm = document.getElementById('aperturaForm');
    aperturaForm.addEventListener('submit', handleAperturaSubmit);
});


async function handleAperturaSubmit(e) {
    e.preventDefault();

    const montoInicialInput = document.getElementById('montoInicial');
    const montoInicial = parseFloat(montoInicialInput.value);
    const errorMessage = document.getElementById('apertura-error');
    errorMessage.textContent = '';

    // Validación básica en el cliente
    if (isNaN(montoInicial) || montoInicial < 0) {
        errorMessage.textContent = 'Por favor, ingresa un monto inicial válido (cero o positivo).';
        return;
    }

    // Deshabilitar botón para evitar envíos dobles
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

        if (response.ok) {
            // Éxito: Guardamos el ID del corte para usarlo en el PDV
            localStorage.setItem('currentCorteId', data.corteId);
            errorMessage.textContent = 'Caja abierta exitosamente. Redirigiendo al PDV...';

            // Redirigir a la pantalla principal del cajero (PDV) en la misma carpeta
            setTimeout(() => {
                window.location.href = 'cajero.html';
            }, 500);

        } else {
            // El error 409 (Conflict) es importante si la caja ya estaba abierta
            errorMessage.textContent = data.message || `Error (${response.status}) al abrir la caja.`;
            submitButton.disabled = false;
            submitButton.textContent = '💰 Abrir Caja y Empezar';
        }
    } catch (error) {
        errorMessage.textContent = 'Error de conexión con el servidor. Verifica tu red.';
        console.error('Error al abrir caja:', error);
        submitButton.disabled = false;
        submitButton.textContent = '💰 Abrir Caja y Empezar';
    }
}
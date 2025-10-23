// cajero/apertura_caja.js

// Define la API base URL (¡Ajusta tus URLs de entorno!)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

const token = localStorage.getItem('sessionToken');
const role = localStorage.getItem('userRole');

/*
// 1. Verificar Sesión y Rol (Cajero)
function checkAuthentication() {
    if (!token || role !== 'Cajero') {
        alert('Acceso no autorizado o sesión expirada. Redirigiendo al login.');
        // Ruta relativa: Subir dos niveles (cajero/ -> login/)
        window.location.href = '../../login/login.html'; 
    }
}
*/

// 2. Inicialización y manejo de formulario
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

    // Validación
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
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ monto_inicial: montoInicial })
        });

        const data = await response.json();

        if (response.ok) {
            // 3. Éxito: Guardamos el ID del corte y redirigimos
            localStorage.setItem('currentCorteId', data.corteId);
            errorMessage.textContent = 'Caja abierta exitosamente. Redirigiendo al PDV...';

            setTimeout(() => {
                window.location.href = 'cajero.html'; // Redirige a la pantalla principal del cajero
            }, 500);

        } else if (response.status === 409) {
            // 4. Manejo de Conflicto (Caja ya abierta)
            // Usamos el ID de corte devuelto por el servidor
            if (data.corteId) {
                localStorage.setItem('currentCorteId', data.corteId);
            }
            errorMessage.textContent = data.message + ' Redirigiendo a tu turno activo.';
            
            setTimeout(() => {
                window.location.href = 'cajero.html'; 
            }, 1500);
            
        } else {
            // 5. Manejo de otros errores (400, 500, etc.)
            errorMessage.textContent = data.message || `Error (${response.status}) al abrir la caja.`;
            submitButton.disabled = false;
            submitButton.textContent = 'Abrir Caja';
        }
    } catch (error) {
        errorMessage.textContent = 'Error de conexión con el servidor. Verifica tu red.';
        console.error('Error al abrir caja:', error);
        submitButton.disabled = false;
        submitButton.textContent = 'Abrir Caja';
    }
}
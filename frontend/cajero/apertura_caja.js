// frontend/cajero/apertura_caja.js

// Define la API base URL (¡Ajusta tu URL de Render!)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv-hm20.onrender.com';


// 2. Inicialización y manejo de formulario
document.addEventListener('DOMContentLoaded', () => {
    // ⭐️ CORRECCIÓN CLAVE: Eliminamos el try/catch y la llamada a checkAuthentication() ⭐️
    // La función ya no existe, y si el token es inválido, el fetch lo manejará.
    
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
    
    // ⭐️ CORRECCIÓN: Leemos la clave de token que tu login escribe ⭐️
    const token = localStorage.getItem('supabase-token');
    
    // Validación de entrada
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
                // ⭐️ CRUCIAL: Usamos la clave 'supabase-token' ⭐️
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ monto_inicial: montoInicial })
        });

        const data = await response.json();

        // 3. Manejo de Éxito (200) y Conflicto (409)
        if (response.ok || response.status === 409) {
            
            if (data.corteId) {
                localStorage.setItem('currentCorteId', data.corteId);
            }
            
            const redirectPath = './cajero.html'; 

            const message = response.status === 409
                ? data.message + ' Redirigiendo a tu turno activo.'
                : 'Caja abierta exitosamente. Redirigiendo al PDV...';
            
            errorMessage.textContent = message;

            setTimeout(() => {
                window.location.href = redirectPath; 
            }, response.status === 409 ? 1500 : 500);

        } else if (response.status === 401 || response.status === 403) {
            // 4. Fallo de Seguridad/Autorización (Rechazado por el BACKEND)
            // Esto ocurre si el token es inválido o si el role_id no es 3.
            errorMessage.textContent = 'Sesión inválida o expirada. Redirigiendo al login.';
            // Limpia la sesión y redirige
            localStorage.removeItem('supabase-token');
            localStorage.removeItem('user-role');
            
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
// login.js - Versión Final con Solución de Conflicto de Origen (CORS)

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    const username = usernameInput.value; // Contiene el correo electrónico
    const password = passwordInput.value;

    errorMessage.textContent = '';

    // =========================================================================
    // 1. CONFIGURACIÓN DE URL DINÁMICA Y CORRECCIÓN DE CORS LOCAL
    // =========================================================================

    // **La CORRECCIÓN: Usar 127.0.0.1:3000 para el entorno local para resolver conflictos de origen con Express.**
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000' // <-- Usar 127.0.0.1 para que el origen coincida con el servidor Express
        : 'https://tiendaonlinepdv-hm20.onrender.com';

    try {
        // Usa la URL base dinámica para el fetch
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 1. Guardar el token de sesión (JWT)
            localStorage.setItem('supabase-token', data.token);

            // 2. Redirigir basado en el rol
            const userRole = data.role;

            localStorage.setItem('user-email', username); // Guarda el email
            localStorage.setItem('user-role', data.role); // Guarda el rol

            // =========================================================================
            // 2. RUTAS DE REDIRECCIÓN (Consistentes)
            // =========================================================================

            // Asumiendo que TODAS las páginas de destino están en sus propias subcarpetas
            switch (userRole) {
                case 'Admin':
                    window.location.href = '../admin/admin.html';
                    break;
                case 'Cajero':
                    window.location.href = '../cajero/apertura_caja.html';
                    break;
                case 'AdminInventario':
                    window.location.href = '../admin_inv/admininv.html'; // Corregida a formato consistente
                    break;
                case 'Repartidor':
                    // ⭐️ Nueva ruta para el Repartidor ⭐️
                    window.location.href = '../repartidor/repartidor.html';
                    break;
                case 'Cliente':
                default:
                    window.location.href = '../../index.html'; // Se asume esta ruta para clientes generales
                    break;
            }

        } else {
            errorMessage.textContent = data.message || 'Error desconocido al iniciar sesión.';
        }

    } catch (error) {
        console.error('Error de red:', error);
        errorMessage.textContent = 'No se pudo conectar con el servidor. Verifique la conexión.';
    }
});
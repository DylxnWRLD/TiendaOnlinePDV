// login.js - Adaptado para Local y Producción

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    const username = usernameInput.value; // Contiene el correo electrónico
    const password = passwordInput.value;

    errorMessage.textContent = '';
    
    // =========================================================================
    // 1. CONFIGURACIÓN DE URL DINÁMICA (Corrección para Render)
    // =========================================================================
    
    // Determina la URL base. Usa localhost:3000 si está en desarrollo.
    // **REEMPLAZA 'https://TU-URL-DE-RENDER.onrender.com' con tu URL real antes de hacer push a Render.**
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://tiendaonlinepdv.onrender.com'; 

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

            // =========================================================================
            // 2. RUTAS DE REDIRECCIÓN CORREGIDAS (Ajustadas a tu estructura de carpetas)
            // =========================================================================
            
            // Asumiendo /frontend/login/login.html -> ../ para subir un nivel
            switch (userRole) {
                case 'Admin':
                    window.location.href = '../admin/admin.html';
                    break;
                case 'Cajero':
                    window.location.href = '../cajero/cajero.html';
                    break;
                case 'AdminInventario':
                    // Asumiendo que esta carpeta SÍ está en /frontend/adminInventario/adminInventario.html
                    window.location.href = '../adminInventario/adminInventario.html';
                    break;
                case 'Cliente':
                default:
                    window.location.href = '../cliente/cliente.html';
                    break;
            }

        } else {
            // Muestra el mensaje de error del backend (e.g., "Usuario o contraseña inválidos.")
            errorMessage.textContent = data.message || 'Error desconocido al iniciar sesión.';
        }

    } catch (error) {
        // Este error solo debe activarse si hay un fallo de red o el servidor está caído.
        console.error('Error de red:', error);
        errorMessage.textContent = 'No se pudo conectar con el servidor. Verifique que el servidor Node.js esté activo.';
    }
});
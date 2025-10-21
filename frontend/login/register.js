// register.js - Manejo del registro de usuarios
document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1. Obtener los valores del formulario
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';

    // ------------------------------------------------------------------
    // ⬇️ NUEVA VALIDACIÓN DE SEGURIDAD DE CONTRASEÑA ⬇️
    // ------------------------------------------------------------------

    const MIN_LENGTH = 8; // Mínimo de 8 caracteres
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`]).{8,}$/;

    if (password.length < MIN_LENGTH) {
        errorMessage.textContent = 'La contraseña debe tener al menos 8 caracteres.';
        return;
    }
    
    if (!passwordRegex.test(password)) {
        errorMessage.textContent = 'La contraseña debe incluir al menos una mayúscula, un número y un carácter especial (ej: !@#$).';
        return;
    }

    // ------------------------------------------------------------------
    // ⬆️ FIN DE LA VALIDACIÓN ⬆️
    // ------------------------------------------------------------------

    // 2. Definición de la URL base de la API (sin cambios)
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

    try {
        // 3. Petición al servidor
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        // ... resto del código ...
        const data = await response.json();

        if (response.ok) {
            alert('✅ Registro exitoso. Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        } else {
            errorMessage.textContent = data.message || 'Error al registrar usuario.';
        }
    } catch (error) {
        console.error('Error de red:', error);
        errorMessage.textContent = 'No se pudo conectar con el servidor.';
    }
});
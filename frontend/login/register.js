// register.js - Manejo del registro de usuarios
document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1. Obtener los valores del formulario (solo username y password)
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';

    // 2. Definición de la URL base de la API (sin cambios)
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

    try {
        // 3. Petición al servidor (con solo username y password en el body)
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // ¡IMPORTANTE! Aquí se elimina 'role' del objeto JSON
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        // 4. Manejo de la respuesta
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
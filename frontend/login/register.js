// register.js - Manejo del registro de usuarios
document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role }),
        });

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

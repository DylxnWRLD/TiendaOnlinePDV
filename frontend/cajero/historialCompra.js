const $ = (id) => document.getElementById(id); // Utilidad para simplificar
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://tiendaonlinepdv.onrender.com';

const RPC_ENDPOINT_URL = `${API_BASE_URL}/api/rpc/procesar_compra_online`;
const CLIENTE_DATA_URL = `${API_BASE_URL}/api/historial_compras`;

//
async function cargarHistorial() {
    const tbody = document.getElementById('historial-body');
    tbody.innerHTML = '<tr><td colspan="10">Cargando historial de compras...</td></tr>';

    try {
        // 1. Llamar al servidor para obtener los datos JOIN
        const respuesta = await fetch(URL_API);

        if (!respuesta.ok) {
            throw new Error(`Error al cargar datos del servidor: ${respuesta.status}`);
        }

        const compras = await respuesta.json(); // Los datos combinados llegan como un array de objetos

        tbody.innerHTML = ''; // Limpiar el mensaje de carga

        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">No hay registros de ventas.</td></tr>';
            return;
        }

        // 2. Recorrer los datos y agregar filas a la tabla
        compras.forEach(compra => {
            const row = tbody.insertRow();
            
            // 💡 NOTA: Los nombres de propiedad deben coincidir con tus alias SQL (v1.nombre_producto, v2.ticket_numero, etc.)
            
            row.insertCell().textContent = compra.nombre_producto;
            row.insertCell().textContent = compra.ticket_numero;
            row.insertCell().textContent = compra.cantidad;
            row.insertCell().textContent = new Date(compra.fecha_hora).toLocaleString();
            row.insertCell().textContent = `$${compra.precio_unitario_venta.toFixed(2)}`;
            row.insertCell().textContent = `$${compra.total_descuento.toFixed(2)}`;
            row.insertCell().textContent = `$${compra.monto_descuento.toFixed(2)}`;
            row.insertCell().textContent = `$${compra.total_final.toFixed(2)}`;
            row.insertCell().textContent = `$${compra.total_linea.toFixed(2)}`;
            row.insertCell().textContent = compra.metodo_pago;
        });

    } catch (error) {
        console.error('Error en el frontend:', error);
        tbody.innerHTML = `<tr><td colspan="10" style="color: red;">¡Error de conexión o datos! ${error.message}</td></tr>`;
    }
}

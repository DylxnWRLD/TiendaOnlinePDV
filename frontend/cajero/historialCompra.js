// ==========================================
// 🔹 CONFIGURACIÓN
// ==========================================
const $ = (id) => document.getElementById(id);

const API_BASE_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

const CLIENTE_DATA_URL = `${API_BASE_URL}/api/historial_compras`;


// ==========================================
// 🔹 VARIABLES GLOBALES
// ==========================================
let datosOriginales = [];
let paginaActual = 1;
const registrosPorPagina = 10;


// ==========================================
// 🔹 CARGAR HISTORIAL COMPLETO
// ==========================================
async function cargarHistorial() {
    const tbody = $('tablaHistorial');
    const message = $('loading-message');

    tbody.innerHTML = '';
    message.textContent = "Cargando historial...";

    try {
        const respuesta = await fetch(CLIENTE_DATA_URL);
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);

        const compras = await respuesta.json();
        datosOriginales = compras;

        message.style.display = "none";

        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">No hay registros de ventas.</td></tr>';
            return;
        }

        mostrarPagina(paginaActual);
        generarControlesPaginacion();

    } catch (error) {
        console.error('Error en historial frontend:', error);
        message.textContent = `Error al conectar con el servidor: ${error.message}`;
    }
}


// ==========================================
// 🔹 MOSTRAR TABLA POR PÁGINA
// ==========================================
function mostrarPagina(numPagina) {
    const tbody = $('tablaHistorial');
    tbody.innerHTML = '';

    const inicio = (numPagina - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const datosPagina = datosOriginales.slice(inicio, fin);

    const safeFixed = (value) => Number(value || 0).toFixed(2);

    datosPagina.forEach((compra) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = compra.nombre_producto;
        row.insertCell().textContent = compra.ticket_numero;
        row.insertCell().textContent = compra.cantidad;
        row.insertCell().textContent = new Date(compra.fecha_hora).toLocaleString();
        row.insertCell().textContent = `$${safeFixed(compra.precio_unitario_venta)}`;
        row.insertCell().textContent = `$${safeFixed(compra.total_descuento)}`;
        row.insertCell().textContent = `$${safeFixed(compra.monto_descuento)}`;
        row.insertCell().textContent = `$${safeFixed(compra.total_final)}`;
        row.insertCell().textContent = `$${safeFixed(compra.total_linea)}`;
        row.insertCell().textContent = compra.metodo_pago;
    });

    actualizarEstadoBotones();
}


// ==========================================
// 🔹 PAGINACIÓN
// ==========================================
function generarControlesPaginacion() {
    const totalPaginas = Math.ceil(datosOriginales.length / registrosPorPagina);
    const contenedor = $('paginacion');
    contenedor.innerHTML = '';

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = '← Anterior';
    btnAnterior.classList.add('btn-paginacion');
    btnAnterior.addEventListener('click', () => cambiarPagina(-1));

    const indicador = document.createElement('span');
    indicador.id = 'indicadorPagina';
    indicador.style.margin = '0 10px';
    indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    const btnSiguiente = document.createElement('button');
    btnSiguiente.textContent = 'Siguiente →';
    btnSiguiente.classList.add('btn-paginacion');
    btnSiguiente.addEventListener('click', () => cambiarPagina(1));

    contenedor.appendChild(btnAnterior);
    contenedor.appendChild(indicador);
    contenedor.appendChild(btnSiguiente);
}

function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(datosOriginales.length / registrosPorPagina);
    paginaActual += direccion;

    if (paginaActual < 1) paginaActual = 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    mostrarPagina(paginaActual);
    actualizarEstadoBotones();
}

function actualizarEstadoBotones() {
    const totalPaginas = Math.ceil(datosOriginales.length / registrosPorPagina);
    const indicador = $('indicadorPagina');
    if (indicador) indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;
}


// ==========================================
// 🔹 FILTRO DE BÚSQUEDA
// ==========================================
function filtrarHistorial() {
    const texto = $('busquedaProducto').value.toLowerCase();
    const fecha = $('busquedaFecha').value;

    const filtrados = datosOriginales.filter((item) => {
        const coincideProducto = item.nombre_producto.toLowerCase().includes(texto);
        const coincideFecha = fecha ? item.fecha_hora.startsWith(fecha) : true;
        return coincideProducto && coincideFecha;
    });

    if (filtrados.length === 0) {
        $('tablaHistorial').innerHTML = '<tr><td colspan="10">Sin coincidencias.</td></tr>';
        $('paginacion').innerHTML = '';
        return;
    }

    datosOriginales = filtrados;
    paginaActual = 1;
    mostrarPagina(paginaActual);
    generarControlesPaginacion();
}


// ==========================================
// 🔹 EVENTOS
// ==========================================
$('btnBuscar').addEventListener('click', filtrarHistorial);

$('btnLimpiar').addEventListener('click', () => {
    $('busquedaProducto').value = '';
    $('busquedaFecha').value = '';
    cargarHistorial();
});

$('busquedaProducto').addEventListener('input', filtrarHistorial);
$('busquedaFecha').addEventListener('change', filtrarHistorial);


// ==========================================
// 🔹 BOTÓN REGRESAR
// ==========================================
document.getElementById('btnRegresar').addEventListener('click', () => {
    window.location.href = 'cajero.html';
});


// ==========================================
// 🔹 INICIAR
// ==========================================
cargarHistorial();

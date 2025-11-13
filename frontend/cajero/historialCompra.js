const $ = (id) => document.getElementById(id);
const API_BASE_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

const RPC_ENDPOINT_URL = `${API_BASE_URL}/api/rpc/procesar_compra_online`;
const CLIENTE_DATA_URL = `${API_BASE_URL}/api/historial_compras`;

// --------------------------------
// 🔹 Variables globales
// --------------------------------
let datosOriginales = [];
let paginaActual = 1;
const registrosPorPagina = 10;

// --------------------------------
// 🔹 Cargar historial completo
// --------------------------------
async function cargarHistorial() {
    const tbody = $('tablaHistorial');
    tbody.innerHTML = '<tr><td colspan="10">Cargando historial de compras...</td></tr>';

    try {
        const respuesta = await fetch(URL_API);
        if (!respuesta.ok) throw new Error(`Error al cargar datos del servidor: ${respuesta.status}`);

        const compras = await respuesta.json();
        datosOriginales = compras;

        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">No hay registros de ventas.</td></tr>';
            return;
        }

        mostrarPagina(paginaActual);
        generarControlesPaginacion();

    } catch (error) {
        console.error('Error en el frontend:', error);
        tbody.innerHTML = `<tr><td colspan="10" style="color: red;">Error al conectar con el servidor: ${error.message}</td></tr>`;
    }
}

// --------------------------------
// 🔹 Mostrar tabla por página
// --------------------------------
function mostrarPagina(numPagina) {
    const tbody = $('tablaHistorial');
    tbody.innerHTML = '';

    const inicio = (numPagina - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const datosPagina = datosOriginales.slice(inicio, fin);

    datosPagina.forEach((compra) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = compra.nombre_producto;
        row.insertCell().textContent = compra.ticket_numero;
        row.insertCell().textContent = compra.cantidad;
        row.insertCell().textContent = new Date(compra.fecha_hora).toLocaleString();
        row.insertCell().textContent = `$${Number(compra.precio_unitario_venta).toFixed(2)}`;
        row.insertCell().textContent = `$${Number(compra.total_descuento).toFixed(2)}`;
        row.insertCell().textContent = `$${Number(compra.monto_descuento).toFixed(2)}`;
        row.insertCell().textContent = `$${Number(compra.total_final).toFixed(2)}`;
        row.insertCell().textContent = `$${Number(compra.total_linea).toFixed(2)}`;
        row.insertCell().textContent = compra.metodo_pago;
    });

    actualizarEstadoBotones();
}

// --------------------------------
// 🔹 Generar controles de paginación
// --------------------------------
function generarControlesPaginacion() {
    const totalPaginas = Math.ceil(datosOriginales.length / registrosPorPagina);
    const contenedor = $('paginacion');
    contenedor.innerHTML = '';

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = '← Anterior';
    btnAnterior.classList.add('btn-paginacion');
    btnAnterior.addEventListener('click', () => cambiarPagina(-1));
    contenedor.appendChild(btnAnterior);

    const indicador = document.createElement('span');
    indicador.id = 'indicadorPagina';
    indicador.style.margin = '0 10px';
    indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    contenedor.appendChild(indicador);

    const btnSiguiente = document.createElement('button');
    btnSiguiente.textContent = 'Siguiente →';
    btnSiguiente.classList.add('btn-paginacion');
    btnSiguiente.addEventListener('click', () => cambiarPagina(1));
    contenedor.appendChild(btnSiguiente);

    actualizarEstadoBotones();
}

// --------------------------------
// 🔹 Cambiar de página
// --------------------------------
function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(datosOriginales.length / registrosPorPagina);
    paginaActual += direccion;

    if (paginaActual < 1) paginaActual = 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    mostrarPagina(paginaActual);
    actualizarEstadoBotones();
}

// --------------------------------
// 🔹 Actualizar botones
// --------------------------------
function actualizarEstadoBotones() {
    const totalPaginas = Math.ceil(datosOriginales.length / registrosPorPagina);
    const indicador = $('indicadorPagina');
    if (indicador) indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;
}

// --------------------------------
// 🔹 Filtro de búsqueda
// --------------------------------
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

// --------------------------------
// 🔹 Eventos
// --------------------------------
$('btnBuscar').addEventListener('click', filtrarHistorial);
$('btnLimpiar').addEventListener('click', () => {
    $('busquedaProducto').value = '';
    $('busquedaFecha').value = '';
    cargarHistorial(); // vuelve a cargar todo
});

$('busquedaProducto').addEventListener('input', filtrarHistorial);
$('busquedaFecha').addEventListener('change', filtrarHistorial);

// --------------------------------
// 🔹 Ejecutar al cargar
// --------------------------------
cargarHistorial();

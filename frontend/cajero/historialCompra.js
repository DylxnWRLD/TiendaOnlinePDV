const $ = (id) => document.getElementById(id);

const API_BASE_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

const CLIENTE_DATA_URL = `${API_BASE_URL}/api/historial_compras`;

// ⭐️ VARIABLES MAESTRAS (NUNCA SE MODIFICAN)
let datosMaestros = []; 
// ⭐️ VARIABLES DE PAGINACIÓN Y FILTRADO (SE MODIFICAN)
let datosFiltrados = []; 
let paginaActual = 1;
const registrosPorPagina = 10;

async function cargarHistorial() {
    const tbody = $('tablaHistorial');
    const message = $('loading-message');

    tbody.innerHTML = '';
    message.textContent = "Cargando historial...";
    message.style.display = "block"; // Asegurar que el mensaje de carga sea visible

    try {
        const respuesta = await fetch(CLIENTE_DATA_URL);
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);

        const compras = await respuesta.json();
        
        // 🛑 CAMBIO CLAVE: Asigna a la copia maestra
        datosMaestros = compras; 
        
        // Inicializa el arreglo filtrado con todos los datos
        datosFiltrados = compras; 

        message.style.display = "none";

        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">No hay registros de ventas.</td></tr>';
            return;
        }

        // Ya no es necesario llamar a filtrarHistorial aquí,
        // ya que datosFiltrados es una copia de todos los datos.
        mostrarPagina(paginaActual);
        generarControlesPaginacion();

    } catch (error) {
        console.error('Error en historial frontend:', error);
        message.textContent = `Error al conectar con el servidor: ${error.message}`;
    }
}

function mostrarPagina(numPagina) {
    const tbody = $('tablaHistorial');
    tbody.innerHTML = '';

    const inicio = (numPagina - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    // 🛑 USAMOS datosFiltrados
    const datosPagina = datosFiltrados.slice(inicio, fin); 

    // Función de manejo seguro de números
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

function generarControlesPaginacion() {
    // 🛑 USAMOS datosFiltrados.length
    const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
    const contenedor = $('paginacion');
    contenedor.innerHTML = '';
    
    // Si solo hay una página, no mostrar controles
    if (totalPaginas <= 1) return;

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
    // 🛑 USAMOS datosFiltrados.length
    const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
    paginaActual += direccion;

    if (paginaActual < 1) paginaActual = 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    mostrarPagina(paginaActual);
    actualizarEstadoBotones();
}

function actualizarEstadoBotones() {
    // 🛑 USAMOS datosFiltrados.length
    const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
    const indicador = $('indicadorPagina');
    
    if (indicador) {
        indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;

        const btnAnterior = document.querySelector('#paginacion button:nth-child(1)');
        const btnSiguiente = document.querySelector('#paginacion button:nth-child(3)');

        if (btnAnterior) btnAnterior.disabled = paginaActual === 1;
        if (btnSiguiente) btnSiguiente.disabled = paginaActual === totalPaginas;
    }
}

function filtrarHistorial() {
    const texto = $('busquedaProducto').value.toLowerCase();
    const fecha = $('busquedaFecha').value;

    // 🛑 CAMBIO CLAVE: Filtra sobre la copia MAESTRA (datosMaestros)
    const filtrados = datosMaestros.filter((item) => {
        const coincideProducto = item.nombre_producto.toLowerCase().includes(texto);
        // La fecha de item.fecha_hora es un ISO String, comparamos el inicio (YYYY-MM-DD)
        const coincideFecha = fecha ? item.fecha_hora.startsWith(fecha) : true;
        return coincideProducto && coincideFecha;
    });

    // 🛑 Asigna a datosFiltrados
    datosFiltrados = filtrados; 
    
    if (datosFiltrados.length === 0) {
        $('tablaHistorial').innerHTML = '<tr><td colspan="10">Sin coincidencias.</td></tr>';
        $('paginacion').innerHTML = '';
        return;
    }

    paginaActual = 1;
    mostrarPagina(paginaActual);
    generarControlesPaginacion();
}

// ⭐️ ASIGNACIÓN DE EVENTOS ⭐️
$('btnBuscar').addEventListener('click', () => {
    paginaActual = 1; // Reinicia la página al buscar
    filtrarHistorial();
});

$('btnLimpiar').addEventListener('click', () => {
    $('busquedaProducto').value = '';
    $('busquedaFecha').value = '';
    
    // Al limpiar, volvemos a la copia maestra sin recargar del servidor
    datosFiltrados = datosMaestros; 
    
    if (datosFiltrados.length === 0) {
        $('tablaHistorial').innerHTML = '<tr><td colspan="10">No hay registros de ventas.</td></tr>';
        $('paginacion').innerHTML = '';
        return;
    }

    paginaActual = 1;
    mostrarPagina(paginaActual);
    generarControlesPaginacion();
});

// Nota: Eliminamos los listeners 'input' y 'change' para evitar que se ejecuten inmediatamente
// al cargar la página si el navegador persiste los valores, dejando solo el botón Buscar/Limpiar.

document.getElementById('btnRegresar').addEventListener('click', () => {
    window.location.href = 'cajero.html';
});

// ⭐️ INICIO DE LA APLICACIÓN ⭐️
cargarHistorial();
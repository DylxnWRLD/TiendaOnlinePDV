const $ = (id) => document.getElementById(id);

const API_BASE_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3000'
        : 'https://tiendaonlinepdv.onrender.com';

// 🛑 CORRECCIÓN 1
const CLIENTE_DATA_URL = `${API_BASE_URL}/api/historial_compras`;

// ⭐ VARIABLES MAESTRAS
let datosMaestros = [];
// ⭐ VARIABLES DE VISTA
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 10;

async function cargarHistorial() {
    const tbody = $('tablaHistorial');
    const message = $('loading-message');

    if (tbody) tbody.innerHTML = '';
    if (message) {
        message.textContent = "Cargando historial...";
        message.style.display = "block";
    }

    try {
        const respuesta = await fetch(CLIENTE_DATA_URL);

        if (!respuesta.ok) {
            // 🛑 CORRECCIÓN 2
            throw new Error(`Error del servidor: ${respuesta.status}`);
        }

        const rawData = await respuesta.json();

        // 🛑 ADAPTADOR DE DATOS (MAPPING)
        const comprasNormalizadas = rawData.map(item => ({
            nombre_producto: item.nombre_producto || 'Desconocido',
            ticket_numero: item.ticket || item.ticket_numero || 'S/N',
            cantidad: item.cantidad || 0,
            fecha_hora: item.fecha || item.fecha_hora || new Date().toISOString(),
            precio_unitario_venta: item.precio_unitario || item.precio_unitario_venta || 0,
            total_descuento: item.total_descuento || 0, // Descuento global del ticket
            monto_descuento: item.monto_descuento_linea || item.monto_descuento || 0, // Descuento de la línea
            total_final: item.total_venta || item.total_final || 0,
            total_linea: item.total_linea || 0,
            metodo_pago: item.metodo_pago || 'Efectivo'
        }));

        // Guardamos los datos ya limpios y estandarizados
        datosMaestros = comprasNormalizadas;
        datosFiltrados = comprasNormalizadas;

        if (message) message.style.display = "none";

        if (datosMaestros.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px;">No hay registros de ventas disponibles.</td></tr>';
            return;
        }

        mostrarPagina(paginaActual);
        generarControlesPaginacion();

    } catch (error) {
        console.error('Error en historial frontend:', error);
        if (message) {
            // 🛑 CORRECCIÓN 3
            message.textContent = `Error: ${error.message}`;
            message.style.color = "red";
        }
    }
}

function mostrarPagina(numPagina) {
    const tbody = $('tablaHistorial');
    if (!tbody) return;

    tbody.innerHTML = '';

    const inicio = (numPagina - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const datosPagina = datosFiltrados.slice(inicio, fin);

    const safeFixed = (value) => Number(value || 0).toFixed(2);
    const formatearFecha = (fechaISO) => {
        try {
            return new Date(fechaISO).toLocaleString();
        } catch (e) {
            return fechaISO;
        }
    };

    datosPagina.forEach((compra) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = compra.nombre_producto;
        row.insertCell().textContent = compra.ticket_numero;
        row.insertCell().textContent = compra.cantidad;
        row.insertCell().textContent = formatearFecha(compra.fecha_hora);
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
    const contenedor = $('paginacion');
    if (!contenedor) return;

    const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
    contenedor.innerHTML = '';

    if (totalPaginas <= 1) return;

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = '← Anterior';
    btnAnterior.className = 'btn-paginacion';
    btnAnterior.onclick = () => cambiarPagina(-1);

    const indicador = document.createElement('span');
    indicador.id = 'indicadorPagina';
    indicador.style.margin = '0 15px';
    indicador.style.fontWeight = 'bold';
    indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    const btnSiguiente = document.createElement('button');
    btnSiguiente.textContent = 'Siguiente →';
    btnSiguiente.className = 'btn-paginacion';
    btnSiguiente.onclick = () => cambiarPagina(1);

    contenedor.appendChild(btnAnterior);
    contenedor.appendChild(indicador);
    contenedor.appendChild(btnSiguiente);
}

function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
    paginaActual += direccion;

    if (paginaActual < 1) paginaActual = 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    mostrarPagina(paginaActual);
    actualizarEstadoBotones();
}

function actualizarEstadoBotones() {
    const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
    const indicador = $('indicadorPagina');
    const botones = document.querySelectorAll('#paginacion button');

    if (indicador) indicador.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    if (botones.length >= 2) {
        botones[0].disabled = paginaActual === 1;
        botones[1].disabled = paginaActual === totalPaginas;
    }
}

function filtrarHistorial() {
    const inputProducto = $('busquedaProducto');
    const inputFecha = $('busquedaFecha');

    if (!inputProducto || !inputFecha) return;

    const texto = inputProducto.value.toLowerCase().trim();
    const fecha = inputFecha.value;

    const filtrados = datosMaestros.filter((item) => {
        const prodName = (item.nombre_producto || '').toLowerCase();
        const itemFecha = (item.fecha_hora || '').split('T')[0];

        const coincideProducto = prodName.includes(texto);
        const coincideFecha = fecha ? itemFecha === fecha : true;

        return coincideProducto && coincideFecha;
    });

    datosFiltrados = filtrados;
    paginaActual = 1;

    if (datosFiltrados.length === 0) {
        const tbody = $('tablaHistorial');
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px;">No se encontraron coincidencias.</td></tr>';
        $('paginacion').innerHTML = '';
        return;
    }

    mostrarPagina(paginaActual);
    generarControlesPaginacion();
}

// ⭐ EVENT LISTENERS
const btnBuscar = $('btnBuscar');
const btnLimpiar = $('btnLimpiar');
const btnRegresar = $('btnRegresar');

if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
        paginaActual = 1;
        filtrarHistorial();
    });
}

if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
        const inputProducto = $('busquedaProducto');
        const inputFecha = $('busquedaFecha');

        if (inputProducto) inputProducto.value = '';
        if (inputFecha) inputFecha.value = '';

        datosFiltrados = datosMaestros;
        paginaActual = 1;
        mostrarPagina(1);
        generarControlesPaginacion();
    });
}

if (btnRegresar) {
    btnRegresar.addEventListener('click', () => {
        window.location.href = 'cajero.html';
    });
}

// INICIALIZAR
document.addEventListener('DOMContentLoaded', cargarHistorial);

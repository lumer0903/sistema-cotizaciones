document.addEventListener('DOMContentLoaded', () => {
    function moneda(value) {
        return `S/ ${Number(value || 0).toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function pintarMetricas(metricas) {
        document.getElementById('totalProductos').textContent = metricas.totalProductos;
        document.getElementById('cotizacionesAceptadas').textContent = metricas.cotizacionesAceptadas;
        document.getElementById('totalVentas').textContent = moneda(metricas.totalVentasMes);
        document.getElementById('cotizacionesMes').textContent = metricas.totalCotizaciones;
    }

    function renderProductos(lista) {
        const contenedor = document.getElementById('listaBajoStock');

        if (!lista.length) {
            contenedor.innerHTML = '<li class="state-text">No hay productos con bajo stock.</li>';
            return;
        }

        contenedor.innerHTML = lista.map((producto) => `
            <li class="list-row clickable-row" data-href="productos.html">
                <span class="item-title"><strong>${producto.codigo}</strong> - ${producto.descripcion}</span>
                <span class="badge badge-danger">${producto.stock_total} un.</span>
            </li>
        `).join('');
    }

    function renderCotizaciones(lista) {
        const contenedor = document.getElementById('listaUltimasCotizaciones');

        if (!lista.length) {
            contenedor.innerHTML = '<li class="state-text">No existen cotizaciones recientes.</li>';
            return;
        }

        contenedor.innerHTML = lista.map((cotizacion) => `
            <li class="list-row clickable-row" data-href="cotizacion-detalle.html?id=${cotizacion.id_cotizacion}">
                <span class="item-title"><strong>${cotizacion.numero}</strong> - ${cotizacion.cliente_nombre || 'Sin cliente'}</span>
                <span class="badge badge-neutral">${moneda(cotizacion.total)}</span>
            </li>
        `).join('');
    }

    async function cargarDashboard() {
        const respuesta = await Auth.fetchSeguro('/api/dashboard/resumen');
        const json = await respuesta.json();

        if (!respuesta.ok || !json.success) {
            document.getElementById('listaBajoStock').innerHTML = '<li class="state-text">No se pudo cargar el dashboard.</li>';
            return;
        }

        pintarMetricas(json.data.metricas);
        renderProductos(json.data.bajoStock);
        renderCotizaciones(json.data.ultimasCotizaciones);
    }

    document.querySelectorAll('.dashboard-link').forEach((card) => {
        card.addEventListener('click', () => {
            window.location.href = card.dataset.href;
        });
    });

    document.addEventListener('click', (event) => {
        const row = event.target.closest('.clickable-row');
        if (row) window.location.href = row.dataset.href;
    });

    cargarDashboard().finally(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const estadoConfig = {
        borrador: { label: 'Borrador', color: '#A3A3A3' },
        enviada: { label: 'Enviado', color: '#3B82F6' },
        aprobada: { label: 'Aprobado', color: '#22C55E' },
        rechazada: { label: 'Rechazado', color: '#EF4444' }
    };

    function moneda(value) {
        return `S/ ${Number(value || 0).toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function pintarMetricas(metricas) {
        document.getElementById('totalProductos').textContent = metricas.totalProductos;
        document.getElementById('cotizacionesAceptadas').textContent = metricas.cotizacionesAceptadas;
        document.getElementById('totalVentas').textContent = moneda(metricas.totalVentas ?? metricas.totalVentasMes);
        document.getElementById('cotizacionesMes').textContent = metricas.totalCotizaciones;
    }

    function renderVentasChart(lista = []) {
        const contenedor = document.getElementById('ventasChart');
        const normalizada = lista.length ? lista : [{ mes: 'Actual', total: 0 }];
        const max = Math.max(...normalizada.map((item) => Number(item.total || 0)), 1);

        contenedor.innerHTML = normalizada.map((item) => {
            const total = Number(item.total || 0);
            const alto = Math.max(8, Math.round((total / max) * 180));
            return `
                <div class="chart-bar">
                    <strong>${moneda(total)}</strong>
                    <div class="bar-fill" style="height:${alto}px"></div>
                    <span>${item.mes}</span>
                </div>
            `;
        }).join('');
    }

    function renderEstados(lista = []) {
        const total = lista.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const segmentos = [];
        let inicio = 0;

        lista.forEach((item) => {
            const valor = total ? (Number(item.total || 0) / total) * 100 : 0;
            const config = estadoConfig[item.estado] || { label: item.estado, color: '#A3A3A3' };
            segmentos.push(`${config.color} ${inicio}% ${inicio + valor}%`);
            inicio += valor;
        });

        const donut = document.getElementById('estadoDonut');
        donut.style.background = segmentos.length
            ? `conic-gradient(${segmentos.join(', ')})`
            : 'conic-gradient(#E5E7EB 0 100%)';
        donut.innerHTML = `<strong>${total}</strong><span>Total</span>`;

        document.getElementById('estadoLegend').innerHTML = lista.map((item) => {
            const config = estadoConfig[item.estado] || { label: item.estado, color: '#A3A3A3' };
            const pct = total ? Math.round((Number(item.total || 0) / total) * 100) : 0;
            return `
                <div class="legend-row">
                    <span><i class="legend-dot" style="background:${config.color}"></i>${config.label}</span>
                    <strong>${pct}%</strong>
                </div>
            `;
        }).join('');
    }

    function renderProductos(lista) {
        const contenedor = document.getElementById('listaBajoStock');

        if (!lista.length) {
            contenedor.innerHTML = '<li class="state-text">No hay productos con bajo stock.</li>';
            return;
        }

        contenedor.innerHTML = lista.map((producto) => `
            <li class="list-row clickable-row" data-href="productos.html">
                <span class="item-title"><strong>${escapeHtml(producto.codigo)}</strong> - ${escapeHtml(producto.descripcion)}</span>
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
                <span class="item-title"><strong>${escapeHtml(cotizacion.numero)}</strong> - ${escapeHtml(cotizacion.cliente_nombre || 'Sin cliente')}</span>
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
        renderVentasChart(json.data.ventasPorMes);
        renderEstados(json.data.cotizacionesPorEstado);
        renderProductos(json.data.bajoStock);
        renderCotizaciones(json.data.ultimasCotizaciones);
    }

    document.addEventListener('click', (event) => {
        const row = event.target.closest('.clickable-row, .dashboard-link');
        if (row?.dataset.href) window.location.href = row.dataset.href;
    });

    cargarDashboard().finally(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
});

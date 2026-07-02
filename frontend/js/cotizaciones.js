document.addEventListener('DOMContentLoaded', () => {
    const tabla = document.getElementById('tablaCotizaciones');
    const inputBuscar = document.getElementById('inputBuscarCotizacion');
    const inputFecha = document.getElementById('inputFechaCotizacion');
    const selectEstado = document.getElementById('selectEstadoFiltro');
    let timer = null;

    const estadoInicial = new URLSearchParams(window.location.search).get('estado');
    if (estadoInicial) {
        selectEstado.value = estadoInicial;
    }

    function moneda(value) {
        return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    function fecha(value) {
        return new Date(value).toLocaleDateString('es-PE');
    }

    function tipoLabel(tipo) {
        return tipo === 'distribuidor' ? 'DISTRIBUIDOR' : 'TIENDA';
    }

    function estadoLabel(estado) {
        const map = { borrador: 'BORRADOR', enviada: 'ENVIADO', aprobada: 'ACEPTADO', rechazada: 'RECHAZADO' };
        return map[estado] || estado;
    }

    async function cargarCotizaciones() {
        const params = new URLSearchParams();
        if (inputBuscar.value.trim()) params.set('q', inputBuscar.value.trim());
        if (inputFecha.value) params.set('fecha', inputFecha.value);
        if (selectEstado.value !== 'todos') params.set('estado', selectEstado.value);

        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones?${params.toString()}`);
        const json = await respuesta.json();

        if (!respuesta.ok || !json.success) {
            tabla.innerHTML = '<tr><td colspan="7">No se pudieron cargar las cotizaciones.</td></tr>';
            return;
        }

        document.getElementById('contadorCotizaciones').textContent = `${json.data.length} Resultados`;

        if (!json.data.length) {
            tabla.innerHTML = '<tr><td colspan="7">No hay cotizaciones registradas.</td></tr>';
            return;
        }

        tabla.innerHTML = json.data.map((cotizacion) => {
            const puedeEditar = cotizacion.estado === 'borrador';
            const puedeVer = ['enviada', 'aprobada'].includes(cotizacion.estado);
            const acciones = `
                <button class="quote-icon-btn ${puedeVer ? '' : 'is-disabled'}" title="${puedeVer ? 'Ver PDF final' : 'Disponible cuando este enviada'}" ${puedeVer ? `data-view="${cotizacion.id_cotizacion}"` : 'disabled'}><i data-lucide="eye"></i></button>
                <button class="quote-icon-btn ${puedeEditar ? '' : 'is-disabled'}" title="${puedeEditar ? 'Editar cotizacion' : 'Edicion no disponible'}" ${puedeEditar ? `data-edit="${cotizacion.id_cotizacion}"` : 'disabled'}><i data-lucide="pencil"></i></button>
            `;
            return `
            <tr>
                <td>${escapeHtml(cotizacion.numero)}</td>
                <td>${escapeHtml(cotizacion.cliente_nombre || 'Sin cliente')}</td>
                <td>${fecha(cotizacion.created_at)}</td>
                <td><span class="quote-badge ${cotizacion.tipo_precio === 'distribuidor' ? 'distribuidor' : 'tienda'}">${tipoLabel(cotizacion.tipo_precio)}</span></td>
                <td>${moneda(cotizacion.total)}</td>
                <td><span class="status-badge status-${cotizacion.estado}">${estadoLabel(cotizacion.estado)}</span></td>
                <td>
                    <div class="quote-actions">
                        ${acciones}
                    </div>
                </td>
            </tr>
        `;
        }).join('');
        lucide.createIcons();
    }

    inputBuscar.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(cargarCotizaciones, 250);
    });
    selectEstado.addEventListener('change', cargarCotizaciones);
    inputFecha.addEventListener('change', cargarCotizaciones);
    document.getElementById('btnNuevaCotizacion').addEventListener('click', () => {
        window.location.href = '/pages/crear-cotizacion.html';
    });
    tabla.addEventListener('click', (event) => {
        const ver = event.target.closest('[data-view]');
        const editar = event.target.closest('[data-edit]');
        if (ver) window.location.href = `/pages/cotizacion-detalle.html?id=${ver.dataset.view}`;
        if (editar) window.location.href = `/pages/cotizacion-detalle.html?id=${editar.dataset.edit}`;
    });

    cargarCotizaciones();
});

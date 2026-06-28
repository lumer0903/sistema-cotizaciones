document.addEventListener('DOMContentLoaded', () => {
    const tabla = document.getElementById('tablaCotizaciones');
    const inputBuscar = document.getElementById('inputBuscarCotizacion');
    const inputFecha = document.getElementById('inputFechaCotizacion');
    const selectEstado = document.getElementById('selectEstadoFiltro');
    const modal = document.getElementById('modalNuevaCotizacion');
    let timer = null;

    const estadoInicial = new URLSearchParams(window.location.search).get('estado');
    if (estadoInicial) {
        selectEstado.value = estadoInicial;
    }

    function moneda(value) {
        return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            const puedeVerPdf = ['enviada', 'aprobada'].includes(cotizacion.estado);
            const acciones = [
                puedeEditar ? `<button class="quote-icon-btn" title="Editar cotizacion" data-edit="${cotizacion.id_cotizacion}"><i data-lucide="pencil"></i></button>` : '',
                puedeVerPdf ? `<button class="quote-icon-btn" title="Ver PDF final" data-id="${cotizacion.id_cotizacion}"><i data-lucide="eye"></i></button>` : ''
            ].filter(Boolean).join('');
            return `
            <tr>
                <td>${cotizacion.numero}</td>
                <td>${cotizacion.cliente_nombre || 'Sin cliente'}</td>
                <td>${fecha(cotizacion.created_at)}</td>
                <td><span class="quote-badge ${cotizacion.tipo_precio === 'distribuidor' ? 'distribuidor' : 'tienda'}">${tipoLabel(cotizacion.tipo_precio)}</span></td>
                <td>${moneda(cotizacion.total)}</td>
                <td><span class="status-badge status-${cotizacion.estado}">${estadoLabel(cotizacion.estado)}</span></td>
                <td>
                    <div class="quote-actions">
                        ${acciones || '<span class="quote-no-actions">Sin acciones</span>'}
                    </div>
                </td>
            </tr>
        `;
        }).join('');
        lucide.createIcons();
    }

    function abrirModal() {
        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    function cerrarModal() {
        modal.classList.add('hidden');
    }

    function actualizarColorTipoCliente() {
        const select = document.getElementById('nuevoTipoCliente');
        select.classList.toggle('is-store', select.value === 'normal');
        select.classList.toggle('is-distributor', select.value === 'distribuidor');
    }

    async function crearCotizacion() {
        const payload = {
            cliente_nombre: document.getElementById('nuevoCliente').value.trim(),
            email: document.getElementById('nuevoEmail').value.trim(),
            telefono: document.getElementById('nuevoTelefono').value.trim(),
            ruc_dni: document.getElementById('nuevoTipoDocumento').value,
            documento_numero: document.getElementById('nuevoDocumentoNumero').value.trim(),
            tipo_precio: document.getElementById('nuevoTipoCliente').value
        };
        payload.ruc_dni = payload.documento_numero
            ? `${payload.ruc_dni}: ${payload.documento_numero}`
            : '';

        const respuesta = await Auth.fetchSeguro('/api/cotizaciones', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await respuesta.json();

        if (!respuesta.ok || !json.success) {
            alert(json.message || 'No se pudo crear la cotizacion.');
            return;
        }

        window.location.href = `/pages/cotizacion-detalle.html?id=${json.data.id_cotizacion}`;
    }

    inputBuscar.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(cargarCotizaciones, 250);
    });
    selectEstado.addEventListener('change', cargarCotizaciones);
    inputFecha.addEventListener('change', cargarCotizaciones);
    document.getElementById('btnNuevaCotizacion').addEventListener('click', abrirModal);
    document.getElementById('cerrarNuevaCotizacion').addEventListener('click', cerrarModal);
    document.getElementById('cancelarNuevaCotizacion').addEventListener('click', cerrarModal);
    document.getElementById('crearNuevaCotizacion').addEventListener('click', crearCotizacion);
    document.getElementById('nuevoTipoCliente').addEventListener('change', actualizarColorTipoCliente);
    tabla.addEventListener('click', (event) => {
        const ver = event.target.closest('[data-id]');
        const editar = event.target.closest('[data-edit]');
        if (ver) window.location.href = `/pages/cotizacion-detalle.html?id=${ver.dataset.id}`;
        if (editar) window.location.href = `/pages/cotizacion-detalle.html?id=${editar.dataset.edit}`;
    });

    actualizarColorTipoCliente();
    cargarCotizaciones();
});

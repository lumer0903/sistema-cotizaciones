document.addEventListener('DOMContentLoaded', () => {
    const idCotizacion = new URLSearchParams(window.location.search).get('id');
    const tablaDetalle = document.getElementById('tablaDetalleCotizacion');
    const resultados = document.getElementById('resultadosProductos');
    const modal = document.getElementById('modalProducto');
    let cotizacion = null;
    let productoModal = null;
    let detalleEditando = null;
    let timer = null;
    let observacionesTimer = null;
    let pdfObjectUrl = null;
    let incluyeCarreta = true;
    let detalleRecomendacion = null;

    function moneda(value) {
        return `S/${Number(value || 0).toFixed(2)}`;
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

    function encodeData(value) {
        return encodeURIComponent(JSON.stringify(value));
    }

    function decodeData(value) {
        return JSON.parse(decodeURIComponent(value));
    }

    function img(producto) {
        return producto.foto_url || `../assets/${encodeURIComponent(producto.codigo)}.jpg`;
    }

    function tipoCliente() {
        return cotizacion?.tipo_precio === 'distribuidor' ? 'distribuidor' : 'normal';
    }

    function precio(producto, tipoVenta) {
        const tipo = tipoCliente();
        if (tipo === 'distribuidor') {
            if (tipoVenta === 'docena') return Number(producto.precio_docena_dist || producto.precio_docena || 0);
            if (tipoVenta === 'mayor') return Number(producto.precio_mayor_dist || producto.precio_mayor || 0);
            return Number(producto.precio_unidad_dist || producto.precio_unidad || 0);
        }
        if (tipoVenta === 'docena') return Number(producto.precio_docena_normal || producto.precio_docena || 0);
        if (tipoVenta === 'mayor') return Number(producto.precio_mayor_normal || producto.precio_mayor || 0);
        return Number(producto.precio_unidad_normal || producto.precio_unidad || 0);
    }

    function refPrecios(producto) {
        const dist = tipoCliente() === 'distribuidor';
        return `
            Precio ${dist ? 'Mayorista' : 'Tienda'}:
            Unidad: ${moneda(precio(producto, 'unidad'))}
            | Docena: ${moneda(precio(producto, 'docena'))}
            | Mayor: ${moneda(precio(producto, 'mayor'))}
        `;
    }

    async function cargarCotizacion() {
        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}`);
        const json = await respuesta.json();
        if (!respuesta.ok || !json.success) throw new Error(json.message || 'No se pudo cargar la cotizacion');
        cotizacion = json.data;
        pintarCotizacion();
    }

    function pintarCotizacion() {
        document.getElementById('numeroCotizacion').textContent = cotizacion.numero;
        pintarOpcionesEstado();
        alternarModoDetalle();
        pintarDetalle();
        pintarResumen();
        lucide.createIcons();
    }

    function pintarOpcionesEstado() {
        const select = document.getElementById('selectEstadoDetalle');
        const opciones = {
            borrador: [
                ['borrador', 'BORRADOR'],
                ['enviada', 'ENVIADO']
            ],
            enviada: [
                ['enviada', 'ENVIADO'],
                ['aprobada', 'ACEPTADO'],
                ['rechazada', 'RECHAZADO']
            ],
            aprobada: [
                ['aprobada', 'ACEPTADO']
            ],
            rechazada: [
                ['rechazada', 'RECHAZADO']
            ]
        };
        select.innerHTML = (opciones[cotizacion.estado] || opciones.borrador)
            .map(([value, label]) => `<option value="${value}">${label}</option>`)
            .join('');
        select.value = cotizacion.estado;
        select.className = `quote-status-select state-${cotizacion.estado}`;
    }

    async function obtenerPdfBlobUrl() {
        const respuesta = await fetch(`/api/cotizaciones/${idCotizacion}/pdf`, {
            headers: {
                Authorization: `Bearer ${Auth.obtenerToken()}`
            }
        });

        if (!respuesta.ok) {
            throw new Error('No se pudo cargar el PDF.');
        }

        const blob = await respuesta.blob();
        if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
        pdfObjectUrl = URL.createObjectURL(blob);
        return pdfObjectUrl;
    }

    async function mostrarPdfFinal() {
        const frame = document.getElementById('pdfPreviewFrame');
        frame.removeAttribute('src');
        frame.src = await obtenerPdfBlobUrl();
    }

    function alternarModoDetalle() {
        const esFinal = ['enviada', 'aprobada'].includes(cotizacion.estado);
        const esTerminal = ['aprobada', 'rechazada'].includes(cotizacion.estado);
        const esRechazada = cotizacion.estado === 'rechazada';
        document.getElementById('finalPdfSection').classList.toggle('hidden', !esFinal);
        document.getElementById('editorCotizacionSection').classList.toggle('hidden', esFinal || esRechazada);
        document.getElementById('btnExportarPdf').classList.toggle('hidden', esFinal || esRechazada);
        document.getElementById('selectEstadoDetalle').disabled = esTerminal;

        if (esFinal) {
            mostrarPdfFinal().catch((error) => alert(error.message));
        }
    }

    function pintarDetalle() {
        if (!cotizacion.detalle.length) {
            tablaDetalle.innerHTML = '<tr><td colspan="5">Agrega productos desde el buscador.</td></tr>';
            return;
        }
        tablaDetalle.innerHTML = cotizacion.detalle.map((item) => `
            <tr data-detalle="${item.id_detalle}" data-producto="${item.id_producto}">
                <td><img class="cart-img" src="${escapeHtml(img(item))}" onerror="this.style.visibility='hidden'"></td>
                <td>${escapeHtml(item.codigo)}</td>
                <td>${item.cantidad}</td>
                <td>${moneda(item.subtotal)}</td>
                <td>
                    <div class="quote-actions">
                        <button class="quote-icon-btn btn-rec" title="Recomendaciones"><i data-lucide="bot"></i></button>
                        <button class="quote-icon-btn btn-edit" title="Editar"><i data-lucide="pencil"></i></button>
                        <button class="quote-icon-btn btn-delete" title="Eliminar"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function pintarResumen() {
        incluyeCarreta = Boolean(Number(cotizacion.incluye_carreta));
        document.getElementById('resumenOrden').innerHTML = `
            <div class="summary-info">
                <div class="summary-row"><span>CLIENTE</span><strong>${escapeHtml(cotizacion.cliente_nombre || 'Sin cliente')}</strong></div>
                <div class="summary-row"><span>EMAIL</span><strong>${escapeHtml(cotizacion.email || '-')}</strong></div>
                <div class="summary-row"><span>TELEFONO</span><strong>${escapeHtml(cotizacion.telefono || '-')}</strong></div>
                <div class="summary-row"><span>DNI</span><strong>${escapeHtml(cotizacion.ruc_dni || '-')}</strong></div>
            </div>
            <label class="summary-observations">
                <span>Observaciones <small>OPCIONAL</small></span>
                <textarea id="textareaObservaciones" placeholder="Escribir brevemente">${escapeHtml(cotizacion.observaciones || '')}</textarea>
            </label>
            <div class="summary-products-row"><strong>PRODUCTOS</strong><span>${cotizacion.detalle.length}</span></div>
            <div class="summary-carreta-row">
                <label class="cart-switch-row">
                    <input type="checkbox" id="switchCarreta" ${incluyeCarreta ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                    <strong>Carreta</strong>
                </label>
                <small class="cart-note">Precio aprox. ${moneda(cotizacion.costo_carreta || 15)}</small>
            </div>
            <div class="summary-total-row"><strong>TOTAL</strong><span class="summary-total">${moneda(cotizacion.total)}</span></div>
        `;
    }

    async function buscarProductos() {
        const q = document.getElementById('inputBuscarProductoCot').value.trim();
        if (q.length < 2) {
            resultados.innerHTML = '';
            return;
        }
        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/buscar-productos?q=${encodeURIComponent(q)}`);
        const json = await respuesta.json();
        if (!respuesta.ok || !json.success) return;
        resultados.innerHTML = json.data.map((producto) => `
            <div class="search-result" data-producto="${encodeData(producto)}">
                <strong>${escapeHtml(producto.codigo)}</strong>
                <p>${escapeHtml(producto.descripcion)}</p>
                <small>Stock: ${producto.stock_total} | Unidad: ${moneda(producto.precio_unidad)}</small>
            </div>
        `).join('');
    }

    function abrirModalProducto(producto, detalle = null) {
        productoModal = producto;
        detalleEditando = detalle;
        document.getElementById('modalProductoTitulo').textContent = detalle ? 'Editar Producto' : 'Agregar Producto';
        document.getElementById('guardarModalProducto').textContent = detalle ? 'Guardar Cambios' : 'Agregar';
        document.getElementById('modalProductoHead').innerHTML = `
            <img class="product-modal-thumb" src="${escapeHtml(img(producto))}" onerror="this.style.visibility='hidden'">
            <div class="product-modal-copy"><strong>${escapeHtml(producto.codigo)}</strong><p>${escapeHtml(producto.descripcion || '')}</p></div>
        `;
        const reemplazaProducto = detalle && Number(detalle.id_producto) !== Number(producto.id_producto);
        document.getElementById('modalTipoVenta').value = detalle?.tipo_venta || 'unidad';
        document.getElementById('modalCantidad').value = detalle?.cantidad || cantidadPorTipo(document.getElementById('modalTipoVenta').value);
        document.getElementById('modalPrecio').value = !reemplazaProducto && detalle?.precio_unitario
            ? detalle.precio_unitario
            : precio(producto, document.getElementById('modalTipoVenta').value);
        document.getElementById('modalPreciosReferencia').classList.toggle('dist', tipoCliente() === 'distribuidor');
        document.getElementById('modalPreciosReferencia').textContent = refPrecios(producto);
        actualizarSubtotal();
        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    function cerrarModal() {
        modal.classList.add('hidden');
        productoModal = null;
        detalleEditando = null;
    }

    function cantidadPorTipo(tipoVenta) {
        if (tipoVenta === 'docena') return 12;
        if (tipoVenta === 'mayor') return 13;
        return 1;
    }

    function tipoPorCantidad(cantidad) {
        if (cantidad > 12) return 'mayor';
        if (cantidad === 12) return 'docena';
        return 'unidad';
    }

    function actualizarSubtotal() {
        const subtotal = Number(document.getElementById('modalPrecio').value || 0) * Number(document.getElementById('modalCantidad').value || 1);
        document.getElementById('modalSubtotal').textContent = moneda(subtotal);
    }

    function actualizarPrecioPorTipo() {
        const tipoVenta = document.getElementById('modalTipoVenta').value;
        document.getElementById('modalCantidad').value = cantidadPorTipo(tipoVenta);
        document.getElementById('modalPrecio').value = precio(productoModal, tipoVenta);
        actualizarSubtotal();
    }

    function actualizarTipoPorCantidad() {
        const cantidad = Number(document.getElementById('modalCantidad').value || 1);
        const tipoVenta = tipoPorCantidad(cantidad);
        const selectTipo = document.getElementById('modalTipoVenta');
        if (selectTipo.value !== tipoVenta) {
            selectTipo.value = tipoVenta;
            document.getElementById('modalPrecio').value = precio(productoModal, tipoVenta);
        }
        actualizarSubtotal();
    }

    async function guardarModal() {
        const payload = {
            id_producto: productoModal.id_producto,
            tipo_venta: document.getElementById('modalTipoVenta').value,
            cantidad: Number(document.getElementById('modalCantidad').value || 1),
            es_sugerido_ia: productoModal.es_sugerido_ia || false
        };
        const url = detalleEditando
            ? `/api/cotizaciones/${idCotizacion}/detalle/${detalleEditando.id_detalle}`
            : `/api/cotizaciones/${idCotizacion}/detalle`;
        const method = detalleEditando ? 'PUT' : 'POST';
        const respuesta = await Auth.fetchSeguro(url, { method, body: JSON.stringify(payload) });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.success) {
            alert(json.message || 'No se pudo guardar el producto.');
            return;
        }
        cotizacion = json.data;
        cerrarModal();
        pintarCotizacion();
    }

    async function eliminarDetalle(idDetalle) {
        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/detalle/${idDetalle}`, { method: 'DELETE' });
        const json = await respuesta.json();
        if (json.success) {
            cotizacion = json.data;
            pintarCotizacion();
        }
    }

    async function cargarRecomendaciones(detalle) {
        detalleRecomendacion = detalle || null;
        document.getElementById('panelRecomendaciones').textContent = 'Calculando recomendaciones...';
        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/recomendaciones/${detalle.id_producto}`);
        const json = await respuesta.json();
        if (!respuesta.ok || !json.success || !json.data.length) {
            document.getElementById('panelRecomendaciones').textContent = 'No hay recomendaciones disponibles.';
            return;
        }
        document.getElementById('panelRecomendaciones').innerHTML = json.data.map((rec) => `
            <div class="recommendation-item">
                <img src="${escapeHtml(img(rec.producto))}" onerror="this.style.visibility='hidden'">
                <div>
                    <small>${escapeHtml(rec.tipo)}</small>
                    <h4>${escapeHtml(rec.producto.codigo)}</h4>
                    <p>${escapeHtml(rec.producto.descripcion || '')}</p>
                    <div class="recommendation-actions">
                        <button class="rec-add" data-rec="${encodeData({ ...rec.producto, es_sugerido_ia: true })}">Agregar</button>
                        <button class="rec-replace" data-rec-replace="${encodeData({ ...rec.producto, es_sugerido_ia: true })}">Reemplazar</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('inputBuscarProductoCot').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(buscarProductos, 250);
    });
    resultados.addEventListener('click', (event) => {
        const row = event.target.closest('[data-producto]');
        if (row) abrirModalProducto(decodeData(row.dataset.producto));
    });
    tablaDetalle.addEventListener('click', (event) => {
        const tr = event.target.closest('tr[data-detalle]');
        if (!tr) return;
        const detalle = cotizacion.detalle.find((item) => item.id_detalle === Number(tr.dataset.detalle));
        if (event.target.closest('.btn-delete')) eliminarDetalle(detalle.id_detalle);
        if (event.target.closest('.btn-edit')) abrirModalProducto(detalle, detalle);
        if (event.target.closest('.btn-rec')) cargarRecomendaciones(detalle);
    });
    document.getElementById('panelRecomendaciones').addEventListener('click', (event) => {
        const add = event.target.closest('[data-rec]');
        const replace = event.target.closest('[data-rec-replace]');
        if (add) abrirModalProducto(decodeData(add.dataset.rec));
        if (replace && detalleRecomendacion) abrirModalProducto(decodeData(replace.dataset.recReplace), detalleRecomendacion);
    });
    document.querySelectorAll('[data-collapse-target]').forEach((button) => {
        button.addEventListener('click', () => {
            const card = document.getElementById(button.dataset.collapseTarget);
            card.classList.toggle('is-collapsed');
            button.innerHTML = card.classList.contains('is-collapsed')
                ? '<i data-lucide="plus"></i>'
                : '<i data-lucide="minus"></i>';
            lucide.createIcons();
        });
    });
    document.getElementById('resumenOrden').addEventListener('change', (event) => {
        if (event.target.id === 'switchCarreta') {
            incluyeCarreta = event.target.checked;
            Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/carreta`, {
                method: 'PUT',
                body: JSON.stringify({
                    incluye_carreta: incluyeCarreta,
                    costo_carreta: Number(cotizacion.costo_carreta || 15)
                })
            })
                .then((respuesta) => respuesta.json().then((json) => ({ respuesta, json })))
                .then(({ respuesta, json }) => {
                    if (!respuesta.ok || !json.success) throw new Error(json.message || 'No se pudo actualizar la carreta.');
                    cotizacion = json.data;
                    pintarResumen();
                })
                .catch((error) => {
                    alert(error.message);
                    incluyeCarreta = !incluyeCarreta;
                    pintarResumen();
                });
        }
    });
    document.getElementById('resumenOrden').addEventListener('input', (event) => {
        if (event.target.id !== 'textareaObservaciones') return;
        clearTimeout(observacionesTimer);
        observacionesTimer = setTimeout(async () => {
            const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/observaciones`, {
                method: 'PUT',
                body: JSON.stringify({ observaciones: event.target.value })
            });
            const json = await respuesta.json();
            if (respuesta.ok && json.success) {
                cotizacion.observaciones = json.data.observaciones || '';
            }
        }, 450);
    });
    document.getElementById('modalTipoVenta').addEventListener('change', actualizarPrecioPorTipo);
    document.getElementById('modalCantidad').addEventListener('input', actualizarTipoPorCantidad);
    document.getElementById('modalPrecio').addEventListener('input', actualizarSubtotal);
    document.getElementById('cerrarModalProducto').addEventListener('click', cerrarModal);
    document.getElementById('cancelarModalProducto').addEventListener('click', cerrarModal);
    document.getElementById('guardarModalProducto').addEventListener('click', guardarModal);
    document.getElementById('selectEstadoDetalle').addEventListener('change', async (event) => {
        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/estado`, { method: 'PUT', body: JSON.stringify({ estado: event.target.value }) });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.success) {
            alert(json.message || 'No se pudo cambiar el estado.');
        }
        await cargarCotizacion();
    });
    async function descargarPdf() {
        const url = await obtenerPdfBlobUrl();
        const link = document.createElement('a');
        link.href = url;
        link.download = `${cotizacion.numero}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    document.getElementById('btnExportarPdf').addEventListener('click', () => {
        descargarPdf().catch(() => alert('No se pudo generar el PDF.'));
    });
    document.getElementById('btnDescargarPdfFinal').addEventListener('click', () => {
        descargarPdf().catch(() => alert('No se pudo generar el PDF.'));
    });

    cargarCotizacion().catch((error) => alert(error.message));
});

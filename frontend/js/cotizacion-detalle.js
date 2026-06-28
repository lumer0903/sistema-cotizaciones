document.addEventListener('DOMContentLoaded', () => {
    const idCotizacion = new URLSearchParams(window.location.search).get('id');
    const tablaDetalle = document.getElementById('tablaDetalleCotizacion');
    const resultados = document.getElementById('resultadosProductos');
    const modal = document.getElementById('modalProducto');
    let cotizacion = null;
    let productoModal = null;
    let detalleEditando = null;
    let timer = null;
    let pdfObjectUrl = null;

    function moneda(value) {
        return `S/${Number(value || 0).toFixed(2)}`;
    }

    function img(producto) {
        return producto.foto_url || `../assets/${producto.codigo}.jpg`;
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
            Precio ${dist ? 'Distribuidor' : 'Tienda'}:
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
        document.getElementById('selectEstadoDetalle').value = cotizacion.estado;
        alternarModoDetalle();
        pintarDetalle();
        pintarResumen();
        lucide.createIcons();
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
                <td><img class="cart-img" src="${img(item)}" onerror="this.style.visibility='hidden'"></td>
                <td>${item.codigo}</td>
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
        document.getElementById('resumenOrden').innerHTML = `
            <p><strong>CLIENTE:</strong> ${cotizacion.cliente_nombre || 'Sin cliente'}</p>
            <p><strong>EMAIL:</strong> ${cotizacion.email || '-'}</p>
            <p><strong>TELEFONO:</strong> ${cotizacion.telefono || '-'}</p>
            <p><strong>DNI:</strong> ${cotizacion.ruc_dni || '-'}</p>
            <br>
            <p><strong>PRODUCTOS (${cotizacion.detalle.length})</strong></p>
            <p style="display:flex; justify-content:space-between; margin-top:14px;"><strong>TOTAL:</strong><span class="quote-primary-btn">${moneda(cotizacion.total)}</span></p>
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
            <div class="search-result" data-producto='${JSON.stringify(producto).replace(/'/g, '&apos;')}'>
                <strong>${producto.codigo}</strong>
                <p>${producto.descripcion}</p>
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
            <img class="product-modal-thumb" src="${img(producto)}" onerror="this.style.visibility='hidden'">
            <div><strong>${producto.codigo}</strong><p style="font-size:11px;color:#A1A1AA;">${producto.descripcion || ''}</p></div>
        `;
        document.getElementById('modalTipoVenta').value = detalle?.tipo_venta || 'unidad';
        document.getElementById('modalCantidad').value = detalle?.cantidad || 10;
        document.getElementById('modalPrecio').value = detalle?.precio_unitario || precio(producto, document.getElementById('modalTipoVenta').value);
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

    function actualizarSubtotal() {
        const subtotal = Number(document.getElementById('modalPrecio').value || 0) * Number(document.getElementById('modalCantidad').value || 1);
        document.getElementById('modalSubtotal').textContent = moneda(subtotal);
    }

    function actualizarPrecioPorTipo() {
        const tipoVenta = document.getElementById('modalTipoVenta').value;
        document.getElementById('modalPrecio').value = precio(productoModal, tipoVenta);
        actualizarSubtotal();
    }

    async function guardarModal() {
        const payload = {
            id_producto: productoModal.id_producto,
            tipo_venta: document.getElementById('modalTipoVenta').value,
            cantidad: Number(document.getElementById('modalCantidad').value || 1),
            precio_unitario: Number(document.getElementById('modalPrecio').value || 0),
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

    async function cargarRecomendaciones(idProducto) {
        document.getElementById('panelRecomendaciones').textContent = 'Calculando recomendaciones...';
        const respuesta = await Auth.fetchSeguro(`/api/cotizaciones/${idCotizacion}/recomendaciones/${idProducto}`);
        const json = await respuesta.json();
        if (!respuesta.ok || !json.success || !json.data.length) {
            document.getElementById('panelRecomendaciones').textContent = 'No hay recomendaciones disponibles.';
            return;
        }
        document.getElementById('panelRecomendaciones').innerHTML = json.data.map((rec) => `
            <div class="recommendation-item">
                <img src="${img(rec.producto)}" onerror="this.style.visibility='hidden'">
                <div>
                    <small>${rec.tipo}</small>
                    <h4>${rec.producto.codigo}</h4>
                    <p>${rec.producto.descripcion || ''}</p>
                    <div class="recommendation-actions">
                        <button class="rec-add" data-rec='${JSON.stringify({ ...rec.producto, es_sugerido_ia: true }).replace(/'/g, '&apos;')}'>Agregar</button>
                        <button class="rec-replace" data-rec-replace='${JSON.stringify({ ...rec.producto, es_sugerido_ia: true }).replace(/'/g, '&apos;')}'>Reemplazar</button>
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
        if (row) abrirModalProducto(JSON.parse(row.dataset.producto));
    });
    tablaDetalle.addEventListener('click', (event) => {
        const tr = event.target.closest('tr[data-detalle]');
        if (!tr) return;
        const detalle = cotizacion.detalle.find((item) => item.id_detalle === Number(tr.dataset.detalle));
        if (event.target.closest('.btn-delete')) eliminarDetalle(detalle.id_detalle);
        if (event.target.closest('.btn-edit')) abrirModalProducto(detalle, detalle);
        if (event.target.closest('.btn-rec')) cargarRecomendaciones(detalle.id_producto);
    });
    document.getElementById('panelRecomendaciones').addEventListener('click', (event) => {
        const add = event.target.closest('[data-rec]');
        const replace = event.target.closest('[data-rec-replace]');
        if (add) abrirModalProducto(JSON.parse(add.dataset.rec));
        if (replace) abrirModalProducto(JSON.parse(replace.dataset.rec));
    });
    document.getElementById('modalTipoVenta').addEventListener('change', actualizarPrecioPorTipo);
    document.getElementById('modalCantidad').addEventListener('input', actualizarSubtotal);
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

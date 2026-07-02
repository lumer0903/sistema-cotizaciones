document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('gridProductosPrecios');
    const inputBuscar = document.getElementById('inputBuscarCodigo');
    const selectTipo = document.getElementById('selectTipoPrecio');
    const modalHistorial = document.getElementById('modalHistorial');
    const historialCodigoText = document.getElementById('historialCodigoText');
    const modalHistorialBody = document.getElementById('modalHistorialBody');
    const usuario = Auth.obtenerUsuario();
    let productos = [];
    let timer = null;

    function moneda(valor) {
        return `S/${Number(valor || 0).toLocaleString('es-PE', {
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

    function fecha(valor) {
        return new Date(valor).toLocaleDateString('es-PE');
    }

    function campoPrecio(campo) {
        const labels = {
            costo_normal: 'Costo normal',
            costo_distribuidor: 'Costo mayorista',
            precio_unidad_normal: 'Precio unidad normal',
            precio_docena_normal: 'Precio docena normal',
            precio_mayor_normal: 'Precio mayor normal',
            precio_unidad_dist: 'Precio unidad mayorista',
            precio_docena_dist: 'Precio docena mayorista',
            precio_mayor_dist: 'Precio mayor mayorista'
        };
        return labels[campo] || campo;
    }

    function imagen(producto) {
        return producto.foto_url || `../assets/${encodeURIComponent(producto.codigo)}.jpg`;
    }

    function bloqueTienda(producto) {
        return `
            <div class="price-tier-block tier-tienda">
                <span class="tier-title">PRECIO TIENDA</span>
                <div class="tier-values-grid">
                    <div class="tier-value-col"><span>UNIDAD</span><strong>${moneda(producto.precio_unidad_normal)}</strong></div>
                    <div class="tier-value-col"><span>DOCENA</span><strong>${moneda(producto.precio_docena_normal)}</strong></div>
                    <div class="tier-value-col"><span>MAYOR</span><strong>${moneda(producto.precio_mayor_normal)}</strong></div>
                </div>
            </div>
        `;
    }

    function bloqueMayorista(producto) {
        return `
            <div class="price-tier-block tier-mayorista">
                <span class="tier-title">PRECIO MAYORISTA</span>
                <div class="tier-values-grid">
                    <div class="tier-value-col"><span>UNIDAD</span><strong>${moneda(producto.precio_unidad_dist)}</strong></div>
                    <div class="tier-value-col"><span>DOCENA</span><strong>${moneda(producto.precio_docena_dist)}</strong></div>
                    <div class="tier-value-col"><span>MAYOR</span><strong>${moneda(producto.precio_mayor_dist)}</strong></div>
                </div>
            </div>
        `;
    }

    function renderizar() {
        const tipo = selectTipo.value;

        if (!productos.length) {
            grid.innerHTML = '<p class="catalog-state">No se encontraron productos.</p>';
            return;
        }

        grid.innerHTML = productos.map((producto) => `
            <article class="price-card" data-id="${producto.id_producto}">
                <div class="card-item-header">
                    <div class="card-item-img-placeholder">
                        <img src="${escapeHtml(imagen(producto))}" alt="${escapeHtml(producto.codigo)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <span class="catalog-img-fallback"><i data-lucide="image"></i></span>
                    </div>
                    <div class="card-item-details">
                        <h3>${escapeHtml(producto.codigo)}</h3>
                        <p>${escapeHtml(producto.descripcion || '')}</p>
                        <span class="card-stock-indicator"><span class="stock-dot"></span> STOCK: ${producto.stock_total || 0}</span>
                    </div>
                    ${['admin', 'gerente'].includes(usuario?.rol) ? `<button class="card-history-trigger" title="Ver historial"><i data-lucide="history"></i></button>` : ''}
                </div>
                <div class="card-prices-stack">
                    ${(tipo === 'todos' || tipo === 'tienda') ? bloqueTienda(producto) : ''}
                    ${(tipo === 'todos' || tipo === 'distribuidor') ? bloqueMayorista(producto) : ''}
                </div>
            </article>
        `).join('');

        lucide.createIcons();
    }

    async function cargarProductos() {
        const params = new URLSearchParams();
        const q = inputBuscar.value.trim();
        if (q) params.set('q', q);

        grid.innerHTML = '<p class="catalog-state">Cargando productos...</p>';
        const respuesta = await Auth.fetchSeguro(`/api/productos?${params.toString()}`);
        const json = await respuesta.json();

        if (!respuesta.ok || !json.success) {
            grid.innerHTML = '<p class="catalog-state error">No se pudieron cargar los productos.</p>';
            return;
        }

        productos = json.data;
        renderizar();
    }

    async function abrirHistorial(idProducto) {
        const producto = productos.find((item) => item.id_producto === Number(idProducto));
        if (!producto) return;

        historialCodigoText.textContent = producto.codigo;
        modalHistorialBody.innerHTML = '<tr><td colspan="5">Cargando historial...</td></tr>';
        modalHistorial.classList.remove('modal-hidden');

        const respuesta = await Auth.fetchSeguro(`/api/productos/${idProducto}/historial`);
        const json = await respuesta.json();

        if (!respuesta.ok || !json.success) {
            modalHistorialBody.innerHTML = '<tr><td colspan="5">No se pudo cargar el historial.</td></tr>';
            return;
        }

        if (!json.data.historial.length) {
            modalHistorialBody.innerHTML = '<tr><td colspan="5">Este producto todavia no tiene cambios de precio registrados.</td></tr>';
            return;
        }

        modalHistorialBody.innerHTML = json.data.historial.map((item) => {
            const diferencia = Number(item.diferencia || 0);
            return `
                <tr>
                    <td>${fecha(item.fecha_cambio)}</td>
                    <td>${escapeHtml(campoPrecio(item.campo_modificado))}</td>
                    <td>${moneda(item.valor_anterior)}</td>
                    <td>${moneda(item.valor_nuevo)}</td>
                    <td class="${diferencia < 0 ? 'text-danger' : ''}">${diferencia >= 0 ? '+' : ''}${moneda(diferencia)}</td>
                </tr>
            `;
        }).join('');
    }

    function cerrarHistorial() {
        modalHistorial.classList.add('modal-hidden');
    }

    inputBuscar.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(cargarProductos, 300);
    });

    selectTipo.addEventListener('change', renderizar);

    grid.addEventListener('click', (event) => {
        const button = event.target.closest('.card-history-trigger');
        if (!button) return;
        const card = button.closest('.price-card');
        abrirHistorial(card.dataset.id);
    });

    document.getElementById('closeHistorialX').addEventListener('click', cerrarHistorial);
    window.addEventListener('click', (event) => {
        if (event.target === modalHistorial) cerrarHistorial();
    });

    cargarProductos();
});

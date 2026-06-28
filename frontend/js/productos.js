document.addEventListener('DOMContentLoaded', () => {
    const tablaBody = document.getElementById('tablaProductosBody');
    const inputBusqueda = document.getElementById('inputBusquedaProducto');
    const selectCategoriaFiltro = document.getElementById('selectCategoriaFiltro');
    const modalEditar = document.getElementById('modalEditar');
    const modalEliminar = document.getElementById('modalEliminar');
    const selectEditCategoria = document.getElementById('editCategoria');

    let productos = [];
    let categorias = [];
    let productoSeleccionado = null;
    let timerBusqueda = null;

    function formatearMoneda(valor) {
        return Number(valor || 0).toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function imagenProducto(producto) {
        if (producto.foto_url) return producto.foto_url;
        return `../assets/${producto.codigo}.jpg`;
    }

    window.cambiarImagenProducto = (imagen) => {
        const extensiones = ['png', 'jpeg', 'JPG'];
        const paso = Number(imagen.dataset.imgStep || 0);
        const codigo = imagen.dataset.code;

        if (codigo && paso < extensiones.length) {
            imagen.dataset.imgStep = String(paso + 1);
            imagen.src = `../assets/${codigo}.${extensiones[paso]}`;
            return;
        }

        imagen.style.display = 'none';
        imagen.nextElementSibling.style.display = 'flex';
    };

    function renderImagen(producto) {
        return `
            <img class="product-thumb" src="${imagenProducto(producto)}" alt="${producto.codigo}" data-code="${producto.codigo}" data-img-step="0"
                 onerror="window.cambiarImagenProducto(this)">
            <span class="img-fallback"><i data-lucide="image"></i></span>
        `;
    }

    function pintarCategorias() {
        const opciones = categorias.map((categoria) => (
            `<option value="${categoria.id_categoria}">${categoria.nombre_categoria}</option>`
        )).join('');

        selectCategoriaFiltro.innerHTML = `<option value="">Todas</option>${opciones}`;
        selectEditCategoria.innerHTML = `<option value="">Sin categoria</option>${opciones}`;
    }

    function pintarTabla() {
        if (!productos.length) {
            tablaBody.innerHTML = '<tr><td colspan="5" class="table-state">No se encontraron productos.</td></tr>';
            return;
        }

        tablaBody.innerHTML = productos.map((producto) => `
            <tr class="product-row" data-id="${producto.id_producto}">
                <td>
                    <div class="img-cell-wrapper">
                        ${renderImagen(producto)}
                    </div>
                </td>
                <td>
                    <strong>${producto.codigo}</strong>
                </td>
                <td>${producto.nombre_categoria || 'Sin categoria'}</td>
                <td><span class="stock-indicator ${(Number(producto.stock_total || 0) <= Number(producto.stock_minimo || 10)) ? 'stock-low' : ''}">${producto.stock_total || 0}</span></td>
                <td>
                    <div class="actions-wrapper">
                        <button class="action-icon-btn btn-trash" title="Eliminar"><i data-lucide="trash-2"></i></button>
                        <button class="action-icon-btn btn-edit" title="Editar"><i data-lucide="edit-3"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        lucide.createIcons();
    }

    async function cargarCategorias() {
        const respuesta = await Auth.fetchSeguro('/api/productos/categorias');
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.message || 'No se pudieron cargar las categorias');
        }

        categorias = resultado.data;
        pintarCategorias();
    }

    async function cargarProductos() {
        const params = new URLSearchParams();
        const busqueda = inputBusqueda.value.trim();
        const categoria = selectCategoriaFiltro.value;

        if (busqueda) params.set('q', busqueda);
        if (categoria) params.set('categoria', categoria);

        tablaBody.innerHTML = '<tr><td colspan="5" class="table-state">Cargando productos...</td></tr>';

        const respuesta = await Auth.fetchSeguro(`/api/productos?${params.toString()}`);
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.message || 'No se pudieron cargar los productos');
        }

        productos = resultado.data;
        pintarTabla();
    }

    function abrirEditar(idProducto) {
        productoSeleccionado = productos.find((producto) => producto.id_producto === Number(idProducto));
        if (!productoSeleccionado) return;

        document.getElementById('editCodigo').value = productoSeleccionado.codigo;
        document.getElementById('editDescripcion').value = productoSeleccionado.descripcion || '';
        document.getElementById('editStock').value = productoSeleccionado.stock_total || 0;
        document.getElementById('editStockMinimo').value = productoSeleccionado.stock_minimo || 10;
        document.getElementById('editFotoUrl').value = productoSeleccionado.foto_url || '';
        selectEditCategoria.value = productoSeleccionado.id_categoria || '';

        document.querySelectorAll('[data-price-field]').forEach((input) => {
            input.value = formatearMoneda(productoSeleccionado[input.dataset.priceField]).replace(',', '');
        });

        const preview = document.getElementById('editImagenPreview');
        preview.innerHTML = `
            <img class="edit-preview-img" src="${imagenProducto(productoSeleccionado)}" alt="${productoSeleccionado.codigo}"
                 data-code="${productoSeleccionado.codigo}" data-img-step="0" onerror="window.cambiarImagenProducto(this)">
            <span class="img-fallback"><i data-lucide="image"></i></span>
        `;

        modalEditar.classList.remove('modal-hidden');
        lucide.createIcons();
    }

    function abrirEliminar(idProducto) {
        productoSeleccionado = productos.find((producto) => producto.id_producto === Number(idProducto));
        if (!productoSeleccionado) return;
        modalEliminar.classList.remove('modal-hidden');
    }

    function cerrarModales() {
        modalEditar.classList.add('modal-hidden');
        modalEliminar.classList.add('modal-hidden');
        productoSeleccionado = null;
    }

    async function guardarEdicion() {
        if (!productoSeleccionado) return;

        const payload = {
            descripcion: document.getElementById('editDescripcion').value.trim(),
            stock_total: Number(document.getElementById('editStock').value || 0),
            stock_minimo: Number(document.getElementById('editStockMinimo').value || 0),
            foto_url: document.getElementById('editFotoUrl').value.trim(),
            id_categoria: selectEditCategoria.value || null
        };

        document.querySelectorAll('[data-price-field]').forEach((input) => {
            payload[input.dataset.priceField] = Number(input.value || 0);
        });

        const respuesta = await Auth.fetchSeguro(`/api/productos/${productoSeleccionado.id_producto}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            alert(resultado.message || 'No se pudo guardar el producto.');
            return;
        }

        cerrarModales();
        await cargarProductos();
    }

    async function confirmarEliminar() {
        if (!productoSeleccionado) return;

        const respuesta = await Auth.fetchSeguro(`/api/productos/${productoSeleccionado.id_producto}`, {
            method: 'DELETE'
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            alert(resultado.message || 'No se pudo eliminar el producto.');
            return;
        }

        cerrarModales();
        await cargarProductos();
    }

    tablaBody.addEventListener('click', (event) => {
        const fila = event.target.closest('.product-row');
        if (!fila) return;

        if (event.target.closest('.btn-edit')) abrirEditar(fila.dataset.id);
        if (event.target.closest('.btn-trash')) abrirEliminar(fila.dataset.id);
    });

    inputBusqueda.addEventListener('input', () => {
        clearTimeout(timerBusqueda);
        timerBusqueda = setTimeout(() => cargarProductos().catch((error) => alert(error.message)), 300);
    });

    selectCategoriaFiltro.addEventListener('change', () => {
        cargarProductos().catch((error) => alert(error.message));
    });

    document.getElementById('closeEditarBtn').addEventListener('click', cerrarModales);
    document.getElementById('cancelEditarBtn').addEventListener('click', cerrarModales);
    document.getElementById('closeEliminarBtn').addEventListener('click', cerrarModales);
    document.getElementById('cancelEliminarBtn').addEventListener('click', cerrarModales);
    document.getElementById('saveEditarBtn').addEventListener('click', () => guardarEdicion().catch((error) => alert(error.message)));
    document.getElementById('confirmEliminarBtn').addEventListener('click', () => confirmarEliminar().catch((error) => alert(error.message)));

    window.addEventListener('click', (event) => {
        if (event.target === modalEditar || event.target === modalEliminar) cerrarModales();
    });

    cargarCategorias()
        .then(cargarProductos)
        .catch((error) => {
            tablaBody.innerHTML = `<tr><td colspan="5" class="table-state error">${error.message}</td></tr>`;
        });
});

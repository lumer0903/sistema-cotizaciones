// Función para pedir datos al Backend
async function cargarProductos(termino = '') {
    try {
        const res = await fetch(`/api/productos?q=${encodeURIComponent(termino)}`);
        if (!res.ok) throw new Error(`Error en el servidor: ${res.status}`);

        const productos = await res.json();
        const contenedor = document.getElementById('contenedorProductos');
        if (!contenedor) return;

        if (productos.length === 0) {
            contenedor.innerHTML = `
                <div class="col-span-full text-center p-10">
                    <p class="text-gray-400 text-lg">No se encontraron resultados para "${termino}"</p>
                </div>`;
            return;
        }

        // ✅ Construir todo el HTML de una sola vez (más eficiente)
        contenedor.innerHTML = productos.map(p => `
            <div class="card-producto bg-white p-4 rounded-xl shadow-md border border-gray-100 flex flex-col gap-3">
                <div class="flex gap-4 mb-3">
                    <img src="/assets/${p.codigo}.jpg"
                        class="img-contenedor"
                        onerror="intentarSiguiente(this, '${p.codigo}')">
                    <div class="flex-1">
                        <h3 class="font-bold text-lg text-gray-800">${p.codigo}</h3>
                        <p class="text-[11px] text-gray-500 uppercase leading-tight">${p.descripcion || ''}</p>
                        <p class="text-xs font-bold text-green-600 mt-1">● STOCK: ${p.stock_total}</p>
                    </div>
                </div>
                <div class="seccion-precios space-y-2">
                    <div class="bloque-normal">
                        <p class="text-[9px] font-black text-blue-600 mb-1">PRECIOS NORMALES</p>
                        <div class="grid-precios">
                            <div><p class="label-precio">UNIDAD</p><p class="monto-precio text-normal">S/ ${formatear(p.precio_unidad_normal)}</p></div>
                            <div><p class="label-precio">DOCENA</p><p class="monto-precio text-normal">S/ ${formatear(p.precio_docena_normal)}</p></div>
                            <div><p class="label-precio">MAYOR</p><p class="monto-precio text-normal">S/ ${formatear(p.precio_mayor_normal)}</p></div>
                        </div>
                    </div>
                    <div class="bloque-distribuidor">
                        <p class="text-[9px] font-black text-orange-600 mb-1">PRECIOS DISTRIBUIDOR</p>
                        <div class="grid-precios">
                            <div><p class="label-precio">UNIDAD</p><p class="monto-precio text-dist">S/ ${formatear(p.precio_unidad_dist)}</p></div>
                            <div><p class="label-precio">DOCENA</p><p class="monto-precio text-dist">S/ ${formatear(p.precio_docena_dist)}</p></div>
                            <div><p class="label-precio">MAYOR</p><p class="monto-precio text-dist">S/ ${formatear(p.precio_mayor_dist)}</p></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("❌ Error al conectar:", err);
        const contenedor = document.getElementById('contenedorProductos');
        if (contenedor) {
            contenedor.innerHTML = `<p class="col-span-full text-red-500 text-center">Error al conectar con el servidor.</p>`;
        }
    }
}

// ✅ Pasar evento como parámetro en lugar de usar event global
function cambiarFiltro(tipo, btnClickeado) {
    const bloquesNormal = document.querySelectorAll('.bloque-normal');
    const bloquesDist = document.querySelectorAll('.bloque-distribuidor');
    const botones = document.querySelectorAll('.btn-tipo');

    if (tipo === 'normal') {
        bloquesNormal.forEach(b => b.classList.remove('hidden'));
        bloquesDist.forEach(b => b.classList.add('hidden'));
    } else if (tipo === 'dist') {
        bloquesNormal.forEach(b => b.classList.add('hidden'));
        bloquesDist.forEach(b => b.classList.remove('hidden'));
    } else {
        bloquesNormal.forEach(b => b.classList.remove('hidden'));
        bloquesDist.forEach(b => b.classList.remove('hidden'));
    }

    botones.forEach(btn => btn.classList.remove('activo'));
    btnClickeado.classList.add('activo');
}

function formatear(valor) {
    return Number(valor || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos('');

    const inputBusqueda = document.getElementById('inputBusqueda');
    if (inputBusqueda) {
        let timer;
        inputBusqueda.addEventListener('input', (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => cargarProductos(e.target.value), 300);
        });
    }
});

function intentarSiguiente(img, codigo) {
    if (img.src.includes('.jpg')) {
        img.src = `/assets/${codigo}.png`;
    } else if (img.src.includes('.png')) {
        img.src = `/assets/${codigo}.JPG`;
    } else {
        // ✅ Imagen local de respaldo en lugar de servicio externo
        img.src = '/assets/sin-imagen.png';
        img.onerror = null;
    }
}
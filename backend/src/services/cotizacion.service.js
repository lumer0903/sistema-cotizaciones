const prisma = require('../config/prisma');
const iaService = require('./ia.service');

function money(value) {
    return Number(value || 0);
}

function normalizarTipo(tipo) {
    return tipo === 'distribuidor' ? 'distribuidor' : 'normal';
}

function campoPrecio(tipoPrecio, tipoVenta) {
    const sufijo = tipoPrecio === 'distribuidor' ? 'dist' : 'normal';
    if (tipoVenta === 'docena') return `precio_docena_${sufijo}`;
    if (tipoVenta === 'mayor') return `precio_mayor_${sufijo}`;
    return `precio_unidad_${sufijo}`;
}

function precioProducto(producto, tipoPrecio, tipoVenta) {
    const precios = producto.precios_actuales || producto;
    return money(precios[campoPrecio(tipoPrecio, tipoVenta)]);
}

function validarTipoVenta(tipoVenta) {
    const permitidos = ['unidad', 'docena', 'mayor'];
    if (permitidos.includes(tipoVenta)) return tipoVenta;
    const error = new Error('Tipo de venta no valido');
    error.status = 400;
    throw error;
}

function validarCantidad(cantidad) {
    const value = Number(cantidad || 1);
    if (!Number.isFinite(value) || value < 1) {
        const error = new Error('Cantidad no valida');
        error.status = 400;
        throw error;
    }
    return Math.floor(value);
}

function determinarTipoVenta(cantidad, unidadesPorCaja) {
    if (cantidad <= 11) return 'unidad';
    if (cantidad < unidadesPorCaja) return 'docena';
    return 'mayor';
}

function asegurarEditable(cotizacion) {
    if (!cotizacion) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    if (cotizacion.estado !== 'borrador') {
        const error = new Error('Solo se pueden editar cotizaciones en borrador');
        error.status = 400;
        throw error;
    }
}

async function generarNumero() {
    const year = new Date().getFullYear();
    const prefix = `COT-${year}-`;

    const ultima = await prisma.cotizacion.findFirst({
        where: { numero: { startsWith: prefix } },
        orderBy: { numero: 'desc' },
        select: { numero: true }
    });

    let siguiente = 1;
    if (ultima) {
        const partes = ultima.numero.split('-');
        siguiente = parseInt(partes[2], 10) + 1;
    }

    return `${prefix}${String(siguiente).padStart(3, '0')}`;
}

async function obtenerExtrasCotizacion(idCotizacion) {
    const cotizacion = await prisma.cotizacion.findUnique({
        where: { id_cotizacion: Number(idCotizacion) },
        select: { incluye_carreta: true, costo_carreta: true }
    });

    return {
        incluyeCarreta: Boolean(Number(cotizacion?.incluye_carreta ?? 1)),
        costoCarreta: money(cotizacion?.costo_carreta ?? 15)
    };
}

async function recalcularTotales(idCotizacion) {
    const agg = await prisma.cotizacionDetalle.aggregate({
        where: { id_cotizacion: Number(idCotizacion) },
        _sum: { subtotal: true }
    });

    const subtotal = money(agg._sum.subtotal);
    const igv = Number((subtotal * 0.18).toFixed(2));
    const extras = await obtenerExtrasCotizacion(idCotizacion);
    const cargoCarreta = extras.incluyeCarreta ? extras.costoCarreta : 0;
    const total = Number((subtotal + igv + cargoCarreta).toFixed(2));

    await prisma.cotizacion.update({
        where: { id_cotizacion: Number(idCotizacion) },
        data: { subtotal, igv, total }
    });
}

async function listarCotizaciones({ q, estado, fecha } = {}) {
    const where = {};

    if (q) {
        where.OR = [
            { numero: { contains: q, mode: 'insensitive' } },
            { cliente: { nombre: { contains: q, mode: 'insensitive' } } }
        ];
    }

    if (estado && estado !== 'todos') {
        where.estado = estado;
    }

    if (fecha) {
        const inicio = new Date(fecha);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(fecha);
        fin.setHours(23, 59, 59, 999);
        where.created_at = { gte: inicio, lte: fin };
    }

    const cotizaciones = await prisma.cotizacion.findMany({
        where,
        include: {
            cliente: { select: { nombre: true, email: true, telefono: true, ruc_dni: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 200
    });

    return cotizaciones.map(c => ({
        id_cotizacion: c.id_cotizacion,
        numero: c.numero,
        tipo_precio: c.tipo_precio,
        subtotal: Number(c.subtotal || 0),
        igv: Number(c.igv || 0),
        total: Number(c.total || 0),
        incluye_carreta: c.incluye_carreta,
        costo_carreta: Number(c.costo_carreta || 0),
        estado: c.estado,
        created_at: c.created_at,
        cliente_nombre: c.cliente?.nombre ?? null,
        email: c.cliente?.email ?? null,
        telefono: c.cliente?.telefono ?? null,
        ruc_dni: c.cliente?.ruc_dni ?? null
    }));
}

async function crearCotizacion(payload, idUsuario) {
    const requeridos = [
        ['cliente_nombre', 'cliente'],
        ['email', 'email'],
        ['telefono', 'telefono'],
        ['ruc_dni', 'DNI/RUC']
    ];
    const faltantes = requeridos
        .filter(([campo]) => !String(payload[campo] || '').trim())
        .map(([, label]) => label);

    if (faltantes.length) {
        const error = new Error(`Campos requeridos incompletos: ${faltantes.join(', ')}`);
        error.status = 400;
        throw error;
    }

    const tipoPrecio = normalizarTipo(payload.tipo_precio);

    return prisma.$transaction(async (tx) => {
        let idCliente = null;
        if (payload.cliente_nombre) {
            const cliente = await tx.cliente.create({
                data: {
                    nombre: payload.cliente_nombre,
                    telefono: payload.telefono || null,
                    email: payload.email || null,
                    ruc_dni: payload.ruc_dni || null,
                    tipo: tipoPrecio
                }
            });
            idCliente = cliente.id_cliente;
        }

        const numero = await generarNumero();

        const cotizacion = await tx.cotizacion.create({
            data: {
                numero,
                id_cliente: idCliente,
                id_usuario: idUsuario,
                tipo_precio: tipoPrecio,
                estado: 'borrador',
                observaciones: payload.observaciones || '',
                tiempo_inicio: new Date()
            }
        });

        return obtenerCotizacion(cotizacion.id_cotizacion);
    });
}

async function obtenerCotizacion(idCotizacion) {
    const cotizacion = await prisma.cotizacion.findUnique({
        where: { id_cotizacion: Number(idCotizacion) },
        include: {
            cliente: true,
            detalle: {
                include: {
                    producto: { include: { precios_actuales: true } }
                },
                orderBy: { id_detalle: 'desc' }
            }
        }
    });

    if (!cotizacion) return null;

    return {
        id_cotizacion: cotizacion.id_cotizacion,
        numero: cotizacion.numero,
        id_cliente: cotizacion.id_cliente,
        id_usuario: cotizacion.id_usuario,
        tipo_precio: cotizacion.tipo_precio,
        subtotal: Number(cotizacion.subtotal || 0),
        igv: Number(cotizacion.igv || 0),
        total: Number(cotizacion.total || 0),
        observaciones: cotizacion.observaciones,
        incluye_carreta: cotizacion.incluye_carreta,
        costo_carreta: Number(cotizacion.costo_carreta || 0),
        estado: cotizacion.estado,
        tiempo_inicio: cotizacion.tiempo_inicio,
        tiempo_fin: cotizacion.tiempo_fin,
        created_at: cotizacion.created_at,
        cliente_nombre: cotizacion.cliente?.nombre ?? null,
        telefono: cotizacion.cliente?.telefono ?? null,
        email: cotizacion.cliente?.email ?? null,
        ruc_dni: cotizacion.cliente?.ruc_dni ?? null,
        detalle: cotizacion.detalle.map(d => ({
            id_detalle: d.id_detalle,
            id_producto: d.id_producto,
            tipo_venta: d.tipo_venta,
            cantidad: d.cantidad,
            color_notas: d.color_notas,
            precio_unitario: Number(d.precio_unitario || 0),
            subtotal: Number(d.subtotal || 0),
            es_sugerido_ia: d.es_sugerido_ia,
            codigo: d.producto?.codigo,
            descripcion: d.producto?.descripcion,
            stock_total: d.producto?.stock_total,
            foto_url: d.producto?.foto_url,
            precio_unidad_normal: d.producto?.precios_actuales ? Number(d.producto.precios_actuales.precio_unidad_normal) : 0,
            precio_docena_normal: d.producto?.precios_actuales ? Number(d.producto.precios_actuales.precio_docena_normal) : 0,
            precio_mayor_normal: d.producto?.precios_actuales ? Number(d.producto.precios_actuales.precio_mayor_normal) : 0,
            precio_unidad_dist: d.producto?.precios_actuales ? Number(d.producto.precios_actuales.precio_unidad_dist) : 0,
            precio_docena_dist: d.producto?.precios_actuales ? Number(d.producto.precios_actuales.precio_docena_dist) : 0,
            precio_mayor_dist: d.producto?.precios_actuales ? Number(d.producto.precios_actuales.precio_mayor_dist) : 0
        }))
    };
}

async function cambiarEstado(idCotizacion, estado) {
    const permitidos = ['borrador', 'enviada', 'aprobada', 'rechazada'];
    if (!permitidos.includes(estado)) {
        const error = new Error('Estado no valido');
        error.status = 400;
        throw error;
    }

    const actual = await obtenerCotizacion(idCotizacion);
    if (!actual) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    if (['aprobada', 'rechazada'].includes(actual.estado)) {
        const error = new Error('La cotizacion ya esta cerrada y no puede cambiar de estado');
        error.status = 400;
        throw error;
    }

    if (actual.estado === 'borrador' && !['borrador', 'enviada'].includes(estado)) {
        const error = new Error('Una cotizacion en borrador solo puede mantenerse como borrador o pasar a enviada');
        error.status = 400;
        throw error;
    }

    if (actual.estado === 'enviada' && !['aprobada', 'rechazada'].includes(estado)) {
        const error = new Error('Una cotizacion enviada solo puede pasar a aprobada o rechazada');
        error.status = 400;
        throw error;
    }

    const data = { estado };
    if (['aprobada', 'rechazada'].includes(estado)) {
        data.tiempo_fin = new Date();
    }

    await prisma.cotizacion.update({
        where: { id_cotizacion: Number(idCotizacion) },
        data
    });

    return obtenerCotizacion(idCotizacion);
}

async function actualizarObservaciones(idCotizacion, observaciones = '') {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    await prisma.cotizacion.update({
        where: { id_cotizacion: Number(idCotizacion) },
        data: { observaciones: String(observaciones || '').trim() }
    });

    return obtenerCotizacion(idCotizacion);
}

async function actualizarCarreta(idCotizacion, payload = {}) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    const incluyeCarreta = payload.incluye_carreta === undefined
        ? Boolean(Number(cotizacion.incluye_carreta))
        : Boolean(payload.incluye_carreta);
    const costoCarreta = payload.costo_carreta === undefined
        ? money(cotizacion.costo_carreta || 15)
        : money(payload.costo_carreta);

    if (!Number.isFinite(costoCarreta) || costoCarreta < 0) {
        const error = new Error('Costo de carreta no valido');
        error.status = 400;
        throw error;
    }

    await prisma.$transaction(async (tx) => {
        await tx.cotizacion.update({
            where: { id_cotizacion: Number(idCotizacion) },
            data: {
                incluye_carreta: incluyeCarreta ? 1 : 0,
                costo_carreta: costoCarreta
            }
        });
        await recalcularTotales(idCotizacion);
    });

    return obtenerCotizacion(idCotizacion);
}

async function buscarProductos(idCotizacion, q = '') {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    if (!cotizacion) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    const where = { activo: true };
    if (q) {
        where.OR = [
            { codigo: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } }
        ];
    }

    const productos = await prisma.producto.findMany({
        where,
        include: { precios_actuales: true },
        orderBy: { codigo: 'asc' },
        take: 20
    });

    return productos.map(p => ({
        id_producto: p.id_producto,
        codigo: p.codigo,
        descripcion: p.descripcion,
        stock_total: p.stock_total,
        stock_minimo: p.stock_minimo,
        foto_url: p.foto_url,
        id_categoria: p.id_categoria,
        unidades_por_caja: p.unidades_por_caja,
        precio_unidad: precioProducto(p, cotizacion.tipo_precio, 'unidad'),
        precio_docena: precioProducto(p, cotizacion.tipo_precio, 'docena'),
        precio_mayor: precioProducto(p, cotizacion.tipo_precio, 'mayor'),
        precios_actuales: p.precios_actuales ? {
            costo_normal: Number(p.precios_actuales.costo_normal),
            precio_unidad_normal: Number(p.precios_actuales.precio_unidad_normal),
            precio_docena_normal: Number(p.precios_actuales.precio_docena_normal),
            precio_mayor_normal: Number(p.precios_actuales.precio_mayor_normal),
            costo_distribuidor: Number(p.precios_actuales.costo_distribuidor),
            precio_unidad_dist: Number(p.precios_actuales.precio_unidad_dist),
            precio_docena_dist: Number(p.precios_actuales.precio_docena_dist),
            precio_mayor_dist: Number(p.precios_actuales.precio_mayor_dist)
        } : {}
    }));
}

async function agregarDetalle(idCotizacion, payload) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    const cantidad = validarCantidad(payload.cantidad);
    const idProducto = Number(payload.id_producto);

    const producto = await prisma.producto.findUnique({
        where: { id_producto: idProducto },
        include: { precios_actuales: true }
    });

    if (!producto || !producto.activo) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }

    const tipoVenta = determinarTipoVenta(cantidad, producto.unidades_por_caja || 1);
    const precio = precioProducto(producto, cotizacion.tipo_precio, tipoVenta);
    const subtotal = Number((precio * cantidad).toFixed(2));

    await prisma.$transaction(async (tx) => {
        await tx.cotizacionDetalle.create({
            data: {
                id_cotizacion: Number(idCotizacion),
                id_producto: idProducto,
                tipo_venta: tipoVenta,
                cantidad,
                color_notas: payload.color_notas || null,
                precio_unitario: precio,
                subtotal,
                es_sugerido_ia: payload.es_sugerido_ia ? true : false
            }
        });
        await recalcularTotales(idCotizacion);
    });

    return obtenerCotizacion(idCotizacion);
}

async function actualizarDetalle(idCotizacion, idDetalle, payload) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    const cantidad = validarCantidad(payload.cantidad);
    const idProducto = Number(payload.id_producto || 0);

    const detalleActual = await prisma.cotizacionDetalle.findUnique({
        where: { id_detalle: Number(idDetalle) }
    });

    if (!detalleActual || detalleActual.id_cotizacion !== Number(idCotizacion)) {
        const error = new Error('Detalle no encontrado');
        error.status = 404;
        throw error;
    }

    const productoId = idProducto > 0 ? idProducto : detalleActual.id_producto;

    const producto = await prisma.producto.findUnique({
        where: { id_producto: productoId },
        include: { precios_actuales: true }
    });

    if (!producto || !producto.activo) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }

    const tipoVenta = determinarTipoVenta(cantidad, producto.unidades_por_caja || 1);
    const precio = precioProducto(producto, cotizacion.tipo_precio, tipoVenta);
    const subtotal = Number((precio * cantidad).toFixed(2));

    await prisma.$transaction(async (tx) => {
        await tx.cotizacionDetalle.update({
            where: { id_detalle: Number(idDetalle) },
            data: {
                id_producto: productoId,
                tipo_venta: tipoVenta,
                cantidad,
                color_notas: payload.color_notas ?? null,
                precio_unitario: precio,
                subtotal
            }
        });
        await recalcularTotales(idCotizacion);
    });

    return obtenerCotizacion(idCotizacion);
}

async function eliminarDetalle(idCotizacion, idDetalle) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    const detalle = await prisma.cotizacionDetalle.findUnique({
        where: { id_detalle: Number(idDetalle) }
    });

    if (!detalle || detalle.id_cotizacion !== Number(idCotizacion)) {
        const error = new Error('Detalle no encontrado');
        error.status = 404;
        throw error;
    }

    await prisma.$transaction(async (tx) => {
        await tx.cotizacionDetalle.delete({
            where: { id_detalle: Number(idDetalle) }
        });
        await recalcularTotales(idCotizacion);
    });

    return obtenerCotizacion(idCotizacion);
}

async function recomendar(idCotizacion, idProducto) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    if (!cotizacion) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    const productos = await prisma.producto.findMany({
        where: { activo: true },
        include: { precios_actuales: true }
    });

    const similares = await iaService.obtenerSimilitudes(Number(idProducto), productos);
    const candidatos = similares
        .map((item) => {
            const producto = productos.find((p) => p.id_producto === item.id_producto);
            if (!producto || producto.id_producto === Number(idProducto)) return null;
            return {
                ...producto,
                similitud: item.similitud,
                precio_referencia: precioProducto(producto, cotizacion.tipo_precio, 'unidad')
            };
        })
        .filter(Boolean);

    const mayorSimilitud = [...candidatos].sort((a, b) => b.similitud - a.similitud)[0];
    const masEconomico = [...candidatos].sort((a, b) => a.precio_referencia - b.precio_referencia)[0];
    const maxPrecio = Math.max(...candidatos.map((p) => p.precio_referencia), 1);
    const mejorOpcion = [...candidatos]
        .map((p) => ({ ...p, score: (p.similitud * 0.7) + ((1 - (p.precio_referencia / maxPrecio)) * 0.3) }))
        .sort((a, b) => b.score - a.score)[0];

    return [
        { tipo: 'Mayor similitud', producto: mayorSimilitud },
        { tipo: 'Mas economico', producto: masEconomico },
        { tipo: 'Mejor opcion', producto: mejorOpcion }
    ].filter((item) => item.producto);
}

module.exports = {
    listarCotizaciones,
    crearCotizacion,
    obtenerCotizacion,
    cambiarEstado,
    actualizarObservaciones,
    actualizarCarreta,
    buscarProductos,
    agregarDetalle,
    actualizarDetalle,
    eliminarDetalle,
    recomendar
};
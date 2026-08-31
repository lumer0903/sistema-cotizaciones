/**
 * Servicio de Ventas
 * CRUD, creación desde cotización, emisión, validación stock, serie/correlativo
 */

const prisma = require('../config/prisma');
const almacenService = require('./almacen.service');

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

async function obtenerSiguienteCorrelativo(serie, tx) {
    const ultima = await tx.venta.findFirst({
        where: { serie },
        orderBy: { correlativo: 'desc' },
        select: { correlativo: true }
    });
    return (ultima?.correlativo || 0) + 1;
}

async function validarStockDetalles(detalles, idAlmacen, tx) {
    for (const det of detalles) {
        const stock = await tx.stockActual.findUnique({
            where: {
                id_producto_id_almacen: {
                    id_producto: Number(det.idProducto),
                    id_almacen: Number(idAlmacen)
                }
            }
        });

        const disponible = stock?.cantidad || 0;
        const solicitado = Number(det.cantidad);

        if (disponible < solicitado) {
            const prod = await tx.producto.findUnique({
                where: { id_producto: Number(det.idProducto) },
                select: { codigo: true, descripcion: true }
            });
            const error = new Error(`Stock insuficiente para ${prod?.codigo} - ${prod?.descripcion}. Disponible: ${disponible}, Solicitado: ${solicitado}`);
            error.status = 400;
            throw error;
        }
    }
}

async function crearVenta(data, idUsuario) {
    const {
        idCliente,
        idCotizacion,
        tipoPrecio,
        detalles,
        tipoPago = 'contado',
        diasPlazo,
        observaciones,
        descuentoGlobal = 0,
        idAlmacen
    } = data;

    if (!idCliente) {
        const error = new Error('Cliente es requerido');
        error.status = 400;
        throw error;
    }

    if (!detalles || !detalles.length) {
        const error = new Error('La venta debe tener al menos un detalle');
        error.status = 400;
        throw error;
    }

    if (tipoPago === 'credito') {
        if (!diasPlazo || diasPlazo < 1 || diasPlazo > 365) {
            const error = new Error('Venta a crédito requiere días de plazo (1-365)');
            error.status = 400;
            throw error;
        }
    }

    const cliente = await prisma.cliente.findUnique({
        where: { id_cliente: Number(idCliente) }
    });

    if (!cliente) {
        const error = new Error('Cliente no encontrado');
        error.status = 404;
        throw error;
    }

    // Validar límite de crédito
    if (tipoPago === 'credito' && cliente.limiteCredito > 0) {
        const deudaActual = await prisma.cuentaCobrar.aggregate({
            where: { id_cliente: cliente.id_cliente, estado: { in: ['pendiente', 'parcial', 'vencida'] } },
            _sum: { montoPendiente: true }
        });
        const totalDeuda = money(deudaActual._sum.montoPendiente);

        // Calcular total de la venta actual
        let totalVenta = 0;
        for (const det of detalles) {
            const prod = await prisma.producto.findUnique({
                where: { id_producto: Number(det.idProducto) },
                include: { precios_actuales: true }
            });
            const tipoVenta = det.tipoVenta || determinarTipoVenta(det.cantidad, prod.unidades_por_caja);
            const precio = precioProducto(prod, tipoPrecio, tipoVenta);
            totalVenta += precio * Number(det.cantidad);
        }

        if (totalDeuda + totalVenta > money(cliente.limiteCredito)) {
            const error = new Error(`Límite de crédito excedido. Deuda actual: ${totalDeuda}, Límite: ${money(cliente.limiteCredito)}`);
            error.status = 400;
            throw error;
        }
    }

    const almacen = idAlmacen ? await prisma.almacen.findUnique({ where: { id_almacen: Number(idAlmacen) } })
        : await almacenService.obtenerAlmacenPrincipal();

    if (!almacen) {
        const error = new Error('No hay almacén disponible');
        error.status = 400;
        throw error;
    }

    return prisma.$transaction(async (tx) => {
        // Validar stock
        await validarStockDetalles(detalles, almacen.id_almacen, tx);

        // Obtener serie y correlativo
        const serie = 'B001'; // Por defecto boleta
        const correlativo = await obtenerSiguienteCorrelativo(serie, tx);
        const numeroCompleto = `${serie}-${String(correlativo).padStart(8, '0')}`;

        // Calcular totales
        let subtotal = 0;
        const detallesProcesados = [];

        for (const det of detalles) {
            const prod = await tx.producto.findUnique({
                where: { id_producto: Number(det.idProducto) },
                include: { precios_actuales: true }
            });

            if (!prod || !prod.activo) {
                const error = new Error(`Producto no encontrado o inactivo: ${det.idProducto}`);
                error.status = 404;
                throw error;
            }

            const tipoVenta = det.tipoVenta || determinarTipoVenta(det.cantidad, prod.unidades_por_caja);
            const precioUnitario = precioProducto(prod, normalizarTipo(tipoPrecio), tipoVenta);
            const cantidad = validarCantidad(det.cantidad);
            const descuentoItem = money(det.descuentoItem);
            const subtotalItem = Number((precioUnitario * cantidad - descuentoItem).toFixed(2));
            const igvItem = Number((subtotalItem * 0.18).toFixed(2));
            const totalItem = Number((subtotalItem + igvItem).toFixed(2));

            subtotal += subtotalItem;

            detallesProcesados.push({
                idProducto: prod.id_producto,
                tipoVenta,
                cantidad,
                precioUnitario,
                descuentoItem,
                subtotal: subtotalItem,
                igvItem,
                totalItem,
                esSugeridoIa: det.esSugeridoIa || false
            });
        }

        const igv = Number((subtotal * 0.18).toFixed(2));
        const descuentoGlobalNum = money(descuentoGlobal);
        const total = Number((subtotal + igv - descuentoGlobalNum).toFixed(2));

        const fechaEmision = new Date();
        let fechaVencimiento = null;
        if (tipoPago === 'credito' && diasPlazo) {
            fechaVencimiento = new Date(fechaEmision);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + Number(diasPlazo));
        }

        const montoPendiente = tipoPago === 'credito' ? total : 0;
        const montoPagado = tipoPago === 'contado' ? total : 0;
        const estado = tipoPago === 'contado' ? 'pagada' : 'emitida';

        const venta = await tx.venta.create({
            data: {
                serie,
                correlativo,
                numero_completo: numeroCompleto,
                tipo_documento: 'boleta',
                estado,
                fecha_emision: fechaEmision,
                fecha_vencimiento: fechaVencimiento,
                id_cotizacion: idCotizacion ? Number(idCotizacion) : null,
                id_cliente: Number(idCliente),
                id_usuario: idUsuario,
                id_almacen: almacen.id_almacen,
                subtotal,
                igv,
                total,
                descuento_global: descuentoGlobalNum,
                tipoPago,
                diasPlazo: tipoPago === 'credito' ? Number(diasPlazo) : null,
                montoPagado,
                montoPendiente,
                autorizadoPor: tipoPago === 'credito' ? idUsuario : null,
                autorizadoAt: tipoPago === 'credito' ? new Date() : null,
                observaciones,
                detalles: {
                    create: detallesProcesados.map(d => ({
                        id_producto: d.idProducto,
                        tipo_venta: d.tipoVenta,
                        cantidad: d.cantidad,
                        precio_unitario: d.precioUnitario,
                        descuento_item: d.descuentoItem,
                        subtotal: d.subtotal,
                        igv_item: d.igvItem,
                        total_item: d.totalItem,
                        es_sugerido_ia: d.esSugeridoIa
                    }))
                }
            },
            include: {
                detalles: { include: { producto: true } },
                cliente: true
            }
        });

        // Crear movimientos de inventario (salida)
        for (const det of venta.detalles) {
            const stockActual = await tx.stockActual.findUnique({
                where: {
                    id_producto_id_almacen: {
                        id_producto: det.id_producto,
                        id_almacen: almacen.id_almacen
                    }
                }
            });

            const anterior = stockActual?.cantidad || 0;
            const posterior = anterior - det.cantidad;

            await tx.inventarioMovimiento.create({
                data: {
                    id_producto: det.id_producto,
                    id_almacen: almacen.id_almacen,
                    tipo: 'salida',
                    origen: idCotizacion ? 'cotizacion_aprobada' : 'venta',
                    cantidad: det.cantidad,
                    stock_anterior: anterior,
                    stock_posterior: posterior,
                    costo_unitario: det.precio_unitario,
                    id_referencia: venta.id_venta,
                    tipo_referencia: 'venta',
                    id_usuario: idUsuario,
                    observaciones: `Venta ${venta.numero_completo}`
                }
            });

            await tx.stockActual.update({
                where: { id_stock: stockActual.id_stock },
                data: { cantidad: posterior }
            });
        }

        // Si es contado, crear pago automático
        if (tipoPago === 'contado') {
            await tx.ventaPago.create({
                data: {
                    id_venta: venta.id_venta,
                    monto: total,
                    metodo_pago: 'efectivo',
                    id_usuario: idUsuario
                }
            });
        }

        // Si es crédito, crear cuenta por cobrar
        if (tipoPago === 'credito') {
            await tx.cuentaCobrar.create({
                data: {
                    id_venta: venta.id_venta,
                    id_cliente: Number(idCliente),
                    montoOriginal: total,
                    montoPendiente: total,
                    estado: 'pendiente',
                    fechaVencimiento: fechaVencimiento
                }
            });
        }

        return venta;
    });
}

async function crearDesdeCotizacion(idCotizacion, idUsuario, { tipoPago = 'contado', diasPlazo } = {}) {
    const cotizacion = await prisma.cotizacion.findUnique({
        where: { id_cotizacion: Number(idCotizacion) },
        include: {
            detalle: { include: { producto: { include: { precios_actuales: true } } } },
            cliente: true
        }
    });

    if (!cotizacion) {
        const error = new Error('Cotización no encontrada');
        error.status = 404;
        throw error;
    }

    if (cotizacion.estado !== 'aprobada') {
        const error = new Error('Solo se pueden crear ventas desde cotizaciones aprobadas');
        error.status = 400;
        throw error;
    }

    if (cotizacion.ventas && cotizacion.ventas.length > 0) {
        const error = new Error('Esta cotización ya tiene una venta asociada');
        error.status = 400;
        throw error;
    }

    const detalles = cotizacion.detalle.map(d => ({
        idProducto: d.id_producto,
        cantidad: d.cantidad,
        tipoVenta: d.tipo_venta,
        esSugeridoIa: d.es_sugerido_ia
    }));

    return crearVenta({
        idCliente: cotizacion.id_cliente,
        idCotizacion: cotizacion.id_cotizacion,
        tipoPrecio: cotizacion.tipo_precio,
        detalles,
        tipoPago,
        diasPlazo,
        observaciones: cotizacion.observaciones,
        idAlmacen: null // Usará almacén principal
    }, idUsuario);
}

async function emitirVenta(idVenta, idUsuario) {
    const venta = await prisma.venta.findUnique({
        where: { id_venta: Number(idVenta) },
        include: { detalles: true }
    });

    if (!venta) {
        const error = new Error('Venta no encontrada');
        error.status = 404;
        throw error;
    }

    if (venta.estado !== 'borrador' && venta.estado !== 'emitida') {
        const error = new Error('La venta ya fue procesada');
        error.status = 400;
        throw error;
    }

    // Validar stock actual
    const almacen = await prisma.almacen.findUnique({ where: { id_almacen: venta.id_almacen } });
    await validarStockDetalles(venta.detalles.map(d => ({
        idProducto: d.id_producto,
        cantidad: d.cantidad
    })), almacen.id_almacen, prisma);

    return prisma.$transaction(async (tx) => {
        // Crear movimientos de inventario
        for (const det of venta.detalles) {
            const stockActual = await tx.stockActual.findUnique({
                where: {
                    id_producto_id_almacen: {
                        id_producto: det.id_producto,
                        id_almacen: almacen.id_almacen
                    }
                }
            });

            const anterior = stockActual?.cantidad || 0;
            const posterior = anterior - det.cantidad;

            await tx.inventarioMovimiento.create({
                data: {
                    id_producto: det.id_producto,
                    id_almacen: almacen.id_almacen,
                    tipo: 'salida',
                    origen: 'venta',
                    cantidad: det.cantidad,
                    stock_anterior: anterior,
                    stock_posterior: posterior,
                    costo_unitario: det.precio_unitario,
                    id_referencia: venta.id_venta,
                    tipo_referencia: 'venta',
                    id_usuario: idUsuario
                }
            });

            await tx.stockActual.update({
                where: { id_stock: stockActual.id_stock },
                data: { cantidad: posterior }
            });
        }

        // Actualizar estado
        const updated = await tx.venta.update({
            where: { id_venta: Number(idVenta) },
            data: { estado: 'emitida' },
            include: { detalles: { include: { producto: true } }, cliente: true }
        });

        return updated;
    });
}

async function listarVentas(filtros = {}) {
    const { q, estado, tipoPago, clienteId, fechaInicio, fechaFin, page = 1, limit = 50 } = filtros;
    const where = {};

    if (q) {
        where.OR = [
            { numero_completo: { contains: q, mode: 'insensitive' } },
            { cliente: { nombre: { contains: q, mode: 'insensitive' } } }
        ];
    }

    if (estado) where.estado = estado;
    if (tipoPago) where.tipoPago = tipoPago;
    if (clienteId) where.id_cliente = Number(clienteId);

    if (fechaInicio || fechaFin) {
        where.fecha_emision = {};
        if (fechaInicio) where.fecha_emision.gte = new Date(fechaInicio);
        if (fechaFin) where.fecha_emision.lte = new Date(fechaFin);
    }

    const [ventas, total] = await Promise.all([
        prisma.venta.findMany({
            where,
            include: {
                cliente: { select: { nombre: true, tipo: true } },
                usuario: { select: { nombre: true } },
                detalles: { include: { producto: { select: { codigo: true, descripcion: true } } } },
                pagos: true
            },
            orderBy: { fecha_emision: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.venta.count({ where })
    ]);

    return { ventas, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function obtenerVenta(idVenta) {
    return prisma.venta.findUnique({
        where: { id_venta: Number(idVenta) },
        include: {
            cliente: true,
            usuario: { select: { nombre: true, email: true } },
            almacen: true,
            detalles: { include: { producto: { include: { precios_actuales: true } } } },
            pagos: { include: { usuario: { select: { nombre: true } } }, orderBy: { fecha_pago: 'desc' } },
            cuentasCobrar: true
        }
    });
}

module.exports = {
    crearVenta,
    crearDesdeCotizacion,
    emitirVenta,
    listarVentas,
    obtenerVenta
};
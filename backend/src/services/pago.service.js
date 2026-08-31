/**
 * Servicio de Pagos
 * Registro de pagos, actualización de montos, gestión de estado de venta y cuenta por cobrar
 */

const prisma = require('../config/prisma');

function money(value) {
    return Number(value || 0);
}

async function registrarPago({ ventaId, monto, metodoPago, referencia, idUsuario }) {
    if (!ventaId || !monto || monto <= 0) {
        const error = new Error('Venta ID y monto son requeridos (monto > 0)');
        error.status = 400;
        throw error;
    }

    const venta = await prisma.venta.findUnique({
        where: { id_venta: Number(ventaId) },
        include: { cuentasCobrar: true }
    });

    if (!venta) {
        const error = new Error('Venta no encontrada');
        error.status = 404;
        throw error;
    }

    if (venta.montoPendiente <= 0) {
        const error = new Error('La venta no tiene monto pendiente');
        error.status = 400;
        throw error;
    }

    if (money(monto) > money(venta.montoPendiente)) {
        const error = new Error(`Monto excede lo pendiente. Pendiente: ${money(venta.montoPendiente)}`);
        error.status = 400;
        throw error;
    }

    return prisma.$transaction(async (tx) => {
        // Crear registro de pago
        const pago = await tx.ventaPago.create({
            data: {
                id_venta: venta.id_venta,
                monto: money(monto),
                metodo_pago: metodoPago || 'efectivo',
                referencia: referencia || null,
                id_usuario: idUsuario
            }
        });

        // Actualizar venta
        const nuevoMontoPagado = money(venta.montoPagado) + money(monto);
        const nuevoMontoPendiente = money(venta.montoPendiente) - money(monto);
        let nuevoEstado = venta.estado;

        if (nuevoMontoPendiente <= 0) {
            nuevoEstado = 'pagada';
        } else if (nuevoMontoPagado > 0) {
            nuevoEstado = 'parcial';
        }

        await tx.venta.update({
            where: { id_venta: venta.id_venta },
            data: {
                montoPagado: nuevoMontoPagado,
                montoPendiente: Math.max(0, nuevoMontoPendiente),
                estado: nuevoEstado
            }
        });

        // Actualizar cuenta por cobrar si existe
        if (venta.cuentasCobrar && venta.cuentasCobrar.length > 0) {
            const cuenta = venta.cuentasCobrar[0];
            const nuevoMontoPendienteCuenta = money(cuenta.montoPendiente) - money(monto);
            let nuevoEstadoCuenta = cuenta.estado;

            if (nuevoMontoPendienteCuenta <= 0) {
                nuevoEstadoCuenta = 'pagada';
            } else if (nuevoMontoPendienteCuenta < money(cuenta.montoOriginal)) {
                nuevoEstadoCuenta = 'parcial';
            }

            await tx.cuentaCobrar.update({
                where: { id_cuenta: cuenta.id_cuenta },
                data: {
                    montoPendiente: Math.max(0, nuevoMontoPendienteCuenta),
                    estado: nuevoEstadoCuenta
                }
            });
        }

        return { pago, venta: { ...venta, montoPagado: nuevoMontoPagado, montoPendiente: Math.max(0, nuevoMontoPendiente), estado: nuevoEstado } };
    });
}

async function listarPagos(ventaId) {
    return prisma.ventaPago.findMany({
        where: { id_venta: Number(ventaId) },
        include: { usuario: { select: { nombre: true } } },
        orderBy: { fecha_pago: 'desc' }
    });
}

async function obtenerResumenPagos(ventaId) {
    const pagos = await listarPagos(ventaId);
    const totalPagado = pagos.reduce((sum, p) => sum + money(p.monto), 0);

    return {
        pagos,
        totalPagado,
        count: pagos.length
    };
}

module.exports = {
    registrarPago,
    listarPagos,
    obtenerResumenPagos
};
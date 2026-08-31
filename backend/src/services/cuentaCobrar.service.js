/**
 * Servicio de Cuentas por Cobrar
 * Consultas, listados, actualización de días de atraso
 */

const prisma = require('../config/prisma');

function money(value) {
    return Number(value || 0);
}

async function listarCuentasCobrar(filtros = {}) {
    const { clienteId, estado, vencidas, page = 1, limit = 50 } = filtros;
    const where = {};

    if (clienteId) where.id_cliente = Number(clienteId);
    if (estado) where.estado = estado;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (vencidas === 'true' || vencidas === true) {
        where.fechaVencimiento = { lt: hoy };
        where.estado = { in: ['pendiente', 'parcial', 'vencida'] };
    }

    const [cuentas, total] = await Promise.all([
        prisma.cuentaCobrar.findMany({
            where,
            include: {
                cliente: { select: { nombre: true, telefono: true, email: true, tipo: true } },
                venta: { select: { numero_completo: true, fecha_emision: true, total: true } }
            },
            orderBy: { fechaVencimiento: 'asc' },
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.cuentaCobrar.count({ where })
    ]);

    // Calcular días de atraso en tiempo real
    const cuentasConAtraso = cuentas.map(c => ({
        ...c,
        diasAtraso: c.estado === 'pagada' ? 0 : Math.max(0, Math.floor((hoy - new Date(c.fechaVencimiento)) / (1000 * 60 * 60 * 24)))
    }));

    return { cuentas: cuentasConAtraso, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function obtenerCuentasVencidas() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return prisma.cuentaCobrar.findMany({
        where: {
            fechaVencimiento: { lt: hoy },
            estado: { in: ['pendiente', 'parcial', 'vencida'] }
        },
        include: {
            cliente: { select: { nombre: true, telefono: true, email: true } },
            venta: { select: { numero_completo: true, fecha_emision: true, total: true } }
        },
        orderBy: { fechaVencimiento: 'asc' }
    });
}

async function obtenerEstadoCuentaCliente(clienteId) {
    const cuentas = await prisma.cuentaCobrar.findMany({
        where: { id_cliente: Number(clienteId) },
        include: { venta: { select: { numero_completo: true, total: true } } },
        orderBy: { fechaVencimiento: 'asc' }
    });

    const hoy = new Date();
    let totalPendiente = 0;
    let totalVencido = 0;
    let porVencer = [];

    for (const c of cuentas) {
        const pendiente = money(c.montoPendiente);
        const diasAtraso = c.estado === 'pagada' ? 0 : Math.max(0, Math.floor((hoy - new Date(c.fechaVencimiento)) / (1000 * 60 * 60 * 24)));

        if (c.estado !== 'pagada') {
            totalPendiente += pendiente;
            if (diasAtraso > 0) totalVencido += pendiente;
        }

        if (diasAtraso <= 0 && c.estado !== 'pagada') {
            porVencer.push({ ...c, diasAtraso, pendiente });
        }
    }

    return {
        clienteId: Number(clienteId),
        totalPendiente,
        totalVencido,
        cuentasActivas: cuentas.filter(c => c.estado !== 'pagada').length,
        cuentas: cuentas.map(c => ({
            ...c,
            diasAtraso: c.estado === 'pagada' ? 0 : Math.max(0, Math.floor((hoy - new Date(c.fechaVencimiento)) / (1000 * 60 * 60 * 24)))
        }))
    };
}

async function actualizarDiasAtraso() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Actualizar cuentas vencidas
    const result = await prisma.cuentaCobrar.updateMany({
        where: {
            fechaVencimiento: { lt: hoy },
            estado: { in: ['pendiente', 'parcial'] }
        },
        data: { estado: 'vencida' }
    });

    console.log(`[CobranzaJob] ${result.count} cuentas marcadas como vencidas`);

    return result.count;
}

async function obtenerResumenCobranza() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [pendientes, vencidas, porVencer, pagadasMes] = await Promise.all([
        prisma.cuentaCobrar.aggregate({
            where: { estado: { in: ['pendiente', 'parcial'] } },
            _sum: { montoPendiente: true },
            _count: true
        }),
        prisma.cuentaCobrar.aggregate({
            where: { fechaVencimiento: { lt: hoy }, estado: { in: ['pendiente', 'parcial', 'vencida'] } },
            _sum: { montoPendiente: true },
            _count: true
        }),
        prisma.cuentaCobrar.aggregate({
            where: { fechaVencimiento: { gte: hoy }, estado: { in: ['pendiente', 'parcial'] } },
            _sum: { montoPendiente: true },
            _count: true
        }),
        prisma.ventaPago.aggregate({
            where: {
                fecha_pago: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1) }
            },
            _sum: { monto: true },
            _count: true
        })
    ]);

    const totalPendiente = money(pendientes._sum.montoPendiente);
    const totalVencido = money(vencidas._sum.montoPendiente);
    const carteraVencidaPct = totalPendiente > 0 ? Number(((totalVencido / totalPendiente) * 100).toFixed(2)) : 0;

    return {
        totalPendiente,
        totalVencido,
        carteraVencidaPct,
        cuentasPendientes: pendientes._count,
        cuentasVencidas: vencidas._count,
        montoCobradoMes: money(pagadasMes._sum.monto),
        pagosCountMes: pagadasMes._count
    };
}

module.exports = {
    listarCuentasCobrar,
    obtenerCuentasVencidas,
    obtenerEstadoCuentaCliente,
    actualizarDiasAtraso,
    obtenerResumenCobranza
};
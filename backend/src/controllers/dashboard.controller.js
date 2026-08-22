const prisma = require('../config/prisma');

async function resumen(_req, res, next) {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);

        const [
            totalProductos,
            cotizacionesAceptadas,
            ventasDelMes,
            cotizacionesDelMes,
            bajoStock,
            ultimasCotizaciones,
            ventasPorMesRaw,
            cotizacionesPorEstadoRaw
        ] = await Promise.all([
            prisma.producto.count({ where: { activo: true } }),
            prisma.cotizacion.count({ where: { estado: 'aprobada' } }),
            prisma.cotizacion.aggregate({
                where: {
                    estado: 'aprobada',
                    created_at: { gte: startOfMonth, lte: endOfMonth }
                },
                _sum: { total: true }
            }),
            prisma.cotizacion.count({
                where: { created_at: { gte: startOfMonth, lte: endOfMonth } }
            }),
            prisma.producto.findMany({
                where: {
                    activo: true,
                    stock_total: { lte: prisma.producto.fields.stock_minimo }
                },
                select: { id_producto: true, codigo: true, descripcion: true, stock_total: true, stock_minimo: true },
                orderBy: [{ stock_total: 'asc' }, { codigo: 'asc' }],
                take: 8
            }),
            prisma.cotizacion.findMany({
                include: { cliente: { select: { nombre: true } } },
                orderBy: { created_at: 'desc' },
                take: 8
            }),
            prisma.$queryRaw`
                SELECT 
                    to_char(created_at, 'Mon') AS mes,
                    COALESCE(SUM(CASE WHEN estado = 'aprobada' THEN total ELSE 0 END), 0) AS total
                FROM cotizaciones
                WHERE created_at >= ${fiveMonthsAgo}
                GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), to_char(created_at, 'Mon')
                ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
            `,
            prisma.cotizacion.groupBy({
                by: ['estado'],
                _count: { estado: true }
            })
        ]);

        const ventasPorMes = ventasPorMesRaw.map(row => ({
            mes: row.mes,
            total: Number(row.total)
        }));

        const cotizacionesPorEstado = cotizacionesPorEstadoRaw.map(row => ({
            estado: row.estado,
            total: row._count.estado
        }));

        res.json({
            success: true,
            data: {
                metricas: {
                    totalProductos,
                    cotizacionesAceptadas,
                    totalVentasMes: Number(ventasDelMes._sum.total || 0),
                    totalCotizaciones: cotizacionesDelMes
                },
                bajoStock,
                ultimasCotizaciones: ultimasCotizaciones.map(c => ({
                    id_cotizacion: c.id_cotizacion,
                    numero: c.numero,
                    total: Number(c.total || 0),
                    estado: c.estado,
                    created_at: c.created_at,
                    cliente_nombre: c.cliente?.nombre ?? null
                })),
                ventasPorMes,
                cotizacionesPorEstado
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    resumen
};
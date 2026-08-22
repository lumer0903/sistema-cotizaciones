const prisma = require('../config/prisma');

async function resumen(req, res, next) {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);
        const userId = req.usuario?.id_usuario;
        const userRole = req.usuario?.rol;

        // Métricas comunes
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
                include: { 
                    cliente: { select: { nombre: true } },
                    usuario: { select: { nombre: true } }
                },
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

        // Métricas base para ambos roles
        const baseData = {
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
                cliente_nombre: c.cliente?.nombre ?? null,
                vendedor_nombre: c.usuario?.nombre ?? null
            })),
            ventasPorMes,
            cotizacionesPorEstado
        };

        // Si es vendedor (empleado), agregar métricas específicas del usuario
        if (userRole === 'vendedor' && userId) {
            const [
                misCotizaciones,
                cotizacionesPendientes,
                misVentasMes,
                misVentasPorMesRaw,
                misCotizacionesPorEstadoRaw
            ] = await Promise.all([
                prisma.cotizacion.count({ where: { id_usuario: userId } }),
                prisma.cotizacion.count({ where: { id_usuario: userId, estado: 'enviada' } }),
                prisma.cotizacion.aggregate({
                    where: {
                        id_usuario: userId,
                        estado: 'aprobada',
                        created_at: { gte: startOfMonth, lte: endOfMonth }
                    },
                    _sum: { total: true }
                }),
                prisma.$queryRaw`
                    SELECT 
                        to_char(created_at, 'Mon') AS mes,
                        COALESCE(SUM(CASE WHEN estado = 'aprobada' THEN total ELSE 0 END), 0) AS total
                    FROM cotizaciones
                    WHERE id_usuario = ${userId} AND created_at >= ${fiveMonthsAgo}
                    GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), to_char(created_at, 'Mon')
                    ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
                `,
                prisma.cotizacion.groupBy({
                    by: ['estado'],
                    where: { id_usuario: userId },
                    _count: { estado: true }
                })
            ]);

            const misVentasPorMes = misVentasPorMesRaw.map(row => ({
                mes: row.mes,
                total: Number(row.total)
            }));

            const misCotizacionesPorEstado = misCotizacionesPorEstadoRaw.map(row => ({
                estado: row.estado,
                total: row._count.estado
            }));

            return res.json({
                success: true,
                data: {
                    ...baseData,
                    metricas: {
                        ...baseData.metricas,
                        misCotizaciones,
                        cotizacionesPendientes,
                        misVentasMes: Number(misVentasMes._sum.total || 0)
                    },
                    misVentasPorMes,
                    misCotizacionesPorEstado
                }
            });
        }

        // Si es admin o gerente, agregar métricas de admin
        if (['admin', 'gerente'].includes(userRole)) {
            const totalUsuarios = await prisma.usuario.count({ where: { activo: true } });
            
            return res.json({
                success: true,
                data: {
                    ...baseData,
                    metricas: {
                        ...baseData.metricas,
                        totalUsuarios
                    }
                }
            });
        }

        // Fallback (no debería ocurrir)
        return res.json({ success: true, data: baseData });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    resumen
};
const db = require('../config/db');

async function resumen(_req, res, next) {
    try {
        const [[productos]] = await db.query(
            'SELECT COUNT(*) AS total FROM productos WHERE activo = 1'
        );
        const [[cotizacionesAceptadas]] = await db.query(
            'SELECT COUNT(*) AS total FROM cotizaciones WHERE estado = "aprobada"'
        );
        const [[ventasAprobadas]] = await db.query(
            `SELECT COALESCE(SUM(total), 0) AS total
             FROM cotizaciones
             WHERE estado = "aprobada"`
        );
        const [[cotizaciones]] = await db.query(
            'SELECT COUNT(*) AS total FROM cotizaciones'
        );
        const [bajoStock] = await db.query(
            `SELECT id_producto, codigo, descripcion, stock_total, stock_minimo
             FROM productos
             WHERE activo = 1 AND stock_total <= COALESCE(stock_minimo, 10)
             ORDER BY stock_total ASC, codigo ASC
             LIMIT 8`
        );
        const [ultimasCotizaciones] = await db.query(
            `SELECT
                co.id_cotizacion,
                co.numero,
                co.total,
                co.estado,
                co.created_at,
                cl.nombre AS cliente_nombre
             FROM cotizaciones co
             LEFT JOIN clientes cl ON cl.id_cliente = co.id_cliente
             ORDER BY co.created_at DESC
             LIMIT 8`
        );
        const [ventasPorMes] = await db.query(
            `SELECT
                DATE_FORMAT(created_at, '%b') AS mes,
                COALESCE(SUM(CASE WHEN estado = "aprobada" THEN total ELSE 0 END), 0) AS total
             FROM cotizaciones
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
             GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b')
             ORDER BY YEAR(created_at), MONTH(created_at)`
        );
        const [cotizacionesPorEstado] = await db.query(
            `SELECT estado, COUNT(*) AS total
             FROM cotizaciones
             GROUP BY estado`
        );

        res.json({
            success: true,
            data: {
                metricas: {
                    totalProductos: productos.total,
                    cotizacionesAceptadas: cotizacionesAceptadas.total,
                    totalVentas: Number(ventasAprobadas.total || 0),
                    totalVentasMes: Number(ventasAprobadas.total || 0),
                    totalCotizaciones: cotizaciones.total
                },
                bajoStock,
                ultimasCotizaciones,
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

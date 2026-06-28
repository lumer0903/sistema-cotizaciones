const db = require('../config/db');

async function resumen(_req, res, next) {
    try {
        const [[productos]] = await db.query(
            'SELECT COUNT(*) AS total FROM productos WHERE activo = 1'
        );
        const [[cotizacionesAceptadas]] = await db.query(
            'SELECT COUNT(*) AS total FROM cotizaciones WHERE estado = "aprobada"'
        );
        const [[ventasMes]] = await db.query(
            `SELECT COALESCE(SUM(total), 0) AS total
             FROM cotizaciones
             WHERE estado = "aprobada"
               AND YEAR(created_at) = YEAR(CURDATE())
               AND MONTH(created_at) = MONTH(CURDATE())`
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

        res.json({
            success: true,
            data: {
                metricas: {
                    totalProductos: productos.total,
                    cotizacionesAceptadas: cotizacionesAceptadas.total,
                    totalVentasMes: Number(ventasMes.total || 0),
                    totalCotizaciones: cotizaciones.total
                },
                bajoStock,
                ultimasCotizaciones
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    resumen
};

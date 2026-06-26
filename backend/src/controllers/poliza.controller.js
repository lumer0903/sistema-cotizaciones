const { procesarPoliza } = require('../services/poliza.service');
const db = require('../config/db');

const subirPoliza = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const modoPrueba = req.query.prueba === 'true';
        console.log("📂 Archivo recibido:", req.file);
        const resumen = await procesarPoliza(req.file.path, modoPrueba);

        res.json({
            mensaje: modoPrueba
                ? `Modo prueba: se encontraron ${resumen.length} productos`
                : `Póliza procesada: ${resumen.length} productos importados`,
            productos: resumen,
            modoPrueba
        });

    } catch (error) {
        console.error("❌ Error en subirPoliza:", error);
        res.status(500).json({ error: 'Error procesando el archivo' });
    }
};

const obtenerProductos = async (req, res) => {
    const busqueda = req.query.q || '';
    const sql = `
        SELECT 
            p.id_producto,
            p.codigo,
            p.descripcion,
            p.stock_total,
            p.foto_url,
            pr.precio_unidad_normal, 
            pr.precio_docena_normal, 
            pr.precio_mayor_normal,
            pr.precio_unidad_dist,
            pr.precio_docena_dist,
            pr.precio_mayor_dist
        FROM productos p
        LEFT JOIN precios_actuales pr ON p.id_producto = pr.id_producto
        WHERE p.activo = 1
        AND (p.codigo LIKE ? OR p.descripcion LIKE ?)
        LIMIT 1000
    `;
    try {
        const [results] = await db.query(sql, [`%${busqueda}%`, `%${busqueda}%`]);
        res.json(results);
    } catch (error) {
        console.error("❌ Error en obtenerProductos:", error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
};

const obtenerStats = async (req, res) => {
    try {
        const [totalProductos] = await db.query(
            'SELECT COUNT(*) AS total FROM productos WHERE activo = 1'
        );
        res.json({
            totalProductos: totalProductos[0].total
        });
    } catch (error) {
        console.error('❌ Error en obtenerStats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

module.exports = { subirPoliza, obtenerProductos, obtenerStats };

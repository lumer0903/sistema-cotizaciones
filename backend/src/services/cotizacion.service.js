const db = require('../config/db');
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
    return money(producto[campoPrecio(tipoPrecio, tipoVenta)]);
}

async function generarNumero(connection) {
    const year = new Date().getFullYear();
    const [rows] = await connection.query(
        'SELECT COUNT(*) AS total FROM cotizaciones WHERE YEAR(created_at) = ?',
        [year]
    );
    return `COT-${year}-${String(rows[0].total + 1).padStart(3, '0')}`;
}

async function recalcularTotales(connection, idCotizacion) {
    const [[totales]] = await connection.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS subtotal
         FROM cotizacion_detalle
         WHERE id_cotizacion = ?`,
        [idCotizacion]
    );
    const subtotal = money(totales.subtotal);
    const igv = Number((subtotal * 0.18).toFixed(2));
    const total = Number((subtotal + igv).toFixed(2));

    await connection.query(
        `UPDATE cotizaciones
         SET subtotal = ?, igv = ?, total = ?
         WHERE id_cotizacion = ?`,
        [subtotal, igv, total, idCotizacion]
    );
}

async function listarCotizaciones({ q, estado, fecha } = {}) {
    const filtros = [];
    const params = [];

    if (q) {
        filtros.push('(co.numero LIKE ? OR cl.nombre LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
    }

    if (estado && estado !== 'todos') {
        filtros.push('co.estado = ?');
        params.push(estado);
    }

    if (fecha) {
        filtros.push('DATE(co.created_at) = ?');
        params.push(fecha);
    }

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const [rows] = await db.query(
        `SELECT
            co.id_cotizacion,
            co.numero,
            co.tipo_precio,
            co.subtotal,
            co.igv,
            co.total,
            co.estado,
            co.created_at,
            cl.nombre AS cliente_nombre,
            cl.email,
            cl.telefono,
            cl.ruc_dni
         FROM cotizaciones co
         LEFT JOIN clientes cl ON cl.id_cliente = co.id_cliente
         ${where}
         ORDER BY co.created_at DESC
         LIMIT 200`,
        params
    );

    return rows;
}

async function crearCotizacion(payload, idUsuario) {
    const connection = await db.getConnection();
    const tipoPrecio = normalizarTipo(payload.tipo_precio);

    try {
        await connection.beginTransaction();

        let idCliente = null;
        if (payload.cliente_nombre) {
            const [cliente] = await connection.query(
                `INSERT INTO clientes (nombre, telefono, email, ruc_dni, tipo)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    payload.cliente_nombre,
                    payload.telefono || null,
                    payload.email || null,
                    payload.ruc_dni || null,
                    tipoPrecio
                ]
            );
            idCliente = cliente.insertId;
        }

        const numero = await generarNumero(connection);
        const [cotizacion] = await connection.query(
            `INSERT INTO cotizaciones
                (numero, id_cliente, id_usuario, tipo_precio, estado, observaciones, tiempo_inicio)
             VALUES (?, ?, ?, ?, 'borrador', ?, NOW())`,
            [numero, idCliente, idUsuario, tipoPrecio, payload.observaciones || '']
        );

        await connection.commit();
        return obtenerCotizacion(cotizacion.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function obtenerCotizacion(idCotizacion) {
    const [rows] = await db.query(
        `SELECT
            co.*,
            cl.nombre AS cliente_nombre,
            cl.telefono,
            cl.email,
            cl.ruc_dni
         FROM cotizaciones co
         LEFT JOIN clientes cl ON cl.id_cliente = co.id_cliente
         WHERE co.id_cotizacion = ?
         LIMIT 1`,
        [idCotizacion]
    );

    const cotizacion = rows[0];
    if (!cotizacion) return null;

    const [detalle] = await db.query(
        `SELECT
            d.id_detalle,
            d.id_producto,
            d.tipo_venta,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            d.es_sugerido_ia,
            p.codigo,
            p.descripcion,
            p.stock_total,
            p.foto_url,
            pa.precio_unidad_normal,
            pa.precio_docena_normal,
            pa.precio_mayor_normal,
            pa.precio_unidad_dist,
            pa.precio_docena_dist,
            pa.precio_mayor_dist
         FROM cotizacion_detalle d
         JOIN productos p ON p.id_producto = d.id_producto
         LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
         WHERE d.id_cotizacion = ?
         ORDER BY d.id_detalle DESC`,
        [idCotizacion]
    );

    return { ...cotizacion, detalle };
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

    await db.query(
        'UPDATE cotizaciones SET estado = ?, tiempo_fin = IF(? IN ("aprobada","rechazada"), NOW(), tiempo_fin) WHERE id_cotizacion = ?',
        [estado, estado, idCotizacion]
    );
    return obtenerCotizacion(idCotizacion);
}

async function buscarProductos(idCotizacion, q = '') {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    if (!cotizacion) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    const [rows] = await db.query(
        `SELECT p.*, pa.*
         FROM productos p
         LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
         WHERE p.activo = 1
           AND (? = '' OR p.codigo LIKE ? OR p.descripcion LIKE ?)
         ORDER BY p.codigo
         LIMIT 20`,
        [q, `%${q}%`, `%${q}%`]
    );

    return rows.map((producto) => ({
        ...producto,
        precio_unidad: precioProducto(producto, cotizacion.tipo_precio, 'unidad'),
        precio_docena: precioProducto(producto, cotizacion.tipo_precio, 'docena'),
        precio_mayor: precioProducto(producto, cotizacion.tipo_precio, 'mayor')
    }));
}

async function agregarDetalle(idCotizacion, payload) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    if (!cotizacion) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    const tipoVenta = payload.tipo_venta || 'unidad';
    const cantidad = Math.max(1, Number(payload.cantidad || 1));
    const [productos] = await db.query(
        `SELECT p.*, pa.*
         FROM productos p
         LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
         WHERE p.id_producto = ? AND p.activo = 1
         LIMIT 1`,
        [payload.id_producto]
    );
    const producto = productos[0];
    if (!producto) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }

    const precio = payload.precio_unitario !== undefined
        ? money(payload.precio_unitario)
        : precioProducto(producto, cotizacion.tipo_precio, tipoVenta);
    const subtotal = Number((precio * cantidad).toFixed(2));
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        await connection.query(
            `INSERT INTO cotizacion_detalle
                (id_cotizacion, id_producto, tipo_venta, cantidad, precio_unitario, subtotal, es_sugerido_ia)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idCotizacion, producto.id_producto, tipoVenta, cantidad, precio, subtotal, payload.es_sugerido_ia ? 1 : 0]
        );
        await recalcularTotales(connection, idCotizacion);
        await connection.commit();
        return obtenerCotizacion(idCotizacion);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function actualizarDetalle(idCotizacion, idDetalle, payload) {
    const tipoVenta = payload.tipo_venta || 'unidad';
    const cantidad = Math.max(1, Number(payload.cantidad || 1));
    const precio = money(payload.precio_unitario);
    const subtotal = Number((precio * cantidad).toFixed(2));
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        await connection.query(
            `UPDATE cotizacion_detalle
             SET tipo_venta = ?, cantidad = ?, precio_unitario = ?, subtotal = ?
             WHERE id_detalle = ? AND id_cotizacion = ?`,
            [tipoVenta, cantidad, precio, subtotal, idDetalle, idCotizacion]
        );
        await recalcularTotales(connection, idCotizacion);
        await connection.commit();
        return obtenerCotizacion(idCotizacion);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function eliminarDetalle(idCotizacion, idDetalle) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        await connection.query(
            'DELETE FROM cotizacion_detalle WHERE id_detalle = ? AND id_cotizacion = ?',
            [idDetalle, idCotizacion]
        );
        await recalcularTotales(connection, idCotizacion);
        await connection.commit();
        return obtenerCotizacion(idCotizacion);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function recomendar(idCotizacion, idProducto) {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    if (!cotizacion) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

    const [productos] = await db.query(
        `SELECT p.*, pa.*
         FROM productos p
         LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
         WHERE p.activo = 1`
    );
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
    buscarProductos,
    agregarDetalle,
    actualizarDetalle,
    eliminarDetalle,
    recomendar
};

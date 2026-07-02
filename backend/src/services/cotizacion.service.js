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

async function generarNumero(connection) {
    const year = new Date().getFullYear();
    await connection.query('SELECT GET_LOCK(?, 5)', [`cotizaciones_numero_${year}`]);
    const [rows] = await connection.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero, '-', -1) AS UNSIGNED)), 0) AS ultimo
         FROM cotizaciones
         WHERE numero LIKE ?`,
        [`COT-${year}-%`]
    );
    return `COT-${year}-${String(Number(rows[0].ultimo || 0) + 1).padStart(3, '0')}`;
}

async function liberarNumero(connection) {
    const year = new Date().getFullYear();
    try {
        await connection.query('SELECT RELEASE_LOCK(?)', [`cotizaciones_numero_${year}`]);
    } catch (_error) {
        // El lock se libera tambien al cerrar la conexion; no debe ocultar el resultado real.
    }
}

async function obtenerExtrasCotizacion(connection, idCotizacion) {
    const [[extras]] = await connection.query(
        `SELECT incluye_carreta, costo_carreta
         FROM cotizaciones
         WHERE id_cotizacion = ?
         LIMIT 1`,
        [idCotizacion]
    );
    return {
        incluyeCarreta: Boolean(Number(extras?.incluye_carreta || 0)),
        costoCarreta: money(extras?.costo_carreta)
    };
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
    const extras = await obtenerExtrasCotizacion(connection, idCotizacion);
    const cargoCarreta = extras.incluyeCarreta ? extras.costoCarreta : 0;
    const total = Number((subtotal + igv + cargoCarreta).toFixed(2));

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
            co.incluye_carreta,
            co.costo_carreta,
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
        await liberarNumero(connection);
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

    await db.query(
        'UPDATE cotizaciones SET estado = ?, tiempo_fin = IF(? IN ("aprobada","rechazada"), NOW(), tiempo_fin) WHERE id_cotizacion = ?',
        [estado, estado, idCotizacion]
    );
    return obtenerCotizacion(idCotizacion);
}

async function actualizarObservaciones(idCotizacion, observaciones = '') {
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    const [resultado] = await db.query(
        'UPDATE cotizaciones SET observaciones = ? WHERE id_cotizacion = ?',
        [String(observaciones || '').trim(), idCotizacion]
    );

    if (resultado.affectedRows === 0) {
        const error = new Error('Cotizacion no encontrada');
        error.status = 404;
        throw error;
    }

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

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            `UPDATE cotizaciones
             SET incluye_carreta = ?, costo_carreta = ?
             WHERE id_cotizacion = ?`,
            [incluyeCarreta ? 1 : 0, costoCarreta, idCotizacion]
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
    asegurarEditable(cotizacion);

    const tipoVenta = validarTipoVenta(payload.tipo_venta || 'unidad');
    const cantidad = validarCantidad(payload.cantidad);
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

    const precio = precioProducto(producto, cotizacion.tipo_precio, tipoVenta);
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
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

    const tipoVenta = validarTipoVenta(payload.tipo_venta || 'unidad');
    const cantidad = validarCantidad(payload.cantidad);
    const idProducto = Number(payload.id_producto || 0);
    let precio = 0;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const [productos] = await connection.query(
            `SELECT p.*, pa.*
             FROM productos p
             LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
             WHERE p.id_producto = IF(? > 0, ?, (
                SELECT id_producto FROM cotizacion_detalle WHERE id_detalle = ? AND id_cotizacion = ? LIMIT 1
             ))
               AND p.activo = 1
             LIMIT 1`,
            [idProducto, idProducto, idDetalle, idCotizacion]
        );
        const producto = productos[0];
        if (!producto) {
            const error = new Error('Producto no encontrado');
            error.status = 404;
            throw error;
        }

        precio = precioProducto(producto, cotizacion.tipo_precio, tipoVenta);
        const subtotal = Number((precio * cantidad).toFixed(2));
        await connection.query(
            `UPDATE cotizacion_detalle
             SET id_producto = IF(? > 0, ?, id_producto),
                 tipo_venta = ?,
                 cantidad = ?,
                 precio_unitario = ?,
                 subtotal = ?
             WHERE id_detalle = ? AND id_cotizacion = ?`,
            [idProducto, idProducto, tipoVenta, cantidad, precio, subtotal, idDetalle, idCotizacion]
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
    const cotizacion = await obtenerCotizacion(idCotizacion);
    asegurarEditable(cotizacion);

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
    actualizarObservaciones,
    actualizarCarreta,
    buscarProductos,
    agregarDetalle,
    actualizarDetalle,
    eliminarDetalle,
    recomendar
};

const fs = require('fs');
const db = require('../config/db');

const PRECIO_CAMPOS = [
    'costo_normal',
    'precio_unidad_normal',
    'precio_docena_normal',
    'precio_mayor_normal',
    'costo_distribuidor',
    'precio_unidad_dist',
    'precio_docena_dist',
    'precio_mayor_dist'
];

function normalizarTexto(valor) {
    return String(valor ?? '').trim();
}

function normalizarCodigo(valor) {
    return normalizarTexto(valor).toUpperCase();
}

function normalizarClave(valor) {
    return normalizarTexto(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function tomar(normalizada, claves, fallback = '') {
    const clave = claves.find((item) => normalizada[item] !== undefined && normalizada[item] !== '');
    return clave ? normalizada[clave] : fallback;
}

function numero(valor, fallback = 0) {
    if (valor === null || valor === undefined || valor === '') return fallback;
    const limpio = String(valor).replace('S/', '').replace(',', '.').trim();
    const convertido = Number(limpio);
    return Number.isFinite(convertido) ? convertido : fallback;
}

function parseCsvLine(line, delimiter) {
    const values = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && quoted && next === '"') {
            current += '"';
            i++;
            continue;
        }

        if (char === '"') {
            quoted = !quoted;
            continue;
        }

        if (char === delimiter && !quoted) {
            values.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current);
    return values;
}

function parseCsv(content) {
    const lines = content
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '');

    if (!lines.length) return [];

    const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const headers = parseCsvLine(lines[0], delimiter);

    return lines.slice(1).map((line) => {
        const values = parseCsvLine(line, delimiter);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
}

function mapearFilaCsv(fila) {
    const normalizada = {};

    Object.entries(fila).forEach(([clave, valor]) => {
        normalizada[normalizarClave(clave)] = valor;
    });

    return {
        codigo: normalizarCodigo(tomar(normalizada, ['codigo', 'cod', 'sku', 'item'])),
        descripcion: normalizarTexto(tomar(normalizada, ['descripcion', 'description', 'nombre', 'producto'])),
        stock_total: numero(tomar(normalizada, ['stock_total', 'stock', 'cantidad', 'cant', 'cantidad_stock', 'stock_disponible', 'existencias', 'existencia', 'unidades'], 0), 0),
        stock_minimo: numero(tomar(normalizada, ['stock_minimo', 'stock_min', 'minimo', 'stock_alerta'], 10), 10),
        foto_url: normalizarTexto(tomar(normalizada, ['foto_url', 'foto', 'imagen', 'image'])),
        id_categoria: numero(tomar(normalizada, ['id_categoria'], null), null),
        categoria: normalizarTexto(tomar(normalizada, ['categoria', 'nombre_categoria', 'category'])),
        costo_normal: numero(normalizada.costo_normal, 0),
        precio_unidad_normal: numero(normalizada.precio_unidad_normal, 0),
        precio_docena_normal: numero(normalizada.precio_docena_normal, 0),
        precio_mayor_normal: numero(normalizada.precio_mayor_normal, 0),
        costo_distribuidor: numero(normalizada.costo_distribuidor, 0),
        precio_unidad_dist: numero(normalizada.precio_unidad_dist, 0),
        precio_docena_dist: numero(normalizada.precio_docena_dist, 0),
        precio_mayor_dist: numero(normalizada.precio_mayor_dist, 0)
    };
}

function validarProducto(producto) {
    const errores = [];

    if (!producto.codigo) errores.push('codigo es obligatorio');
    if (!producto.descripcion) errores.push('descripcion es obligatoria');

    return errores;
}

async function listarCategorias() {
    const [rows] = await db.query(
        `SELECT id_categoria, nombre_categoria
         FROM categorias
         ORDER BY nombre_categoria`
    );

    return rows;
}

async function resolverCategoria(connection, producto) {
    if (producto.id_categoria) return producto.id_categoria;
    if (!producto.categoria) return null;

    const [existentes] = await connection.query(
        'SELECT id_categoria FROM categorias WHERE nombre_categoria = ? LIMIT 1',
        [producto.categoria]
    );

    if (existentes[0]) return existentes[0].id_categoria;

    const [resultado] = await connection.query(
        'INSERT INTO categorias (nombre_categoria) VALUES (?)',
        [producto.categoria]
    );

    return resultado.insertId;
}

async function listarProductos({ q, categoria } = {}) {
    const filtros = ['p.activo = 1'];
    const params = [];

    if (q) {
        filtros.push('(p.codigo LIKE ? OR p.descripcion LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
    }

    if (categoria) {
        filtros.push('p.id_categoria = ?');
        params.push(categoria);
    }

    const [rows] = await db.query(
        `SELECT
            p.id_producto,
            p.codigo,
            p.descripcion,
            p.stock_total,
            p.stock_minimo,
            p.foto_url,
            p.id_categoria,
            c.nombre_categoria,
            pa.costo_normal,
            pa.precio_unidad_normal,
            pa.precio_docena_normal,
            pa.precio_mayor_normal,
            pa.costo_distribuidor,
            pa.precio_unidad_dist,
            pa.precio_docena_dist,
            pa.precio_mayor_dist
         FROM productos p
         LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
         LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
         WHERE ${filtros.join(' AND ')}
         ORDER BY p.codigo
         LIMIT 300`,
        params
    );

    return rows;
}

async function obtenerProducto(idProducto) {
    const [rows] = await db.query(
        `SELECT
            p.id_producto,
            p.codigo,
            p.descripcion,
            p.stock_total,
            p.stock_minimo,
            p.foto_url,
            p.id_categoria,
            c.nombre_categoria,
            pa.costo_normal,
            pa.precio_unidad_normal,
            pa.precio_docena_normal,
            pa.precio_mayor_normal,
            pa.costo_distribuidor,
            pa.precio_unidad_dist,
            pa.precio_docena_dist,
            pa.precio_mayor_dist
         FROM productos p
         LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
         LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
         WHERE p.id_producto = ? AND p.activo = 1
         LIMIT 1`,
        [idProducto]
    );

    return rows[0] || null;
}

async function guardarHistorialPrecios(connection, idProducto, idUsuario, anteriores, nuevos) {
    const cambios = PRECIO_CAMPOS
        .filter((campo) => Number(anteriores?.[campo] ?? 0) !== Number(nuevos?.[campo] ?? 0))
        .map((campo) => [
            idProducto,
            idUsuario || null,
            campo,
            numero(anteriores?.[campo], 0),
            numero(nuevos?.[campo], 0)
        ]);

    if (cambios.length === 0) return;

    await connection.query(
        `INSERT INTO historial_precios
            (id_producto, id_usuario, campo_modificado, valor_anterior, valor_nuevo)
         VALUES ?`,
        [cambios]
    );
}

async function guardarProducto(connection, producto, idUsuario) {
    const categoriaId = await resolverCategoria(connection, producto);
    const [existentes] = await connection.query(
        'SELECT id_producto FROM productos WHERE codigo = ? LIMIT 1',
        [producto.codigo]
    );

    let idProducto;
    let accion;

    if (existentes[0]) {
        idProducto = existentes[0].id_producto;
        accion = 'actualizado';

        await connection.query(
            `UPDATE productos
             SET descripcion = ?, stock_total = ?, stock_minimo = ?, foto_url = ?, id_categoria = ?, activo = 1
             WHERE id_producto = ?`,
            [
                producto.descripcion,
                producto.stock_total,
                producto.stock_minimo,
                producto.foto_url || null,
                categoriaId,
                idProducto
            ]
        );
    } else {
        accion = 'agregado';

        const [resultado] = await connection.query(
            `INSERT INTO productos
                (codigo, descripcion, stock_total, stock_minimo, foto_url, id_categoria, activo)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
                producto.codigo,
                producto.descripcion,
                producto.stock_total,
                producto.stock_minimo,
                producto.foto_url || null,
                categoriaId
            ]
        );

        idProducto = resultado.insertId;
    }

    const [preciosAnteriores] = await connection.query(
        'SELECT * FROM precios_actuales WHERE id_producto = ? LIMIT 1',
        [idProducto]
    );

    await connection.query(
        `INSERT INTO precios_actuales
            (id_producto, costo_normal, precio_unidad_normal, precio_docena_normal, precio_mayor_normal,
             costo_distribuidor, precio_unidad_dist, precio_docena_dist, precio_mayor_dist)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            costo_normal = VALUES(costo_normal),
            precio_unidad_normal = VALUES(precio_unidad_normal),
            precio_docena_normal = VALUES(precio_docena_normal),
            precio_mayor_normal = VALUES(precio_mayor_normal),
            costo_distribuidor = VALUES(costo_distribuidor),
            precio_unidad_dist = VALUES(precio_unidad_dist),
            precio_docena_dist = VALUES(precio_docena_dist),
            precio_mayor_dist = VALUES(precio_mayor_dist)`,
        [
            idProducto,
            producto.costo_normal,
            producto.precio_unidad_normal,
            producto.precio_docena_normal,
            producto.precio_mayor_normal,
            producto.costo_distribuidor,
            producto.precio_unidad_dist,
            producto.precio_docena_dist,
            producto.precio_mayor_dist
        ]
    );

    await guardarHistorialPrecios(connection, idProducto, idUsuario, preciosAnteriores[0], producto);

    return { idProducto, accion };
}

async function actualizarProducto(idProducto, datos, idUsuario) {
    const actual = await obtenerProducto(idProducto);

    if (!actual) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }

    const producto = {
        codigo: actual.codigo,
        descripcion: normalizarTexto(datos.descripcion || actual.descripcion),
        stock_total: numero(datos.stock_total, actual.stock_total),
        stock_minimo: numero(datos.stock_minimo, actual.stock_minimo || 10),
        foto_url: normalizarTexto(datos.foto_url ?? actual.foto_url),
        id_categoria: numero(datos.id_categoria, actual.id_categoria),
        costo_normal: numero(datos.costo_normal, actual.costo_normal),
        precio_unidad_normal: numero(datos.precio_unidad_normal, actual.precio_unidad_normal),
        precio_docena_normal: numero(datos.precio_docena_normal, actual.precio_docena_normal),
        precio_mayor_normal: numero(datos.precio_mayor_normal, actual.precio_mayor_normal),
        costo_distribuidor: numero(datos.costo_distribuidor, actual.costo_distribuidor),
        precio_unidad_dist: numero(datos.precio_unidad_dist, actual.precio_unidad_dist),
        precio_docena_dist: numero(datos.precio_docena_dist, actual.precio_docena_dist),
        precio_mayor_dist: numero(datos.precio_mayor_dist, actual.precio_mayor_dist)
    };

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        await guardarProducto(connection, producto, idUsuario);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    return obtenerProducto(idProducto);
}

async function eliminarProducto(idProducto) {
    const [resultado] = await db.query(
        'UPDATE productos SET activo = 0 WHERE id_producto = ?',
        [idProducto]
    );

    if (resultado.affectedRows === 0) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }
}

async function importarProductosCsv(filePath, idUsuario) {
    const resultado = {
        agregados: 0,
        actualizados: 0,
        omitidos: 0,
        errores: []
    };

    try {
        const filas = parseCsv(fs.readFileSync(filePath, 'utf8'));

        const connection = await db.getConnection();

        try {
            for (let index = 0; index < filas.length; index++) {
                const producto = mapearFilaCsv(filas[index]);
                const errores = validarProducto(producto);

                if (errores.length > 0) {
                    resultado.omitidos++;
                    resultado.errores.push(`Fila ${index + 2}: ${errores.join(', ')}`);
                    continue;
                }

                try {
                    await connection.beginTransaction();
                    const guardado = await guardarProducto(connection, producto, idUsuario);
                    await connection.commit();

                    if (guardado.accion === 'agregado') resultado.agregados++;
                    if (guardado.accion === 'actualizado') resultado.actualizados++;
                } catch (error) {
                    await connection.rollback();
                    resultado.omitidos++;
                    resultado.errores.push(`Fila ${index + 2}: ${error.message}`);
                }
            }
        } finally {
            connection.release();
        }

        return resultado;
    } finally {
        fs.unlink(filePath, () => {});
    }
}

async function obtenerHistorialPrecios(idProducto) {
    const [productoRows] = await db.query(
        `SELECT id_producto, codigo, descripcion
         FROM productos
         WHERE id_producto = ?
         LIMIT 1`,
        [idProducto]
    );

    if (!productoRows[0]) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }

    const [historial] = await db.query(
        `SELECT
            h.id_historial,
            h.campo_modificado,
            h.valor_anterior,
            h.valor_nuevo,
            h.fecha_cambio,
            u.nombre AS usuario_nombre
         FROM historial_precios h
         LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
         WHERE h.id_producto = ?
         ORDER BY h.fecha_cambio DESC, h.id_historial DESC
         LIMIT 80`,
        [idProducto]
    );

    return {
        producto: productoRows[0],
        historial: historial.map((item) => ({
            ...item,
            diferencia: Number(item.valor_nuevo || 0) - Number(item.valor_anterior || 0)
        }))
    };
}

module.exports = {
    listarProductos,
    obtenerProducto,
    listarCategorias,
    actualizarProducto,
    eliminarProducto,
    importarProductosCsv,
    obtenerHistorialPrecios
};

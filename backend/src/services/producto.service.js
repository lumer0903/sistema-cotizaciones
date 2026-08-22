const fs = require('fs');
const prisma = require('../config/prisma');

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
    return prisma.categoria.findMany({
        orderBy: { nombre_categoria: 'asc' }
    });
}

async function resolverCategoria(producto) {
    if (producto.id_categoria) return producto.id_categoria;
    if (!producto.categoria) return null;

    const existente = await prisma.categoria.findFirst({
        where: { nombre_categoria: producto.categoria }
    });

    if (existente) return existente.id_categoria;

    const nuevo = await prisma.categoria.create({
        data: { nombre_categoria: producto.categoria }
    });

    return nuevo.id_categoria;
}

function formatearProducto(producto) {
    if (!producto) return null;
    return {
        id_producto: producto.id_producto,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        stock_total: producto.stock_total,
        stock_minimo: producto.stock_minimo,
        foto_url: producto.foto_url,
        id_categoria: producto.id_categoria,
        nombre_categoria: producto.categoria?.nombre_categoria ?? null,
        unidades_por_caja: producto.unidades_por_caja,
        ...(producto.precios_actuales ? {
            costo_normal: Number(producto.precios_actuales.costo_normal),
            precio_unidad_normal: Number(producto.precios_actuales.precio_unidad_normal),
            precio_docena_normal: Number(producto.precios_actuales.precio_docena_normal),
            precio_mayor_normal: Number(producto.precios_actuales.precio_mayor_normal),
            costo_distribuidor: Number(producto.precios_actuales.costo_distribuidor),
            precio_unidad_dist: Number(producto.precios_actuales.precio_unidad_dist),
            precio_docena_dist: Number(producto.precios_actuales.precio_docena_dist),
            precio_mayor_dist: Number(producto.precios_actuales.precio_mayor_dist)
        } : {})
    };
}

async function listarProductos({ q, categoria } = {}) {
    const where = { activo: true };

    if (q) {
        where.OR = [
            { codigo: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } }
        ];
    }

    if (categoria) {
        where.id_categoria = Number(categoria);
    }

    const productos = await prisma.producto.findMany({
        where,
        include: {
            categoria: true,
            precios_actuales: true
        },
        orderBy: { codigo: 'asc' },
        take: 300
    });

    return productos.map(formatearProducto);
}

async function obtenerProducto(idProducto) {
    const producto = await prisma.producto.findUnique({
        where: { id_producto: Number(idProducto) },
        include: {
            categoria: true,
            precios_actuales: true
        }
    });

    if (!producto || !producto.activo) return null;
    return formatearProducto(producto);
}

async function guardarHistorialPrecios(idProducto, idUsuario, anteriores, nuevos) {
    const cambios = PRECIO_CAMPOS
        .filter((campo) => Number(anteriores?.[campo] ?? 0) !== Number(nuevos?.[campo] ?? 0))
        .map((campo) => ({
            id_producto: Number(idProducto),
            id_usuario: idUsuario || null,
            campo_modificado: campo,
            valor_anterior: numero(anteriores?.[campo], 0),
            valor_nuevo: numero(nuevos?.[campo], 0)
        }));

    if (cambios.length === 0) return;

    await prisma.historialPrecios.createMany({
        data: cambios
    });
}

async function guardarProducto(producto, idUsuario) {
    const categoriaId = await resolverCategoria(producto);

    const existente = await prisma.producto.findUnique({
        where: { codigo: producto.codigo },
        include: { precios_actuales: true }
    });

    let idProducto;
    let accion;
    let preciosAnteriores = {};

    if (existente) {
        idProducto = existente.id_producto;
        accion = 'actualizado';
        preciosAnteriores = existente.precios_actuales || {};

        await prisma.producto.update({
            where: { id_producto: idProducto },
            data: {
                descripcion: producto.descripcion,
                stock_total: producto.stock_total,
                stock_minimo: producto.stock_minimo,
                foto_url: producto.foto_url || null,
                id_categoria: categoriaId,
                activo: true
            }
        });
    } else {
        accion = 'agregado';

        const nuevo = await prisma.producto.create({
            data: {
                codigo: producto.codigo,
                descripcion: producto.descripcion,
                stock_total: producto.stock_total,
                stock_minimo: producto.stock_minimo,
                foto_url: producto.foto_url || null,
                id_categoria: categoriaId,
                activo: true,
                unidades_por_caja: 1
            }
        });

        idProducto = nuevo.id_producto;
    }

    const preciosData = {
        costo_normal: numero(producto.costo_normal),
        precio_unidad_normal: numero(producto.precio_unidad_normal),
        precio_docena_normal: numero(producto.precio_docena_normal),
        precio_mayor_normal: numero(producto.precio_mayor_normal),
        costo_distribuidor: numero(producto.costo_distribuidor),
        precio_unidad_dist: numero(producto.precio_unidad_dist),
        precio_docena_dist: numero(producto.precio_docena_dist),
        precio_mayor_dist: numero(producto.precio_mayor_dist)
    };

    await prisma.preciosActuales.upsert({
        where: { id_producto: idProducto },
        create: {
            id_producto: idProducto,
            ...preciosData
        },
        update: preciosData
    });

    await guardarHistorialPrecios(idProducto, idUsuario, preciosAnteriores, preciosData);

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

    return prisma.$transaction(async (tx) => {
        await tx.producto.update({
            where: { id_producto: Number(idProducto) },
            data: {
                descripcion: producto.descripcion,
                stock_total: producto.stock_total,
                stock_minimo: producto.stock_minimo,
                foto_url: producto.foto_url || null,
                id_categoria: producto.id_categoria
            }
        });

        const preciosAnteriores = await tx.preciosActuales.findUnique({
            where: { id_producto: Number(idProducto) }
        }) || {};

        const preciosData = {
            costo_normal: numero(producto.costo_normal),
            precio_unidad_normal: numero(producto.precio_unidad_normal),
            precio_docena_normal: numero(producto.precio_docena_normal),
            precio_mayor_normal: numero(producto.precio_mayor_normal),
            costo_distribuidor: numero(producto.costo_distribuidor),
            precio_unidad_dist: numero(producto.precio_unidad_dist),
            precio_docena_dist: numero(producto.precio_docena_dist),
            precio_mayor_dist: numero(producto.precio_mayor_dist)
        };

        await tx.preciosActuales.upsert({
            where: { id_producto: Number(idProducto) },
            create: { id_producto: Number(idProducto), ...preciosData },
            update: preciosData
        });

        await guardarHistorialPrecios(Number(idProducto), idUsuario, preciosAnteriores, preciosData);

        return obtenerProducto(idProducto);
    });
}

async function eliminarProducto(idProducto) {
    const resultado = await prisma.producto.update({
        where: { id_producto: Number(idProducto) },
        data: { activo: false }
    });

    if (!resultado) {
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

        for (let index = 0; index < filas.length; index++) {
            const producto = mapearFilaCsv(filas[index]);
            const errores = validarProducto(producto);

            if (errores.length > 0) {
                resultado.omitidos++;
                resultado.errores.push(`Fila ${index + 2}: ${errores.join(', ')}`);
                continue;
            }

            try {
                const guardado = await prisma.$transaction(async (tx) => {
                    return await guardarProducto(producto, idUsuario);
                });

                if (guardado.accion === 'agregado') resultado.agregados++;
                if (guardado.accion === 'actualizado') resultado.actualizados++;
            } catch (error) {
                resultado.omitidos++;
                resultado.errores.push(`Fila ${index + 2}: ${error.message}`);
            }
        }

        return resultado;
    } finally {
        fs.unlink(filePath, () => {});
    }
}

async function obtenerHistorialPrecios(idProducto) {
    const producto = await prisma.producto.findUnique({
        where: { id_producto: Number(idProducto) },
        select: { id_producto: true, codigo: true, descripcion: true }
    });

    if (!producto) {
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    }

    const historial = await prisma.historialPrecios.findMany({
        where: { id_producto: Number(idProducto) },
        include: { usuario: { select: { nombre: true } } },
        orderBy: [{ fecha_cambio: 'desc' }, { id_historial: 'desc' }],
        take: 80
    });

    return {
        producto,
        historial: historial.map((item) => ({
            ...item,
            valor_anterior: Number(item.valor_anterior || 0),
            valor_nuevo: Number(item.valor_nuevo || 0),
            diferencia: Number(item.valor_nuevo || 0) - Number(item.valor_anterior || 0),
            usuario_nombre: item.usuario?.nombre ?? null
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
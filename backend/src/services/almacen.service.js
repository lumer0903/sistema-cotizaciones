/**
 * Servicio de Almacén
 * CRUD básico y gestión de stock inicial
 */

const prisma = require('../config/prisma');

async function crearAlmacen({ codigo, nombre, ubicacion }) {
    const existe = await prisma.almacen.findUnique({ where: { codigo } });
    if (existe) {
        const error = new Error('Ya existe un almacén con ese código');
        error.status = 400;
        throw error;
    }

    return prisma.almacen.create({
        data: { codigo, nombre, ubicacion }
    });
}

async function listarAlmacenes({ activo = true } = {}) {
    return prisma.almacen.findMany({
        where: { activo },
        orderBy: { codigo: 'asc' }
    });
}

async function obtenerAlmacen(id) {
    return prisma.almacen.findUnique({
        where: { id_almacen: Number(id) },
        include: { stockActual: { include: { producto: true } } }
    });
}

async function actualizarAlmacen(id, data) {
    return prisma.almacen.update({
        where: { id_almacen: Number(id) },
        data
    });
}

async function obtenerAlmacenPrincipal() {
    // Buscar almacén por defecto (TIENDA_PRINCIPAL) o el primero activo
    return prisma.almacen.findFirst({
        where: { codigo: 'TIENDA_PRINCIPAL', activo: true }
    }) || prisma.almacen.findFirst({
        where: { activo: true },
        orderBy: { id_almacen: 'asc' }
    });
}

async function inicializarStockAlmacen(idAlmacen) {
    // Crear registros StockActual en 0 para todos los productos activos
    const productos = await prisma.producto.findMany({
        where: { activo: true },
        select: { id_producto: true }
    });

    const data = productos.map(p => ({
        id_producto: p.id_producto,
        id_almacen: Number(idAlmacen),
        cantidad: 0
    }));

    return prisma.stockActual.createMany({
        data,
        skipDuplicates: true
    });
}

module.exports = {
    crearAlmacen,
    listarAlmacenes,
    obtenerAlmacen,
    actualizarAlmacen,
    obtenerAlmacenPrincipal,
    inicializarStockAlmacen
};
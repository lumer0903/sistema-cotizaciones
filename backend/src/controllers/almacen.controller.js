const almacenService = require('../services/almacen.service');

async function listar(req, res, next) {
    try {
        const almacenes = await almacenService.listarAlmacenes(req.query);
        res.json({ success: true, data: almacenes });
    } catch (error) {
        next(error);
    }
}

async function obtenerPrincipal(req, res, next) {
    try {
        const almacen = await almacenService.obtenerAlmacenPrincipal();
        if (!almacen) return res.status(404).json({ success: false, message: 'No hay almacén principal configurado' });
        res.json({ success: true, data: almacen });
    } catch (error) {
        next(error);
    }
}

async function obtener(req, res, next) {
    try {
        const almacen = await almacenService.obtenerAlmacen(req.params.id);
        if (!almacen) return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
        res.json({ success: true, data: almacen });
    } catch (error) {
        next(error);
    }
}

async function crear(req, res, next) {
    try {
        const almacen = await almacenService.crearAlmacen(req.body);
        // Inicializar stock en 0 para todos los productos
        await almacenService.inicializarStockAlmacen(almacen.id_almacen);
        res.status(201).json({ success: true, data: almacen });
    } catch (error) {
        next(error);
    }
}

async function actualizar(req, res, next) {
    try {
        const almacen = await almacenService.actualizarAlmacen(req.params.id, req.body);
        res.json({ success: true, data: almacen });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    obtenerPrincipal,
    obtener,
    crear,
    actualizar
};
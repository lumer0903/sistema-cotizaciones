const ventaService = require('../services/venta.service');

async function crear(req, res, next) {
    try {
        const venta = await ventaService.crearVenta(req.body, req.usuario.id_usuario);
        res.status(201).json({ success: true, data: venta });
    } catch (error) {
        next(error);
    }
}

async function crearDesdeCotizacion(req, res, next) {
    try {
        const venta = await ventaService.crearDesdeCotizacion(req.params.id, req.usuario.id_usuario, req.body);
        res.status(201).json({ success: true, data: venta });
    } catch (error) {
        next(error);
    }
}

async function emitir(req, res, next) {
    try {
        const venta = await ventaService.emitirVenta(req.params.id, req.usuario.id_usuario);
        res.json({ success: true, data: venta });
    } catch (error) {
        next(error);
    }
}

async function listar(req, res, next) {
    try {
        const data = await ventaService.listarVentas(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function obtener(req, res, next) {
    try {
        const venta = await ventaService.obtenerVenta(req.params.id);
        if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
        res.json({ success: true, data: venta });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    crear,
    crearDesdeCotizacion,
    emitir,
    listar,
    obtener
};
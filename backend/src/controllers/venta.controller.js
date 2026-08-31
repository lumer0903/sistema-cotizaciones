const ventaService = require('../services/venta.service');
const pagoService = require('../services/pago.service');

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

async function registrarPago(req, res, next) {
    try {
        const resultado = await pagoService.registrarPago({
            ventaId: req.params.id,
            monto: req.body.monto,
            metodoPago: req.body.metodoPago,
            referencia: req.body.referencia,
            idUsuario: req.usuario.id_usuario
        });
        res.json({ success: true, data: resultado });
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
    registrarPago,
    listar,
    obtener
};
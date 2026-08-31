const cuentaCobrarService = require('../services/cuentaCobrar.service');
const pagoService = require('../services/pago.service');

async function listar(req, res, next) {
    try {
        const data = await cuentaCobrarService.listarCuentasCobrar(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function vencidas(req, res, next) {
    try {
        const cuentas = await cuentaCobrarService.obtenerCuentasVencidas();
        res.json({ success: true, data: cuentas });
    } catch (error) {
        next(error);
    }
}

async function resumen(req, res, next) {
    try {
        const resumen = await cuentaCobrarService.obtenerResumenCobranza();
        res.json({ success: true, data: resumen });
    } catch (error) {
        next(error);
    }
}

async function estadoCuentaCliente(req, res, next) {
    try {
        const estado = await cuentaCobrarService.obtenerEstadoCuentaCliente(req.params.id);
        res.json({ success: true, data: estado });
    } catch (error) {
        next(error);
    }
}

async function registrarPago(req, res, next) {
    try {
        const resultado = await pagoService.registrarPago({
            ventaId: req.body.ventaId,
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

module.exports = {
    listar,
    vencidas,
    resumen,
    estadoCuentaCliente,
    registrarPago
};
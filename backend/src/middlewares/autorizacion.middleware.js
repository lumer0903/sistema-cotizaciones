/**
 * Middleware de autorización para ventas a crédito
 * Solo admin y gerente pueden autorizar/crear ventas a crédito
 */

function puedeCrearVentaCredito(usuario) {
    return usuario && (usuario.rol === 'admin' || usuario.rol === 'gerente');
}

function puedeGestionarCobranza(usuario) {
    return usuario && (usuario.rol === 'admin' || usuario.rol === 'gerente');
}

function autorizarCredito(req, res, next) {
    const { tipoPago, diasPlazo } = req.body;

    if (tipoPago === 'credito') {
        if (!puedeCrearVentaCredito(req.usuario)) {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores y gerentes pueden autorizar ventas a crédito'
            });
        }

        if (!diasPlazo || diasPlazo < 1 || diasPlazo > 365) {
            return res.status(400).json({
                success: false,
                message: 'Para ventas a crédito se requiere días de plazo (1-365)'
            });
        }
    }

    next();
}

function autorizarCobranza(req, res, next) {
    if (!puedeGestionarCobranza(req.usuario)) {
        return res.status(403).json({
            success: false,
            message: 'Solo administradores y gerentes pueden acceder a cobranza'
        });
    }
    next();
}

module.exports = {
    puedeCrearVentaCredito,
    puedeGestionarCobranza,
    autorizarCredito,
    autorizarCobranza
};
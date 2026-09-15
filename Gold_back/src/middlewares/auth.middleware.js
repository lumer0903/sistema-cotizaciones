const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');

async function autenticarToken(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [tipo, token] = authHeader.split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'Token no enviado'
        });
    }

    try {
        const payload = jwt.verify(token, authService.JWT_SECRET);
        const usuario = await authService.obtenerSesion(payload.id_usuario);
        req.usuario = {
            id_usuario: usuario.id_usuario,
            email: usuario.email,
            rol: usuario.rol,
            nombre: usuario.nombre
        };
        next();
    } catch (_error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalido o expirado'
        });
    }
}

module.exports = autenticarToken;

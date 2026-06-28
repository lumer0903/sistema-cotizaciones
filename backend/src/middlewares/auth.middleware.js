const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/auth.service');

function autenticarToken(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [tipo, token] = authHeader.split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'Token no enviado'
        });
    }

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (_error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalido o expirado'
        });
    }
}

module.exports = autenticarToken;

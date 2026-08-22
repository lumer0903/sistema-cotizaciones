const authService = require('../services/auth.service');

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y password son obligatorios'
            });
        }

        const resultado = await authService.login(email.trim().toLowerCase(), password);

        res.json({
            success: true,
            message: 'Inicio de sesion correcto',
            data: resultado
        });
    } catch (error) {
        next(error);
    }
}

async function me(req, res, next) {
    try {
        const usuario = await authService.obtenerSesion(req.usuario.id_usuario);

        res.json({
            success: true,
            data: { usuario }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    login,
    me
};

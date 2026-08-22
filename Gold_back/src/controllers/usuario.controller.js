const usuarioService = require('../services/usuario.service');

async function listar(req, res, next) {
    try {
        const data = await usuarioService.listarUsuarios();
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function roles(_req, res) {
    res.json({ success: true, data: usuarioService.ROLES });
}

async function crear(req, res, next) {
    try {
        const data = await usuarioService.crearUsuario(req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function actualizar(req, res, next) {
    try {
        const data = await usuarioService.actualizarUsuario(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function perfil(req, res, next) {
    try {
        const data = await usuarioService.actualizarPerfil(req.usuario.id_usuario, req.body);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    roles,
    crear,
    actualizar,
    perfil
};

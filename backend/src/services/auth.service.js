const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');

const JWT_SECRET = process.env.JWT_SECRET || 'goldcontinent_dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function quitarDatosSensibles(usuario) {
    if (!usuario) return null;

    const { password_hash, ...usuarioSeguro } = usuario;
    return usuarioSeguro;
}

function crearToken(usuario) {
    return jwt.sign(
        {
            id_usuario: usuario.id_usuario,
            email: usuario.email,
            rol: usuario.rol
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

async function login(email, password) {
    const usuario = await usuarioModel.buscarPorEmail(email);

    if (!usuario || !usuario.activo) {
        const error = new Error('Credenciales incorrectas');
        error.status = 401;
        throw error;
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
        const error = new Error('Credenciales incorrectas');
        error.status = 401;
        throw error;
    }

    const usuarioSeguro = quitarDatosSensibles(usuario);

    return {
        token: crearToken(usuarioSeguro),
        usuario: usuarioSeguro
    };
}

async function obtenerSesion(idUsuario) {
    const usuario = await usuarioModel.buscarPorId(idUsuario);

    if (!usuario || !usuario.activo) {
        const error = new Error('Sesion no valida');
        error.status = 401;
        throw error;
    }

    return usuario;
}

module.exports = {
    login,
    obtenerSesion,
    quitarDatosSensibles,
    JWT_SECRET
};

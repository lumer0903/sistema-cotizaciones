const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

class AuthService {
    static async login(email, password) {
        if (!email || !password) {
            throw new Error('Completa todos los campos');
        }

        const usuario = await UserModel.findByEmail(email);

        if (!usuario) {
            throw new Error('Credenciales incorrectas');
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            throw new Error('Credenciales incorrectas');
        }

        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            token,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        };
    }
}

module.exports = AuthService;

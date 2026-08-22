function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder a esta funcionalidad'
            });
        }

        next();
    };
}

module.exports = autorizarRoles;

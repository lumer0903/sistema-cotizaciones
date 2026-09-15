const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const ROLES = {
    admin: {
        nombre: 'Administrador',
        descripcion: 'Control total del sistema',
        permisos: {
            dashboard: 'edicion',
            productos: 'edicion',
            importacion: 'edicion',
            consulta_precios: 'edicion',
            cotizaciones: 'edicion',
            recomendaciones: 'edicion',
            pdf: 'edicion',
            usuarios: 'edicion'
        }
    },
    gerente: {
        nombre: 'Gerente',
        descripcion: 'Control total del sistema y supervision general',
        permisos: {
            dashboard: 'edicion',
            productos: 'edicion',
            importacion: 'edicion',
            consulta_precios: 'edicion',
            cotizaciones: 'edicion',
            recomendaciones: 'edicion',
            pdf: 'edicion',
            usuarios: 'edicion'
        }
    },
    vendedor: {
        nombre: 'Asesora de ventas',
        descripcion: 'Gestiona catalogo, cotizaciones y atencion comercial',
        permisos: {
            dashboard: 'lectura',
            productos: 'lectura',
            importacion: 'sin_acceso',
            consulta_precios: 'lectura',
            cotizaciones: 'edicion',
            recomendaciones: 'edicion',
            pdf: 'edicion',
            usuarios: 'sin_acceso'
        }
    }
};

function rolSeguro(rol) {
    return ROLES[rol] ? rol : 'vendedor';
}

function permisosPorRol(rol) {
    return ROLES[rolSeguro(rol)];
}

async function listarUsuarios() {
    const usuarios = await prisma.usuario.findMany({
        orderBy: [
            { activo: 'desc' },
            { nombre: 'asc' }
        ]
    });
    return usuarios.map((usuario) => ({
        ...usuario,
        permisos: permisosPorRol(usuario.rol)
    }));
}

async function buscarPorEmail(email) {
    return prisma.usuario.findUnique({
        where: { email: email.trim().toLowerCase() }
    });
}

async function buscarPorId(idUsuario) {
    return prisma.usuario.findUnique({
        where: { id_usuario: Number(idUsuario) }
    });
}

async function crearUsuario(payload) {
    if (!payload.nombre || !payload.email || !payload.password) {
        const error = new Error('Nombre, email y password son obligatorios');
        error.status = 400;
        throw error;
    }

    const password_hash = await bcrypt.hash(payload.password, 10);
    return prisma.usuario.create({
        data: {
            nombre: payload.nombre.trim(),
            email: payload.email.trim().toLowerCase(),
            password_hash,
            rol: rolSeguro(payload.rol)
        }
    });
}

async function actualizarUsuario(idUsuario, payload) {
    const actual = await buscarPorId(idUsuario);
    if (!actual) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    const data = {
        nombre: payload.nombre?.trim() || actual.nombre,
        email: payload.email?.trim().toLowerCase() || actual.email,
        rol: rolSeguro(payload.rol || actual.rol),
        activo: payload.activo === undefined ? actual.activo : Boolean(payload.activo)
    };

    if (payload.password) {
        data.password_hash = await bcrypt.hash(payload.password, 10);
    }

    return prisma.usuario.update({
        where: { id_usuario: Number(idUsuario) },
        data
    });
}

async function actualizarPerfil(idUsuario, payload) {
    const actual = await buscarPorId(idUsuario);
    if (!actual) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    return prisma.usuario.update({
        where: { id_usuario: Number(idUsuario) },
        data: {
            nombre: payload.nombre?.trim() || actual.nombre,
            email: payload.email?.trim().toLowerCase() || actual.email
        }
    });
}

module.exports = {
    ROLES,
    listarUsuarios,
    buscarPorEmail,
    buscarPorId,
    crearUsuario,
    actualizarUsuario,
    actualizarPerfil,
    permisosPorRol
};
const db = require('../config/db');

const PUBLIC_FIELDS = `
    id_usuario,
    nombre,
    email,
    rol,
    activo,
    created_at
`;

async function buscarPorEmail(email) {
    const [rows] = await db.query(
        `SELECT ${PUBLIC_FIELDS}, password_hash
         FROM usuarios
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

async function buscarPorId(idUsuario) {
    const [rows] = await db.query(
        `SELECT ${PUBLIC_FIELDS}
         FROM usuarios
         WHERE id_usuario = ?
         LIMIT 1`,
        [idUsuario]
    );

    return rows[0] || null;
}

async function listar() {
    const [rows] = await db.query(
        `SELECT ${PUBLIC_FIELDS}
         FROM usuarios
         ORDER BY activo DESC, nombre ASC`
    );

    return rows;
}

async function crear({ nombre, email, password_hash, rol }) {
    const [resultado] = await db.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
         VALUES (?, ?, ?, ?, 1)`,
        [nombre, email, password_hash, rol]
    );

    return buscarPorId(resultado.insertId);
}

async function actualizar(idUsuario, { nombre, email, rol, activo, password_hash }) {
    if (password_hash) {
        await db.query(
            `UPDATE usuarios
             SET nombre = ?, email = ?, rol = ?, activo = ?, password_hash = ?
             WHERE id_usuario = ?`,
            [nombre, email, rol, activo, password_hash, idUsuario]
        );
    } else {
        await db.query(
            `UPDATE usuarios
             SET nombre = ?, email = ?, rol = ?, activo = ?
             WHERE id_usuario = ?`,
            [nombre, email, rol, activo, idUsuario]
        );
    }

    return buscarPorId(idUsuario);
}

async function actualizarPerfil(idUsuario, { nombre, email }) {
    await db.query(
        `UPDATE usuarios
         SET nombre = ?, email = ?
         WHERE id_usuario = ?`,
        [nombre, email, idUsuario]
    );

    return buscarPorId(idUsuario);
}

module.exports = {
    buscarPorEmail,
    buscarPorId,
    listar,
    crear,
    actualizar,
    actualizarPerfil
};

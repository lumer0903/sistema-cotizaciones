const axios = require('axios');

function tokens(texto) {
    return new Set(
        String(texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((token) => token.length > 2)
    );
}

function similitudLocal(idProducto, productos) {
    const base = productos.find((producto) => producto.id_producto === Number(idProducto));
    if (!base) return [];

    const baseTokens = tokens(base.descripcion);

    return productos
        .filter((producto) => producto.id_producto !== Number(idProducto))
        .map((producto) => {
            const productoTokens = tokens(producto.descripcion);
            const interseccion = [...baseTokens].filter((token) => productoTokens.has(token)).length;
            const union = new Set([...baseTokens, ...productoTokens]).size || 1;
            return {
                id_producto: producto.id_producto,
                similitud: Number((interseccion / union).toFixed(4))
            };
        })
        .sort((a, b) => b.similitud - a.similitud)
        .slice(0, 12);
}

async function obtenerSimilitudes(idProducto, productos) {
    try {
        const respuesta = await axios.post(
            process.env.IA_URL || 'http://localhost:5000/recomendar',
            { id_producto: Number(idProducto) },
            { timeout: 1500 }
        );

        if (Array.isArray(respuesta.data)) {
            return respuesta.data;
        }
    } catch (_error) {
        return similitudLocal(idProducto, productos);
    }

    return similitudLocal(idProducto, productos);
}

module.exports = {
    obtenerSimilitudes
};

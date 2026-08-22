async function obtenerSimilitudes(idProducto) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
        const baseIA = (process.env.IA_URL || 'http://localhost:5000').replace(/\/$/, '');
        const urlIA = baseIA.endsWith('/recomendar') ? baseIA : `${baseIA}/recomendar`;
        const respuesta = await fetch(urlIA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_producto: Number(idProducto) }),
            signal: controller.signal
        });

        if (!respuesta.ok) {
            throw new Error(`El servicio de IA respondió con estado: ${respuesta.status}`);
        }

        const data = await respuesta.json();
        if (Array.isArray(data)) {
            return data;
        }
        throw new Error('La respuesta del microservicio de IA no es un array');
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    obtenerSimilitudes
};

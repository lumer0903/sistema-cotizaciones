const cotizacionService = require('../services/cotizacion.service');
const pdfService = require('../services/pdf.service');

async function listar(req, res, next) {
    try {
        const data = await cotizacionService.listarCotizaciones(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function crear(req, res, next) {
    try {
        const data = await cotizacionService.crearCotizacion(req.body, req.usuario.id_usuario);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function obtener(req, res, next) {
    try {
        const data = await cotizacionService.obtenerCotizacion(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Cotizacion no encontrada' });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function cambiarEstado(req, res, next) {
    try {
        const data = await cotizacionService.cambiarEstado(req.params.id, req.body.estado);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function buscarProductos(req, res, next) {
    try {
        const data = await cotizacionService.buscarProductos(req.params.id, req.query.q);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function agregarDetalle(req, res, next) {
    try {
        const data = await cotizacionService.agregarDetalle(req.params.id, req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function actualizarDetalle(req, res, next) {
    try {
        const data = await cotizacionService.actualizarDetalle(req.params.id, req.params.idDetalle, req.body);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function eliminarDetalle(req, res, next) {
    try {
        const data = await cotizacionService.eliminarDetalle(req.params.id, req.params.idDetalle);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function recomendar(req, res, next) {
    try {
        const data = await cotizacionService.recomendar(req.params.id, req.params.idProducto);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

async function generarPdf(req, res, next) {
    try {
        const cotizacion = await cotizacionService.obtenerCotizacion(req.params.id);

        if (!cotizacion) {
            return res.status(404).json({ success: false, message: 'Cotizacion no encontrada' });
        }

        const buffer = await pdfService.generarCotizacionPdf(cotizacion);
        const fileName = `${cotizacion.numero}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    crear,
    obtener,
    cambiarEstado,
    buscarProductos,
    agregarDetalle,
    actualizarDetalle,
    eliminarDetalle,
    recomendar,
    generarPdf
};

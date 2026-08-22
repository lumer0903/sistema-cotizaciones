const productoService = require('../services/producto.service');

async function listar(req, res, next) {
    try {
        const productos = await productoService.listarProductos({
            q: req.query.q,
            categoria: req.query.categoria
        });

        res.json({
            success: true,
            data: productos
        });
    } catch (error) {
        next(error);
    }
}

async function obtener(req, res, next) {
    try {
        const producto = await productoService.obtenerProducto(req.params.id);

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json({
            success: true,
            data: producto
        });
    } catch (error) {
        next(error);
    }
}

async function listarCategorias(_req, res, next) {
    try {
        const categorias = await productoService.listarCategorias();

        res.json({
            success: true,
            data: categorias
        });
    } catch (error) {
        next(error);
    }
}

async function actualizar(req, res, next) {
    try {
        const producto = await productoService.actualizarProducto(
            req.params.id,
            req.body,
            req.usuario?.id_usuario
        );

        res.json({
            success: true,
            message: 'Producto actualizado correctamente',
            data: producto
        });
    } catch (error) {
        next(error);
    }
}

async function eliminar(req, res, next) {
    try {
        await productoService.eliminarProducto(req.params.id);

        res.json({
            success: true,
            message: 'Producto eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
}

async function importarCsv(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Debes adjuntar un archivo CSV'
            });
        }

        const resultado = await productoService.importarProductosCsv(
            req.file.path,
            req.usuario?.id_usuario
        );

        res.json({
            success: true,
            message: 'Importacion procesada',
            data: resultado
        });
    } catch (error) {
        next(error);
    }
}

async function historialPrecios(req, res, next) {
    try {
        const historial = await productoService.obtenerHistorialPrecios(req.params.id);

        res.json({
            success: true,
            data: historial
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    obtener,
    listarCategorias,
    actualizar,
    eliminar,
    importarCsv,
    historialPrecios
};

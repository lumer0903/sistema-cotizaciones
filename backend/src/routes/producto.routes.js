const express = require('express');
const multer = require('multer');
const productoController = require('../controllers/producto.controller');
const autenticarToken = require('../middlewares/auth.middleware');
const autorizarRoles = require('../middlewares/rol.middleware');

const router = express.Router();
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
        const esCsv = file.originalname.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv';

        if (!esCsv) {
            return callback(new Error('Solo se permite importar archivos CSV'));
        }

        callback(null, true);
    }
});

router.use(autenticarToken);

router.get('/', productoController.listar);
router.get('/categorias', productoController.listarCategorias);
router.post('/importar', autorizarRoles('admin', 'gerente'), upload.single('archivo'), productoController.importarCsv);
router.get('/:id/historial', autorizarRoles('admin', 'gerente'), productoController.historialPrecios);
router.get('/:id', productoController.obtener);
router.put('/:id', autorizarRoles('admin', 'gerente'), productoController.actualizar);
router.delete('/:id', autorizarRoles('admin', 'gerente'), productoController.eliminar);

module.exports = router;

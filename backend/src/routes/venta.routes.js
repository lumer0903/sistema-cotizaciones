const express = require('express');
const ventaController = require('../controllers/venta.controller');
const autenticarToken = require('../middlewares/auth.middleware');
const { autorizarCredito } = require('../middlewares/autorizacion.middleware');

const router = express.Router();

router.use(autenticarToken);

// Crear venta (contado: vendedor, crédito: admin/gerente)
router.post('/', autorizarCredito, ventaController.crear);

// Crear venta desde cotización (admin/gerente)
router.post('/desde-cotizacion/:id', ventaController.crearDesdeCotizacion);

// Emitir venta
router.post('/:id/emitir', ventaController.emitir);

// Listar ventas con filtros
router.get('/', ventaController.listar);

// Obtener venta por ID
router.get('/:id', ventaController.obtener);

module.exports = router;
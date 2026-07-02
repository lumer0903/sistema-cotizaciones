const express = require('express');
const cotizacionController = require('../controllers/cotizacion.controller');
const autenticarToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(autenticarToken);

router.get('/', cotizacionController.listar);
router.post('/', cotizacionController.crear);
router.get('/:id', cotizacionController.obtener);
router.get('/:id/pdf', cotizacionController.generarPdf);
router.put('/:id/estado', cotizacionController.cambiarEstado);
router.put('/:id/observaciones', cotizacionController.actualizarObservaciones);
router.put('/:id/carreta', cotizacionController.actualizarCarreta);
router.get('/:id/buscar-productos', cotizacionController.buscarProductos);
router.get('/:id/recomendaciones/:idProducto', cotizacionController.recomendar);
router.post('/:id/detalle', cotizacionController.agregarDetalle);
router.put('/:id/detalle/:idDetalle', cotizacionController.actualizarDetalle);
router.delete('/:id/detalle/:idDetalle', cotizacionController.eliminarDetalle);

module.exports = router;

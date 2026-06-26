const express = require('express');
const router = express.Router();
const c = require('../controllers/cotizacion.controller');
const auth = require('../middlewares/auth.middleware');

router.get('/', auth, c.obtenerCotizaciones);
router.post('/', auth, c.crearCotizacion);
router.get('/:id', auth, c.obtenerCotizacion);
router.post('/:id/productos', auth, c.agregarProducto);
router.delete('/:id/productos/:id_detalle', auth, c.eliminarProducto);
router.patch('/:id/estado', auth, c.actualizarEstado);
router.post('/ia/recomendar', auth, c.obtenerRecomendaciones);
router.patch('/:id/info', auth, c.actualizarInfoCotizacion);
router.patch('/:id/productos/:id_detalle', auth, c.editarProducto);
router.post('/:id/ia-interaccion', auth, c.registrarInteraccionIA);
router.get('/:id/pdf', c.generarPDF);

module.exports = router;
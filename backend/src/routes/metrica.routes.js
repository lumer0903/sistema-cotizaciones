const express = require('express');
const metricaController = require('../controllers/metrica.controller');
const autenticarToken = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/rol.middleware');

const router = express.Router();

router.use(autenticarToken);
router.use(autorizarRoles('admin', 'gerente'));

// Calcular y guardar métricas mensuales (admin/gerente)
router.post('/calcular', metricaController.calcularMensual);

// Listar métricas con filtros
router.get('/', metricaController.listar);

// Obtener métricas para tesis (global + por vendedor)
router.get('/tesis', metricaController.obtenerTesis);

module.exports = router;
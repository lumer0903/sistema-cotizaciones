const express = require('express');
const cuentaCobrarController = require('../controllers/cuentaCobrar.controller');
const autenticarToken = require('../middlewares/auth.middleware');
const { autorizarCobranza } = require('../middlewares/autorizacion.middleware');

const router = express.Router();

router.use(autenticarToken);
router.use(autorizarCobranza);

// Listar cuentas por cobrar con filtros
router.get('/', cuentaCobrarController.listar);

// Obtener cuentas vencidas
router.get('/vencidas', cuentaCobrarController.vencidas);

// Obtener resumen de cobranza (KPIs)
router.get('/resumen', cuentaCobrarController.resumen);

// Obtener estado de cuenta de un cliente
router.get('/cliente/:id', cuentaCobrarController.estadoCuentaCliente);

module.exports = router;
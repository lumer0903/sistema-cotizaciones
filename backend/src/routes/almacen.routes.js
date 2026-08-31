const express = require('express');
const almacenController = require('../controllers/almacen.controller');
const autenticarToken = require('../middlewares/auth.middleware');
const autorizarRoles = require('../middlewares/rol.middleware');

const router = express.Router();

router.use(autenticarToken);
router.use(autorizarRoles('admin', 'gerente'));

// Listar almacenes
router.get('/', almacenController.listar);

// Obtener almacén principal
router.get('/principal', almacenController.obtenerPrincipal);

// Obtener almacén por ID
router.get('/:id', almacenController.obtener);

// Crear almacén
router.post('/', almacenController.crear);

// Actualizar almacén
router.put('/:id', almacenController.actualizar);

module.exports = router;
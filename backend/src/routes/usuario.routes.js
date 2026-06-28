const express = require('express');
const usuarioController = require('../controllers/usuario.controller');
const autenticarToken = require('../middlewares/auth.middleware');
const autorizarRoles = require('../middlewares/rol.middleware');

const router = express.Router();

router.use(autenticarToken);
router.get('/roles', usuarioController.roles);
router.put('/perfil', usuarioController.perfil);
router.get('/', autorizarRoles('admin', 'gerente'), usuarioController.listar);
router.post('/', autorizarRoles('admin', 'gerente'), usuarioController.crear);
router.put('/:id', autorizarRoles('admin', 'gerente'), usuarioController.actualizar);

module.exports = router;

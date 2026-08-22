const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const autenticarToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(autenticarToken);
router.get('/resumen', dashboardController.resumen);

module.exports = router;

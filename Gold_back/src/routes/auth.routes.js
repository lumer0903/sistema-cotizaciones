const express = require('express');
const authController = require('../controllers/auth.controller');
const autenticarToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', autenticarToken, authController.me);

module.exports = router;

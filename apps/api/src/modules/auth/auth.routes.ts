import { Router } from 'express';
import { loginController, refreshController, logoutController, meController, changePasswordController } from './auth.controller';
import { autenticarToken } from './auth.middleware';

const router = Router();

router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', autenticarToken, logoutController);
router.get('/me', autenticarToken, meController);
router.patch('/password', autenticarToken, changePasswordController);

export const authRoutes = router;
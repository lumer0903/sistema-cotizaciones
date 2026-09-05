import { Router } from 'express';
import { autenticarToken } from '../auth/auth.middleware';

const router = Router();

router.use(autenticarToken);

// TODO: Implement cotizacion routes
router.get('/', (req, res) => res.json({ success: true, message: 'Not implemented' }));

export const cotizacionRoutes = router;
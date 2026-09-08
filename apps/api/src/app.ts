import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { authRoutes } from './modules/auth/auth.routes';
import { productoRoutes } from './modules/productos/producto.routes';
import { cotizacionRoutes } from './modules/cotizaciones/cotizacion.routes';
import { ventaRoutes } from './modules/ventas/venta.routes';
import { almacenRoutes } from './modules/almacenes/almacen.routes';
import { usuarioRoutes } from './modules/usuarios/usuario.routes';
import { metricaRoutes } from './modules/metricas/metrica.routes';
import { errorHandler } from './common/middleware/errorHandler';
import { notFoundHandler } from './common/middleware/notFoundHandler';

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Demasiadas solicitudes, intente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Demasiados intentos de login, intente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'goldcontinent-api' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/productos', productoRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/almacenes', almacenRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/metricas', metricaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
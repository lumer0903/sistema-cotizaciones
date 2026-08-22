const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const productoRoutes = require('./routes/producto.routes');
const cotizacionRoutes = require('./routes/cotizacion.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const usuarioRoutes = require('./routes/usuario.routes');

const app = express();
const allowedOrigins = ['http://localhost:3001', 'http://localhost:3002'];

app.disable('x-powered-by');
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
    },
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'goldcontinent-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuarioRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` }));
app.use((err, _req, res, _next) => {
    console.error('Error interno:', err);
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'El archivo supera el límite permitido de 2 MB' });
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: status >= 500 ? 'Error interno del servidor' : err.message });
});

module.exports = app;

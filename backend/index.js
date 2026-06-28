const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./src/routes/auth.routes');
const productoRoutes = require('./src/routes/producto.routes');
const cotizacionRoutes = require('./src/routes/cotizacion.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const usuarioRoutes = require('./src/routes/usuario.routes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(frontendPath));

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'goldcontinent-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuarioRoutes);

app.get('/', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});

app.use((err, _req, res, _next) => {
    console.error('Error interno:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'El archivo supera el limite permitido de 2 MB'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor'
    });
});

app.listen(PORT, () => {
    console.log(`Servidor Gold Continent activo en http://localhost:${PORT}`);
});

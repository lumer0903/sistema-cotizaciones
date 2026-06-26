const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/pages', express.static(path.join(__dirname, '../frontend/pages')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// Rutas API
const authRoutes = require('./src/routes/auth.routes');
const polizaRoutes = require('./src/routes/poliza.routes');
const cotizacionRoutes = require('./src/routes/cotizacion.routes');
const clienteRoutes = require('./src/routes/cliente.routes');

app.use('/api/auth', authRoutes);
app.use('/api', polizaRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/clientes', clienteRoutes);

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 — siempre al final
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor en http://localhost:${PORT}`);
});
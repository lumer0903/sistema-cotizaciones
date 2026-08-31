const metricaService = require('../services/metrica.service');

async function calcularMensual(req, res, next) {
    try {
        const { anio, mes } = req.body;
        if (!anio || !mes) {
            return res.status(400).json({ success: false, message: 'anio y mes son requeridos' });
        }
        const result = await metricaService.calcularYGuardarMensual(Number(anio), Number(mes));
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

async function listar(req, res, next) {
    try {
        const metricas = await metricaService.obtenerMetricas(req.query);
        res.json({ success: true, data: metricas });
    } catch (error) {
        next(error);
    }
}

async function obtenerTesis(req, res, next) {
    try {
        const { anio, mes } = req.query;
        if (!anio || !mes) {
            return res.status(400).json({ success: false, message: 'anio y mes son requeridos' });
        }
        const data = await metricaService.obtenerMetricasTesis(Number(anio), Number(mes));
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    calcularMensual,
    listar,
    obtenerTesis
};
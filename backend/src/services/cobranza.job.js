/**
 * Job de Cobranza - Cron nocturno (03:00)
 * Actualiza días de atraso, marca cuentas vencidas, log de alertas
 */

const cron = require('node-cron');
const cuentaCobrarService = require('./cuentaCobrar.service');

let jobCobranza = null;

function iniciarJobCobranza() {
    // Cron: 0 3 * * * = cada día a las 03:00 AM
    jobCobranza = cron.schedule('0 3 * * *', async () => {
        console.log('[CobranzaJob] Iniciando job nocturno de cobranza...');
        const inicio = Date.now();

        try {
            // Actualizar días de atraso y marcar vencidas
            const count = await cuentaCobrarService.actualizarDiasAtraso();

            // Obtener resumen para logs
            const resumen = await cuentaCobrarService.obtenerResumenCobranza();

            console.log('[CobranzaJob] Resumen:', {
                cuentasVencidas: resumen.cuentasVencidas,
                totalVencido: resumen.totalVencido,
                carteraVencidaPct: resumen.carteraVencidaPct,
                duracionMs: Date.now() - inicio
            });

            // Log de alerta si hay cartera vencida significativa
            if (resumen.carteraVencidaPct > 10) {
                console.warn(`[CobranzaJob] ALERTA: Cartera vencida ${resumen.carteraVencidaPct}% (${resumen.totalVencido} de ${resumen.totalPendiente})`);
            }

        } catch (error) {
            console.error('[CobranzaJob] Error:', error.message);
        }
    }, {
        scheduled: true,
        timezone: 'America/Lima'
    });

    console.log('[CobranzaJob] Programado para ejecutarse a las 03:00 AM (America/Lima)');
    return jobCobranza;
}

function detenerJobCobranza() {
    if (jobCobranza) {
        jobCobranza.stop();
        jobCobranza = null;
        console.log('[CobranzaJob] Detenido');
    }
}

function ejecutarManualmente() {
    return cuentaCobrarService.actualizarDiasAtraso();
}

module.exports = {
    iniciarJobCobranza,
    detenerJobCobranza,
    ejecutarManualmente
};
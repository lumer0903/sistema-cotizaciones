/**
 * Servicio de Métricas para Tesis
 * Cálculo mensual de KPIs: tiempo promedio cotización, eficacia, conversión, rendimiento monetario
 */

const prisma = require('../config/prisma');

function money(value) {
    return Number(value || 0);
}

async function calcularMetricasMensuales(anio, mes, idUsuario = null) {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0, 23, 59, 59, 999);

    // Filtro base por fechas
    const filtroFecha = { gte: inicio, lte: fin };

    // Construir where para cotizaciones
    const whereCoti = {
        created_at: filtroFecha,
        ...(idUsuario ? { id_usuario: Number(idUsuario) } : {})
    };

    // Construir where para ventas
    const whereVenta = {
        fecha_emision: filtroFecha,
        ...(idUsuario ? { id_usuario: Number(idUsuario) } : {})
    };

    // 1. Cotizaciones
    const [
        totalCotizaciones,
        cotizacionesEnviadas,
        cotizacionesAprobadas,
        cotizacionesRechazadas,
        cotizacionesVencidas,
        metricasTiempo,
        montosCotizaciones
    ] = await Promise.all([
        prisma.cotizacion.count({ where: whereCoti }),
        prisma.cotizacion.count({ where: { ...whereCoti, estado: 'enviada' } }),
        prisma.cotizacion.count({ where: { ...whereCoti, estado: 'aprobada' } }),
        prisma.cotizacion.count({ where: { ...whereCoti, estado: 'rechazada' } }),
        prisma.cotizacion.count({ where: { ...whereCoti, estado: 'borrador', fecha_vencimiento: { lt: new Date() } } }),
        // Tiempo promedio: borrador -> enviada
        prisma.cotizacion.aggregate({
            where: { ...whereCoti, estado: { in: ['enviada', 'aprobada', 'rechazada'] }, tiempo_inicio: { not: null }, tiempo_fin: { not: null } },
            _sum: { tiempo_fin: true, tiempo_inicio: true },
            _count: true
        }),
        // Montos
        prisma.cotizacion.aggregate({
            where: whereCoti,
            _sum: { total: true }
        })
    ]);

    // 2. Ventas
    const [
        totalVentas,
        ventasCredito,
        ventasContado,
        montosVentas,
        ventasDesdeCoti,
        ventasDirectas
    ] = await Promise.all([
        prisma.venta.count({ where: whereVenta }),
        prisma.venta.count({ where: { ...whereVenta, tipoPago: 'credito' } }),
        prisma.venta.count({ where: { ...whereVenta, tipoPago: 'contado' } }),
        prisma.venta.aggregate({ where: whereVenta, _sum: { total: true } }),
        prisma.venta.aggregate({ where: { ...whereVenta, id_cotizacion: { not: null } }, _sum: { total: true } }),
        prisma.venta.aggregate({ where: { ...whereVenta, id_cotizacion: null }, _sum: { total: true } })
    ]);

    // 3. Cuentas por cobrar (snapshot fin de mes)
    const finMes = new Date(anio, mes, 0, 23, 59, 59, 999);
    const [porCobrar, vencido] = await Promise.all([
        prisma.cuentaCobrar.aggregate({
            where: { fechaVencimiento: { lte: finMes }, estado: { in: ['pendiente', 'parcial', 'vencida'] } },
            _sum: { montoPendiente: true },
            _count: true
        }),
        prisma.cuentaCobrar.aggregate({
            where: { fechaVencimiento: { lt: finMes }, estado: { in: ['pendiente', 'parcial', 'vencida'] } },
            _sum: { montoPendiente: true },
            _count: true
        })
    ]);

    // 4. Calcular KPIs
    const tiempoPromedioMinutos = metricasTiempo._count > 0
        ? Number(((metricasTiempo._sum.tiempo_fin - metricasTiempo._sum.tiempo_inicio) / (1000 * 60 * metricasTiempo._count)).toFixed(2))
        : 0;

    const eficaciaPorcentaje = cotizacionesEnviadas > 0
        ? Number(((cotizacionesAprobadas / cotizacionesEnviadas) * 100).toFixed(2))
        : 0;

    const conversionCotiVenta = montosCotizaciones._sum.total > 0
        ? Number(((money(montosVentas._sum.total) / money(montosCotizaciones._sum.total)) * 100).toFixed(2))
        : 0;

    const rendimientoMonetario = money(montosVentas._sum.total) > 0
        ? Number(((money(montosVentas._sum.total) / (money(montosVentas._sum.total) + 0)) * 100).toFixed(2))
        : 100; // Solo ventas del sistema por ahora

    const ticketPromedio = totalVentas > 0
        ? Number((money(montosVentas._sum.total) / totalVentas).toFixed(2))
        : 0;

    const carteraVencidaPct = money(porCobrar._sum.montoPendiente) > 0
        ? Number(((money(vencido._sum.montoPendiente) / money(porCobrar._sum.montoPendiente)) * 100).toFixed(2))
        : 0;

    return {
        anio,
        mes,
        id_usuario: idUsuario,
        // Conteos
        total_cotizaciones: totalCotizaciones,
        cotizaciones_enviadas: cotizacionesEnviadas,
        cotizaciones_aprobadas: cotizacionesAprobadas,
        cotizaciones_rechazadas: cotizacionesRechazadas,
        cotizaciones_vencidas: cotizacionesVencidas,
        // Tiempo
        tiempo_total_segundos: money(metricasTiempo._sum.tiempo_fin) - money(metricasTiempo._sum.tiempo_inicio),
        tiempo_promedio_minutos: tiempoPromedioMinutos,
        // Montos cotizaciones
        monto_total_cotizado: money(montosCotizaciones._sum.total),
        monto_aprobado: money(montosCotizaciones._sum.total), // aproximado
        // Ventas
        total_ventas: totalVentas,
        ventas_credito_count: ventasCredito,
        ventas_contado_count: ventasContado,
        monto_ventas_total: money(montosVentas._sum.total),
        monto_ventas_desde_coti: money(ventasDesdeCoti._sum.total),
        monto_ventas_directas: money(ventasDirectas._sum.total),
        // KPIs
        eficacia_porcentaje: eficaciaPorcentaje,
        conversion_coti_venta: conversionCotiVenta,
        rendimiento_monetario: rendimientoMonetario,
        ticket_promedio: ticketPromedio,
        tiempo_promedio_cotizacion: tiempoPromedioMinutos,
        // Cobranza
        monto_por_cobrar: money(porCobrar._sum.montoPendiente),
        monto_vencido: money(vencido._sum.montoPendiente),
        cartera_vencida_porcentaje: carteraVencidaPct
    };
}

async function upsertMetricaMensual(data) {
    return prisma.metricaMensual.upsert({
        where: {
            anio_mes_id_usuario: {
                anio: data.anio,
                mes: data.mes,
                id_usuario: data.id_usuario || 0
            }
        },
        update: data,
        create: data
    });
}

async function calcularYGuardarMensual(anio, mes) {
    // Calcular global
    const global = await calcularMetricasMensuales(anio, mes);
    await upsertMetricaMensual(global);

    // Calcular por vendedor
    const vendedores = await prisma.usuario.findMany({
        where: { rol: 'vendedor', activo: true },
        select: { id_usuario: true }
    });

    for (const v of vendedores) {
        const data = await calcularMetricasMensuales(anio, mes, v.id_usuario);
        await upsertMetricaMensual(data);
    }

    return { global, vendedores: vendedores.length };
}

async function obtenerMetricas(filtros = {}) {
    const { anio, mes, idUsuario, granularidad = 'mensual' } = filtros;
    const where = {};

    if (anio) where.anio = Number(anio);
    if (mes) where.mes = Number(mes);
    if (idUsuario) where.id_usuario = Number(idUsuario);

    return prisma.metricaMensual.findMany({
        where,
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        take: 100
    });
}

async function obtenerMetricasTesis(anio, mes) {
    const global = await prisma.metricaMensual.findUnique({
        where: { anio_mes_id_usuario: { anio: Number(anio), mes: Number(mes), id_usuario: 0 } }
    });

    const vendedores = await prisma.metricaMensual.findMany({
        where: { anio: Number(anio), mes: Number(mes), id_usuario: { not: 0 } },
        include: { usuario: { select: { nombre: true, email: true } } },
        orderBy: { ticket_promedio: 'desc' }
    });

    return { global, vendedores };
}

module.exports = {
    calcularMetricasMensuales,
    upsertMetricaMensual,
    calcularYGuardarMensual,
    obtenerMetricas,
    obtenerMetricasTesis
};
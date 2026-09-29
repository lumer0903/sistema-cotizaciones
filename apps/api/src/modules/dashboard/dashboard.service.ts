import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

export interface KpiResponse {
  tasaConversion: number;
  efectividadIA: number;
  tiempoPromedioCotizacion: number;
  alertasStockActivas: number;
  /** Indicador de tesis: % de cotizaciones aceptadas (aprobadas / total registradas × 100). */
  eficacia: number;
  /** Indicador de tesis: % de ingresos (suma de aprobadas / suma total × 100). */
  rendimientoMonetario: number;
}

export interface AlertaStockDetalle {
  id_alerta: number;
  id_producto: number;
  codigo: string;
  descripcion: string;
  id_almacen: number;
  almacen_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
  created_at: Date;
}

export interface DetalleKpisResponse {
  kpis: KpiResponse;
  cotizaciones: {
    total: number;
    borrador: number;
    enviada: number;
    aprobada: number;
    rechazada: number;
  };
  itemsAprobados: {
    total: number;
    sugeridosIA: number;
  };
  alertasStock: AlertaStockDetalle[];
  graficos: {
    cotizadoVsVendido: Array<{ mes: string; cotizado: number; vendido: number }>;
    alertasPorAlmacen: Array<{ almacen: string; cantidad: number }>;
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(): Promise<KpiResponse> {
    const [cotizacionesStats, itemsStats, tiempoStats, alertasCount, rendimientoMonetario] =
      await Promise.all([
        this.getCotizacionesStats(),
        this.getItemsStats(),
        this.getTiempoPromedioStats(),
        this.getAlertasStockActivas(),
        this.getRendimientoMonetarioStats(),
      ]);

    return this.buildKpis(cotizacionesStats, itemsStats, tiempoStats, alertasCount, rendimientoMonetario);
  }

  async getDetalleKpis(): Promise<DetalleKpisResponse> {
    const [
      cotizacionesStats,
      itemsStats,
      tiempoStats,
      alertasCount,
      rendimientoMonetario,
      alertasStock,
      graficoCotizadoVendido,
      graficoAlertasPorAlmacen,
    ] = await Promise.all([
      this.getCotizacionesStats(),
      this.getItemsStats(),
      this.getTiempoPromedioStats(),
      this.getAlertasStockActivas(),
      this.getRendimientoMonetarioStats(),
      this.getAlertasStockDetalle(),
      this.getGraficoCotizadoVsVendido(),
      this.getGraficoAlertasPorAlmacen(),
    ]);

    const kpis = this.buildKpis(cotizacionesStats, itemsStats, tiempoStats, alertasCount, rendimientoMonetario);

    return {
      kpis,
      cotizaciones: {
        total: cotizacionesStats.total,
        borrador: cotizacionesStats.borrador,
        enviada: cotizacionesStats.enviada,
        aprobada: cotizacionesStats.aprobada,
        rechazada: cotizacionesStats.rechazada,
      },
      itemsAprobados: {
        total: itemsStats.totalItemsAprobados,
        sugeridosIA: itemsStats.itemsSugeridosIA,
      },
      alertasStock,
      graficos: {
        cotizadoVsVendido: graficoCotizadoVendido,
        alertasPorAlmacen: graficoAlertasPorAlmacen,
      },
    };
  }

  private buildKpis(
    cotizacionesStats: Awaited<ReturnType<DashboardService['getCotizacionesStats']>>,
    itemsStats: Awaited<ReturnType<DashboardService['getItemsStats']>>,
    tiempoStats: number,
    alertasCount: number,
    rendimientoMonetario: number,
  ): KpiResponse {
    const tasaConversion = cotizacionesStats.totalEnviadasAprobadasRechazadas > 0
      ? (cotizacionesStats.aprobada / cotizacionesStats.totalEnviadasAprobadasRechazadas) * 100
      : 0;

    const efectividadIA = itemsStats.totalItemsAprobados > 0
      ? (itemsStats.itemsSugeridosIA / itemsStats.totalItemsAprobados) * 100
      : 0;

    // Eficacia de la tesis: aceptadas (aprobadas) sobre el TOTAL registrado
    const eficacia = cotizacionesStats.total > 0
      ? (cotizacionesStats.aprobada / cotizacionesStats.total) * 100
      : 0;

    return {
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      efectividadIA: Math.round(efectividadIA * 100) / 100,
      tiempoPromedioCotizacion: Math.round(tiempoStats * 100) / 100,
      alertasStockActivas: alertasCount,
      eficacia: Math.round(eficacia * 100) / 100,
      rendimientoMonetario,
    };
  }

  private async getCotizacionesStats(): Promise<{
    total: number;
    borrador: number;
    enviada: number;
    aprobada: number;
    rechazada: number;
    totalEnviadasAprobadasRechazadas: number;
  }> {
    // 1 consulta groupBy en vez de 5 counts separados
    const grupos = await this.prisma.cotizacion.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const cuenta = new Map(grupos.map((g) => [g.estado, g._count._all]));
    const borrador = cuenta.get(EstadoCotizacion.borrador) ?? 0;
    const enviada = cuenta.get(EstadoCotizacion.enviada) ?? 0;
    const aprobada = cuenta.get(EstadoCotizacion.aprobada) ?? 0;
    const rechazada = cuenta.get(EstadoCotizacion.rechazada) ?? 0;
    const total = grupos.reduce((s, g) => s + g._count._all, 0);

    return {
      total,
      borrador,
      enviada,
      aprobada,
      rechazada,
      totalEnviadasAprobadasRechazadas: enviada + aprobada + rechazada,
    };
  }

  private async getItemsStats(): Promise<{
    totalItemsAprobados: number;
    itemsSugeridosIA: number;
  }> {
    const [totalItemsAprobados, itemsSugeridosIA] = await Promise.all([
      this.prisma.cotizacionDetalle.count({
        where: {
          cotizacion: { estado: EstadoCotizacion.aprobada },
        },
      }),
      this.prisma.cotizacionDetalle.count({
        where: {
          cotizacion: { estado: EstadoCotizacion.aprobada },
          es_sugerido_ia: true,
        },
      }),
    ]);

    return { totalItemsAprobados, itemsSugeridosIA };
  }

  private async getTiempoPromedioStats(): Promise<number> {
    // AVG en SQL: antes cargaba TODAS las cotizaciones finalizadas en memoria
    const rows = await this.prisma.$queryRaw<Array<{ avg_min: number | string | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (tiempo_fin - tiempo_inicio)) / 60) AS avg_min
      FROM cotizaciones
      WHERE estado IN ('enviada', 'aprobada', 'rechazada')
        AND tiempo_fin IS NOT NULL`;

    return Number(rows[0]?.avg_min ?? 0);
  }

  /**
   * Rendimiento monetario de la tesis:
   * X1 = ventas de cotizaciones (suma del total de APROBADAS, que equivalen a
   *      pago completo) / X2 = ventas totales (suma del total de TODAS) × 100.
   */
  private async getRendimientoMonetarioStats(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ aprobadas: number | string; total: number | string }>>`
      SELECT COALESCE(SUM(total) FILTER (WHERE estado = 'aprobada'), 0) AS aprobadas,
             COALESCE(SUM(total), 0) AS total
      FROM cotizaciones`;

    const aprobadas = Number(rows[0]?.aprobadas ?? 0);
    const total = Number(rows[0]?.total ?? 0);
    if (total <= 0) return 0;
    return Math.round((aprobadas / total) * 10000) / 100;
  }

  private async getAlertasStockActivas(): Promise<number> {
    return this.prisma.alertas_stock.count({ where: { estado: 'activa' } });
  }

  private async getAlertasStockDetalle(): Promise<AlertaStockDetalle[]> {
    const alertas = await this.prisma.alertas_stock.findMany({
      where: { estado: 'activa' },
      select: {
        id_alerta: true,
        id_producto: true,
        id_almacen: true,
        stock_actual: true,
        stock_minimo: true,
        estado: true,
        created_at: true,
        productos: { select: { codigo: true, descripcion: true } },
        almacenes: { select: { nombre: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return alertas.map(a => ({
      id_alerta: a.id_alerta,
      id_producto: a.id_producto,
      codigo: a.productos.codigo,
      descripcion: a.productos.descripcion,
      id_almacen: a.id_almacen,
      almacen_nombre: a.almacenes.nombre,
      stock_actual: a.stock_actual,
      stock_minimo: a.stock_minimo,
      estado: a.estado,
      created_at: a.created_at,
    }));
  }

  private async getGraficoCotizadoVsVendido(): Promise<Array<{ mes: string; cotizado: number; vendido: number }>> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 1 consulta con FILTER en vez de 12 aggregates en loop
    const rows = await this.prisma.$queryRaw<
      Array<{ anio: number; mes_num: number; cotizado: number | string | null; vendido: number | string | null }>
    >`
      SELECT
        EXTRACT(YEAR FROM created_at)::int AS anio,
        EXTRACT(MONTH FROM created_at)::int AS mes_num,
        SUM(total) FILTER (WHERE estado IN ('enviada', 'aprobada')) AS cotizado,
        SUM(total) FILTER (WHERE estado IN ('aprobada', 'parcialmente_pagada')) AS vendido
      FROM cotizaciones
      WHERE created_at >= ${start} AND created_at < ${end}
      GROUP BY 1, 2
      ORDER BY 1, 2`;

    const byMonth = new Map(rows.map((r) => [`${r.anio}-${r.mes_num}`, r]));
    const months: Array<{ mes: string; cotizado: number; vendido: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesLabel = date.toLocaleString('es-PE', { month: 'short', year: '2-digit' });
      const row = byMonth.get(`${date.getFullYear()}-${date.getMonth() + 1}`);

      months.push({
        mes: mesLabel,
        cotizado: Number(row?.cotizado ?? 0),
        vendido: Number(row?.vendido ?? 0),
      });
    }

    return months;
  }

  private async getGraficoAlertasPorAlmacen(): Promise<Array<{ almacen: string; cantidad: number }>> {
    const alertas = await this.prisma.alertas_stock.groupBy({
      by: ['id_almacen'],
      where: { estado: 'activa' },
      _count: { id_alerta: true },
    });

    const almacenes = await this.prisma.almacen.findMany({
      where: { id_almacen: { in: alertas.map(a => a.id_almacen) } },
      select: { id_almacen: true, nombre: true },
    });

    const almacenMap = new Map(almacenes.map(a => [a.id_almacen, a.nombre]));

    return alertas.map(a => ({
      almacen: almacenMap.get(a.id_almacen) ?? `Almacén ${a.id_almacen}`,
      cantidad: a._count.id_alerta,
    }));
  }
}
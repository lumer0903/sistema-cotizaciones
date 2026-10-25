import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  /** Monto total de las cotizaciones aprobadas dentro del alcance del usuario. */
  ventasTotales: number;
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

/** Payload ligero exclusivo de los widgets gráficos (Recharts). */
export interface GraficosResponse {
  cotizadoVsVendido: Array<{ mes: string; cotizado: number; vendido: number }>;
  alertasPorAlmacen: Array<{ almacen: string; cantidad: number }>;
  cotizacionesPorEstado: Array<{ estado: string; cantidad: number }>;
}

/** Filtros globales del dashboard (query params). */
export interface FiltrosDashboard {
  /** Fecha inicio en formato ISO (YYYY-MM-DD). */
  fechaInicio?: string;
  /** Fecha fin en formato ISO (YYYY-MM-DD). */
  fechaFin?: string;
  /** Restringe a un vendedor específico (sólo admin puede usarlo). */
  idVendedor?: number;
  /** Restringe a un almacén específico. */
  idAlmacen?: number;
}

/** Construye el fragmento SQL de rango de fechas para las queries crudas. */
function rangoFechasSql(f?: FiltrosDashboard): Prisma.Sql {
  if (f?.fechaInicio && f?.fechaFin) {
    const inicio = new Date(`${f.fechaInicio}T00:00:00`);
    const fin = new Date(`${f.fechaFin}T23:59:59.999`);
    return Prisma.sql`AND created_at BETWEEN ${inicio} AND ${fin}`;
  }
  return Prisma.sql``;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `alcance` = alcance de datos del usuario (null = admin, ve todo;
   * número = sólo sus cotizaciones). Las alertas de stock son globales.
   * `filtros` = filtros globales (rango de fechas, vendedor, almacén).
   */
  async getKpis(alcance: number | null = null, filtros?: FiltrosDashboard): Promise<KpiResponse> {
    // Si el admin filtra por un vendedor, ese vendedor pasa a ser el alcance
    const alcanceEfectivo = alcance === null && filtros?.idVendedor ? filtros.idVendedor : alcance;

    const [cotizacionesStats, itemsStats, tiempoStats, alertasCount, rendimientoMonetario] =
      await Promise.all([
        this.getCotizacionesStats(alcanceEfectivo, filtros),
        this.getItemsStats(alcanceEfectivo, filtros),
        this.getTiempoPromedioStats(alcanceEfectivo, filtros),
        this.getAlertasStockActivas(filtros),
        this.getRendimientoMonetarioStats(alcanceEfectivo, filtros),
      ]);

    return this.buildKpis(cotizacionesStats, itemsStats, tiempoStats, alertasCount, rendimientoMonetario);
  }

  async getDetalleKpis(alcance: number | null = null): Promise<DetalleKpisResponse> {
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
      this.getCotizacionesStats(alcance),
      this.getItemsStats(alcance),
      this.getTiempoPromedioStats(alcance),
      this.getAlertasStockActivas(),
      this.getRendimientoMonetarioStats(alcance),
      this.getAlertasStockDetalle(),
      this.getGraficoCotizadoVsVendido(alcance),
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

  /**
   * Endpoint ligero para los widgets gráficos (Recharts).
   * Sólo agregaciones nativas (groupBy / SQL FILTER), sin cargas en memoria.
   */
  async getGraficos(alcance: number | null = null, filtros?: FiltrosDashboard): Promise<GraficosResponse> {
    const alcanceEfectivo = alcance === null && filtros?.idVendedor ? filtros.idVendedor : alcance;
    const whereCotizaciones: Prisma.CotizacionWhereInput = {
      ...(alcanceEfectivo !== null ? { id_usuario: alcanceEfectivo } : {}),
      ...(filtros?.fechaInicio && filtros?.fechaFin
        ? {
            created_at: {
              gte: new Date(`${filtros.fechaInicio}T00:00:00`),
              lte: new Date(`${filtros.fechaFin}T23:59:59.999`),
            },
          }
        : {}),
    };

    const [cotizadoVsVendido, alertasPorAlmacen, gruposEstado] = await Promise.all([
      this.getGraficoCotizadoVsVendido(alcanceEfectivo, filtros),
      this.getGraficoAlertasPorAlmacen(filtros),
      this.prisma.cotizacion.groupBy({
        by: ['estado'],
        where: whereCotizaciones,
        _count: { _all: true },
      }),
    ]);

    return {
      cotizadoVsVendido,
      alertasPorAlmacen,
      cotizacionesPorEstado: gruposEstado.map((g) => ({
        estado: g.estado,
        cantidad: g._count._all,
      })),
    };
  }

  /**
   * Endpoint ligero: top de productos con stock bajo (take ≤ 10).
   * El stock es global (no aplica alcance por usuario); opcionalmente filtra por almacén.
   */
  async getStockBajo(take = 10, filtros?: FiltrosDashboard): Promise<AlertaStockDetalle[]> {
    const limit = Math.min(Math.max(Math.trunc(take) || 10, 1), 10);
    const alertas = await this.prisma.alertas_stock.findMany({
      where: {
        estado: 'activa',
        ...(filtros?.idAlmacen ? { id_almacen: filtros.idAlmacen } : {}),
      },
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
      // Urgencia: menor stock real primero, luego el más crítico (mayor déficit)
      orderBy: [{ stock_actual: 'asc' }, { stock_minimo: 'desc' }],
      take: limit,
    });

    return this.mapAlertas(alertas);
  }

  private buildKpis(
    cotizacionesStats: Awaited<ReturnType<DashboardService['getCotizacionesStats']>>,
    itemsStats: Awaited<ReturnType<DashboardService['getItemsStats']>>,
    tiempoStats: number,
    alertasCount: number,
    rendimiento: { pct: number; ventasTotales: number },
  ): KpiResponse {
    const tasaConversion = cotizacionesStats.totalEnviadasAprobadasRechazadas > 0
      ? (cotizacionesStats.aprobada / cotizacionesStats.totalEnviadasAprobadasRechazadas) * 100
      : 0;

    const efectividadIA = itemsStats.totalItemsAprobados > 0
      ? (itemsStats.itemsSugeridosIA / itemsStats.totalItemsAprobados) * 100
      : 0;

    // Eficacia de la tesis: X1 = SOLO cotizaciones con estado 'aprobada'
    // (estrictamente; no incluye convertida_a_venta ni otros estados),
    // X2 = total de cotizaciones registradas (todos los estados).
    const eficacia = cotizacionesStats.total > 0
      ? (cotizacionesStats.aprobada / cotizacionesStats.total) * 100
      : 0;

    return {
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      efectividadIA: Math.round(efectividadIA * 100) / 100,
      tiempoPromedioCotizacion: Math.round(tiempoStats * 100) / 100,
      alertasStockActivas: alertasCount,
      eficacia: Math.round(eficacia * 100) / 100,
      rendimientoMonetario: rendimiento.pct,
      ventasTotales: rendimiento.ventasTotales,
    };
  }

  private async getCotizacionesStats(
    alcance: number | null = null,
    filtros?: FiltrosDashboard,
  ): Promise<{
    total: number;
    borrador: number;
    enviada: number;
    aprobada: number;
    rechazada: number;
    totalEnviadasAprobadasRechazadas: number;
  }> {
    // 1 consulta groupBy en vez de 5 counts separados
    const where: Prisma.CotizacionWhereInput = {
      ...(alcance !== null ? { id_usuario: alcance } : {}),
      ...(filtros?.fechaInicio && filtros?.fechaFin
        ? {
            created_at: {
              gte: new Date(`${filtros.fechaInicio}T00:00:00`),
              lte: new Date(`${filtros.fechaFin}T23:59:59.999`),
            },
          }
        : {}),
    };
    const grupos = await this.prisma.cotizacion.groupBy({
      by: ['estado'],
      where,
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

  private async getItemsStats(
    alcance: number | null = null,
    filtros?: FiltrosDashboard,
  ): Promise<{
    totalItemsAprobados: number;
    itemsSugeridosIA: number;
  }> {
    const cotizacionWhere: Prisma.CotizacionWhereInput = {
      estado: EstadoCotizacion.aprobada,
      ...(alcance !== null ? { id_usuario: alcance } : {}),
      ...(filtros?.fechaInicio && filtros?.fechaFin
        ? {
            created_at: {
              gte: new Date(`${filtros.fechaInicio}T00:00:00`),
              lte: new Date(`${filtros.fechaFin}T23:59:59.999`),
            },
          }
        : {}),
    };

    const [totalItemsAprobados, itemsSugeridosIA] = await Promise.all([
      this.prisma.cotizacionDetalle.count({
        where: { cotizacion: cotizacionWhere },
      }),
      this.prisma.cotizacionDetalle.count({
        where: { cotizacion: cotizacionWhere, es_sugerido_ia: true },
      }),
    ]);

    return { totalItemsAprobados, itemsSugeridosIA };
  }

  private async getTiempoPromedioStats(
    alcance: number | null = null,
    filtros?: FiltrosDashboard,
  ): Promise<number> {
    // AVG en SQL: antes cargaba TODAS las cotizaciones finalizadas en memoria
    const alcanceSql =
      alcance !== null ? Prisma.sql`AND id_usuario = ${alcance}` : Prisma.sql``;
    const rangoSql = rangoFechasSql(filtros);
    const rows = await this.prisma.$queryRaw<Array<{ avg_min: number | string | null }>>(
      Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM (tiempo_fin - tiempo_inicio)) / 60) AS avg_min
        FROM cotizaciones
        WHERE estado IN ('enviada', 'aprobada', 'rechazada')
          AND tiempo_fin IS NOT NULL ${alcanceSql} ${rangoSql}`,
    );

    return Number(rows[0]?.avg_min ?? 0);
  }

  /**
   * Rendimiento monetario de la tesis:
   * X1 = ventas de cotizaciones (suma del total de las APROBADAS, pago completo)
   *      / X2 = cotizaciones cerradas/finalizadas (enviada + aprobada + rechazada,
   *      excluye borradores y estados no cerrados) × 100.
   * `ventasTotales` es X1 en dinero (tarjeta "Ventas" del dashboard).
   */
  private async getRendimientoMonetarioStats(
    alcance: number | null = null,
    filtros?: FiltrosDashboard,
  ): Promise<{ pct: number; ventasTotales: number }> {
    const conditions: Prisma.Sql[] = [];
    if (alcance !== null) conditions.push(Prisma.sql`id_usuario = ${alcance}`);
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      const inicio = new Date(`${filtros.fechaInicio}T00:00:00`);
      const fin = new Date(`${filtros.fechaFin}T23:59:59.999`);
      conditions.push(Prisma.sql`created_at BETWEEN ${inicio} AND ${fin}`);
    }
    const whereSql = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.sql``;
    const rows = await this.prisma.$queryRaw<Array<{ aprobadas: number | string; total: number | string }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(total) FILTER (WHERE estado = 'aprobada'), 0) AS aprobadas,
               COALESCE(SUM(total) FILTER (WHERE estado IN ('enviada', 'aprobada', 'rechazada')), 0) AS total
        FROM cotizaciones ${whereSql}`,
    );

    const aprobadas = Number(rows[0]?.aprobadas ?? 0);
    const total = Number(rows[0]?.total ?? 0);
    if (total <= 0) return { pct: 0, ventasTotales: aprobadas };
    return {
      pct: Math.round((aprobadas / total) * 10000) / 100,
      ventasTotales: aprobadas,
    };
  }

  private async getAlertasStockActivas(filtros?: FiltrosDashboard): Promise<number> {
    return this.prisma.alertas_stock.count({
      where: {
        estado: 'activa',
        ...(filtros?.idAlmacen ? { id_almacen: filtros.idAlmacen } : {}),
      },
    });
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

    return this.mapAlertas(alertas);
  }

  private mapAlertas(
    alertas: Array<{
      id_alerta: number;
      id_producto: number;
      id_almacen: number;
      stock_actual: number;
      stock_minimo: number;
      estado: string;
      created_at: Date;
      productos: { codigo: string; descripcion: string };
      almacenes: { nombre: string };
    }>,
  ): AlertaStockDetalle[] {
    return alertas.map((a) => ({
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

  private async getGraficoCotizadoVsVendido(
    alcance: number | null = null,
    filtros?: FiltrosDashboard,
  ): Promise<Array<{ mes: string; cotizado: number; vendido: number }>> {
    const now = new Date();
    let start: Date;
    let end: Date;
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      start = new Date(`${filtros.fechaInicio}T00:00:00`);
      end = new Date(`${filtros.fechaFin}T23:59:59.999`);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    const alcanceSql = alcance !== null ? Prisma.sql`AND id_usuario = ${alcance}` : Prisma.sql``;

    // 1 consulta con FILTER en vez de 12 aggregates en loop
    const rows = await this.prisma.$queryRaw<
      Array<{ anio: number; mes_num: number; cotizado: number | string | null; vendido: number | string | null }>
    >(
      Prisma.sql`
      SELECT
        EXTRACT(YEAR FROM created_at)::int AS anio,
        EXTRACT(MONTH FROM created_at)::int AS mes_num,
        SUM(total) FILTER (WHERE estado IN ('enviada', 'aprobada')) AS cotizado,
        SUM(total) FILTER (WHERE estado IN ('aprobada', 'parcialmente_pagada')) AS vendido
      FROM cotizaciones
      WHERE created_at >= ${start} AND created_at < ${end} ${alcanceSql}
      GROUP BY 1, 2
      ORDER BY 1, 2`,
    );

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

  private async getGraficoAlertasPorAlmacen(
    filtros?: FiltrosDashboard,
  ): Promise<Array<{ almacen: string; cantidad: number }>> {
    const alertas = await this.prisma.alertas_stock.groupBy({
      by: ['id_almacen'],
      where: {
        estado: 'activa',
        ...(filtros?.idAlmacen ? { id_almacen: filtros.idAlmacen } : {}),
      },
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
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

export interface KpiResponse {
  tasaConversion: number;
  efectividadIA: number;
  tiempoPromedioCotizacion: number;
  alertasStockActivas: number;
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
    const [cotizacionesStats, itemsStats, tiempoStats, alertasCount] = await Promise.all([
      this.getCotizacionesStats(),
      this.getItemsStats(),
      this.getTiempoPromedioStats(),
      this.getAlertasStockActivas(),
    ]);

    const tasaConversion = cotizacionesStats.totalEnviadasAprobadasRechazadas > 0
      ? (cotizacionesStats.aprobada / cotizacionesStats.totalEnviadasAprobadasRechazadas) * 100
      : 0;

    const efectividadIA = itemsStats.totalItemsAprobados > 0
      ? (itemsStats.itemsSugeridosIA / itemsStats.totalItemsAprobados) * 100
      : 0;

    return {
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      efectividadIA: Math.round(efectividadIA * 100) / 100,
      tiempoPromedioCotizacion: Math.round(tiempoStats * 100) / 100,
      alertasStockActivas: alertasCount,
    };
  }

  async getDetalleKpis(): Promise<DetalleKpisResponse> {
    const [
      kpis,
      cotizacionesStats,
      itemsStats,
      alertasStock,
      graficoCotizadoVendido,
      graficoAlertasPorAlmacen,
    ] = await Promise.all([
      this.getKpis(),
      this.getCotizacionesStats(),
      this.getItemsStats(),
      this.getAlertasStockDetalle(),
      this.getGraficoCotizadoVsVendido(),
      this.getGraficoAlertasPorAlmacen(),
    ]);

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

  private async getCotizacionesStats(): Promise<{
    total: number;
    borrador: number;
    enviada: number;
    aprobada: number;
    rechazada: number;
    totalEnviadasAprobadasRechazadas: number;
  }> {
    const [total, borrador, enviada, aprobada, rechazada] = await Promise.all([
      this.prisma.cotizacion.count(),
      this.prisma.cotizacion.count({ where: { estado: EstadoCotizacion.borrador } }),
      this.prisma.cotizacion.count({ where: { estado: EstadoCotizacion.enviada } }),
      this.prisma.cotizacion.count({ where: { estado: EstadoCotizacion.aprobada } }),
      this.prisma.cotizacion.count({ where: { estado: EstadoCotizacion.rechazada } }),
    ]);

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
    const cotizaciones = await this.prisma.cotizacion.findMany({
      where: {
        estado: { in: [EstadoCotizacion.enviada, EstadoCotizacion.aprobada, EstadoCotizacion.rechazada] },
        tiempo_fin: { not: null },
      },
      select: { tiempo_inicio: true, tiempo_fin: true },
    });

    if (cotizaciones.length === 0) return 0;

    const totalMinutes = cotizaciones.reduce((sum, c) => {
      const diff = new Date(c.tiempo_fin!).getTime() - new Date(c.tiempo_inicio).getTime();
      return sum + diff / (1000 * 60); // minutos
    }, 0);

    return totalMinutes / cotizaciones.length;
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
    const months: Array<{ mes: string; cotizado: number; vendido: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mesLabel = date.toLocaleString('es-PE', { month: 'short', year: '2-digit' });

      const [cotizado, vendido] = await Promise.all([
        this.prisma.cotizacion.aggregate({
          where: {
            estado: { in: [EstadoCotizacion.enviada, EstadoCotizacion.aprobada] },
            created_at: { gte: date, lt: nextMonth },
          },
          _sum: { total: true },
        }),
        this.prisma.venta.aggregate({
          where: {
            estado: { in: ['emitida', 'parcial', 'pagada'] },
            fecha_emision: { gte: date, lt: nextMonth },
          },
          _sum: { total: true },
        }),
      ]);

      months.push({
        mes: mesLabel,
        cotizado: Number(cotizado._sum.total ?? 0),
        vendido: Number(vendido._sum.total ?? 0),
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
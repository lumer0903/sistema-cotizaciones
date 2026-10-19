import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface FiltrosReporte {
  fechaInicio?: string;
  fechaFin?: string;
  idVendedor?: number;
  idAlmacen?: number;
  idCliente?: number;
  idProducto?: number;
}

export interface RankingProductoRow {
  idProducto: number;
  codigo: string;
  descripcion: string;
  cantidadVendida: number;
  ingresoTotal: number;
  numeroCotizaciones: number;
}

export interface AntiguedadDeudaRow {
  idCliente: number;
  cliente: string;
  rucDni: string | null;
  totalPendiente: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90mas: number;
  diasCreditoDefecto: number | null;
  diasGracia: number | null;
}

export interface AuditoriaIaRow {
  idInteraccion: number;
  createdAt: Date;
  tipoSugerencia: string | null;
  accionUsuario: string | null;
  productoOriginal: string | null;
  productoSugerido: string | null;
  idCotizacion: number | null;
  vendedor: string | null;
}

function buildWhereRangoFechas(f?: FiltrosReporte, alias = 'c'): Prisma.Sql {
  const campo = alias === 'i' ? Prisma.sql`i.created_at` : Prisma.sql`c.created_at`;
  const partes: Prisma.Sql[] = [];
  if (f?.fechaInicio) partes.push(Prisma.sql`AND ${campo} >= ${new Date(f.fechaInicio + 'T00:00:00-05:00')}`);
  if (f?.fechaFin) partes.push(Prisma.sql`AND ${campo} <= ${new Date(f.fechaFin + 'T23:59:59.999-05:00')}`);
  return partes.length ? Prisma.join(partes, ' ') : Prisma.empty;
}

function buildWhereVendedor(f?: FiltrosReporte, alias = 'c'): Prisma.Sql {
  if (f?.idVendedor) {
    if (alias === 'i') return Prisma.sql`AND i.id_usuario = ${f.idVendedor}`;
    return Prisma.sql`AND c.id_usuario = ${f.idVendedor}`;
  }
  return Prisma.empty;
}

function buildWhereCliente(f?: FiltrosReporte, alias = 'c'): Prisma.Sql {
  if (f?.idCliente) {
    if (alias === 'i') return Prisma.empty;
    return Prisma.sql`AND c.id_cliente = ${f.idCliente}`;
  }
  return Prisma.empty;
}

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getRankingProductos(
    filtros?: FiltrosReporte,
    take = 20,
    skip = 0,
  ): Promise<{ data: RankingProductoRow[]; total: number }> {
    const rango = buildWhereRangoFechas(filtros);
    const vendedor = buildWhereVendedor(filtros);

    try {
      const totalResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT cd.id_producto)::bigint AS total
          FROM cotizacion_detalle cd
          JOIN cotizaciones c ON cd.id_cotizacion = c.id_cotizacion
          WHERE c.estado = 'aprobada' ${rango} ${vendedor}
        `,
      );
      const total = Number(totalResult[0]?.total ?? 0);

      const rows = await this.prisma.$queryRaw<Array<RankingProductoRow>>(
        Prisma.sql`
          SELECT
            cd.id_producto AS "idProducto",
            p.codigo,
            p.descripcion,
            SUM(cd.cantidad)::int AS "cantidadVendida",
            SUM(cd.subtotal)::numeric(12,2) AS "ingresoTotal",
            COUNT(DISTINCT cd.id_cotizacion)::int AS "numeroCotizaciones"
          FROM cotizacion_detalle cd
          JOIN cotizaciones c ON cd.id_cotizacion = c.id_cotizacion
          JOIN productos p ON cd.id_producto = p.id_producto
          WHERE c.estado = 'aprobada' ${rango} ${vendedor}
          GROUP BY cd.id_producto, p.codigo, p.descripcion
          ORDER BY "cantidadVendida" DESC, "ingresoTotal" DESC
          LIMIT ${take} OFFSET ${skip}
        `,
      );

      return {
        data: rows.map(r => ({
          ...r,
          cantidadVendida: Number(r.cantidadVendida),
          ingresoTotal: Number(r.ingresoTotal),
          numeroCotizaciones: Number(r.numeroCotizaciones)
        })),
        total
      };
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), filtros },
        'Error en getRankingProductos',
      );
      throw new InternalServerErrorException('No se pudo consultar el reporte');
    }
  }

  async getAntiguedadDeuda(
    filtros?: FiltrosReporte,
    take = 20,
    skip = 0,
  ): Promise<{ data: AntiguedadDeudaRow[]; total: number }> {
    const hoy = new Date();
    const rango = buildWhereRangoFechas(filtros);
    const vendedor = buildWhereVendedor(filtros);
    const cliente = buildWhereCliente(filtros);

    try {
      const totalResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT c.id_cliente)::bigint AS total
          FROM cotizaciones c
          JOIN clientes cl ON c.id_cliente = cl.id_cliente
          WHERE c.estado IN ('enviada', 'aprobada', 'parcialmente_pagada')
            AND c.total > COALESCE((
              SELECT SUM(cp.monto) FROM cotizacion_pagos cp WHERE cp.id_cotizacion = c.id_cotizacion
            ), 0)
            ${rango} ${vendedor} ${cliente}
        `,
      );
      const total = Number(totalResult[0]?.total ?? 0);

      const rows = await this.prisma.$queryRaw<Array<AntiguedadDeudaRow>>(
        Prisma.sql`
          SELECT
            cl.id_cliente AS "idCliente",
            cl.nombre AS cliente,
            cl.ruc_dni AS "rucDni",
            SUM(c.total - COALESCE(cp_sum.monto_pagado, 0))::numeric(12,2) AS "totalPendiente",
            SUM(c.total - COALESCE(cp_sum.monto_pagado, 0)) FILTER (
              WHERE COALESCE(c.fecha_vencimiento, (c.created_at + interval '30 days')::timestamp) >= ${hoy} - interval '30 days'
            )::numeric(12,2) AS "d0_30",
            SUM(c.total - COALESCE(cp_sum.monto_pagado, 0)) FILTER (
              WHERE COALESCE(c.fecha_vencimiento, (c.created_at + interval '30 days')::timestamp) >= ${hoy} - interval '60 days' AND COALESCE(c.fecha_vencimiento, (c.created_at + interval '30 days')::timestamp) < ${hoy} - interval '30 days'
            )::numeric(12,2) AS "d31_60",
            SUM(c.total - COALESCE(cp_sum.monto_pagado, 0)) FILTER (
              WHERE COALESCE(c.fecha_vencimiento, (c.created_at + interval '30 days')::timestamp) >= ${hoy} - interval '90 days' AND COALESCE(c.fecha_vencimiento, (c.created_at + interval '30 days')::timestamp) < ${hoy} - interval '60 days'
            )::numeric(12,2) AS "d61_90",
            SUM(c.total - COALESCE(cp_sum.monto_pagado, 0)) FILTER (
              WHERE COALESCE(c.fecha_vencimiento, (c.created_at + interval '30 days')::timestamp) < ${hoy} - interval '90 days'
            )::numeric(12,2) AS "d90mas",
            cl."diasCreditoDefecto" AS "diasCreditoDefecto",
            cl."diasGracia" AS "diasGracia"
          FROM cotizaciones c
          JOIN clientes cl ON c.id_cliente = cl.id_cliente
          LEFT JOIN (
            SELECT id_cotizacion, SUM(monto) AS monto_pagado
            FROM cotizacion_pagos
            GROUP BY id_cotizacion
          ) cp_sum ON cp_sum.id_cotizacion = c.id_cotizacion
          WHERE c.estado IN ('enviada', 'aprobada', 'parcialmente_pagada')
            AND c.total > COALESCE(cp_sum.monto_pagado, 0)
            ${rango} ${vendedor} ${cliente}
          GROUP BY cl.id_cliente, cl.nombre, cl.ruc_dni, cl."diasCreditoDefecto", cl."diasGracia"
          ORDER BY "totalPendiente" DESC
          LIMIT ${take} OFFSET ${skip}
        `,
      );

      return {
        data: rows.map(r => ({
          ...r,
          totalPendiente: Number(r.totalPendiente || 0),
          d0_30: Number(r.d0_30 || 0),
          d31_60: Number(r.d31_60 || 0),
          d61_90: Number(r.d61_90 || 0),
          d90mas: Number(r.d90mas || 0)
        })),
        total
      };
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), filtros },
        'Error en getAntiguedadDeuda',
      );
      throw new InternalServerErrorException('No se pudo consultar el reporte');
    }
  }

  async getAuditoriaIa(
    filtros?: FiltrosReporte,
    take = 20,
    skip = 0,
  ): Promise<{ data: AuditoriaIaRow[]; total: number }> {
    const rango = buildWhereRangoFechas(filtros, 'i');
    const vendedor = buildWhereVendedor(filtros, 'i');

    try {
      const totalResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS total
          FROM ia_interacciones i
          LEFT JOIN usuarios u ON i.id_usuario = u.id_usuario
          WHERE 1=1 ${rango} ${vendedor}
        `,
      );
      const total = Number(totalResult[0]?.total ?? 0);

      const rows = await this.prisma.$queryRaw<Array<AuditoriaIaRow>>(
        Prisma.sql`
          SELECT
            i.id_interaccion AS "idInteraccion",
            i.created_at AS "createdAt",
            i.tipo_sugerencia AS "tipoSugerencia",
            i.accion_usuario AS "accionUsuario",
            po.descripcion AS "productoOriginal",
            ps.descripcion AS "productoSugerido",
            i.id_cotizacion AS "idCotizacion",
            u.nombre AS vendedor
          FROM ia_interacciones i
          LEFT JOIN productos po ON i.id_producto = po.id_producto
          LEFT JOIN productos ps ON i.id_producto_sugerido = ps.id_producto
          LEFT JOIN usuarios u ON i.id_usuario = u.id_usuario
          WHERE 1=1 ${rango} ${vendedor}
          ORDER BY i.created_at DESC
          LIMIT ${take} OFFSET ${skip}
        `,
      );

      return {
        data: rows.map(r => ({
          ...r,
          idInteraccion: Number(r.idInteraccion),
          idCotizacion: r.idCotizacion ? Number(r.idCotizacion) : null
        })),
        total
      };
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), filtros },
        'Error en getAuditoriaIa',
      );
      throw new InternalServerErrorException('No se pudo consultar el reporte');
    }
  }
}
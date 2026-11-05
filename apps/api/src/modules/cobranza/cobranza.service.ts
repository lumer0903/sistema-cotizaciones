import { registrarPagoSeguro, PagoInput } from '../../common/utils/pagos.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { verificarAlcance } from '../../common/utils/alcance.util';

interface RawCobranzaRow {
  id_cotizacion: number;
  numero: string;
  id_cliente: number | null;
  created_at: Date;
  fecha_vencimiento: Date | null;
  estado: string;
  total: number | string | Decimal;
  pagado: number | string | Decimal;
  cliente_id: number | null;
  cliente_nombre: string | null;
  cliente_ruc_dni: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
}

export interface CobranzaItemResponse {
  id_cotizacion: number;
  numero: string;
  id_cliente: number | null;
  created_at: Date;
  fecha_vencimiento: Date | null;
  estado_cotizacion: string;
  estado_cobranza: 'pendiente' | 'parcial' | 'pagada' | 'vencida';
  total: number;
  pagado: number;
  saldo: number;
  dias_atraso: number;
  vencida: boolean;
  cliente: {
    id_cliente: number;
    nombre: string;
    ruc_dni: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
}

export interface CobranzaDetalleResponse extends CobranzaItemResponse {
  observaciones: string | null;
  incluye_carreta: boolean;
  costo_carreta: number;
  subtotal: number;
  pagos: Array<{
    id_pago: number;
    monto: number;
    metodo_pago: string;
    referencia: string | null;
    created_at: Date;
    usuario: { id_usuario: number; nombre: string } | null;
  }>;
}

export interface PaginatedCobranzaResponse {
  data: CobranzaItemResponse[];
  total: number;
  page: number;
  limit: number;
}

function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class CobranzaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    filters: {
      estado?: string;
      estado_cobranza?: string;
      id_cliente?: number;
      /** Alcance por usuario (null = admin, ve todo). */
      id_usuario?: number;
      fecha_vencimiento_inicio?: Date;
      fecha_vencimiento_fin?: Date;
      solo_vencidas?: boolean;
      q?: string;
    } = {},
  ): Promise<PaginatedCobranzaResponse> {
    const skip = (Math.max(page, 1) - 1) * limit;

    const conditions: Prisma.Sql[] = [
      filters.estado
        ? Prisma.sql`c.estado = ${filters.estado}::"EstadoCotizacion"`
        : Prisma.sql`c.estado IN (
            ${EstadoCotizacion.enviada}::"EstadoCotizacion",
            ${EstadoCotizacion.aprobada}::"EstadoCotizacion",
            ${EstadoCotizacion.parcialmente_pagada}::"EstadoCotizacion"
          )`,
    ];

    // Aislamiento por usuario: sólo el admin ve cobranzas ajenas.
    if (filters.id_usuario !== undefined) {
      conditions.push(Prisma.sql`c.id_usuario = ${filters.id_usuario}`);
    }

    if (filters.id_cliente) {
      conditions.push(Prisma.sql`c.id_cliente = ${filters.id_cliente}`);
    }

    if (filters.solo_vencidas) {
      conditions.push(Prisma.sql`c.fecha_vencimiento < NOW()`);
    } else {
      if (filters.fecha_vencimiento_inicio) {
        conditions.push(Prisma.sql`c.fecha_vencimiento >= ${filters.fecha_vencimiento_inicio}`);
      }
      if (filters.fecha_vencimiento_fin) {
        conditions.push(Prisma.sql`c.fecha_vencimiento <= ${filters.fecha_vencimiento_fin}`);
      }
    }

    // estado_cobranza se calcula en SQL a partir de pagos agregados (antes se filtraba en memoria)
    const estadoCobranza = (filters.estado_cobranza || '').trim().toLowerCase();
    if (estadoCobranza) {
      const pagado = Prisma.sql`COALESCE(p.pagado, 0)`;
      switch (estadoCobranza) {
        case 'pagada':
          conditions.push(Prisma.sql`${pagado} >= c.total`);
          break;
        case 'vencida':
          conditions.push(Prisma.sql`c.total - ${pagado} > 0 AND c.fecha_vencimiento < NOW()`);
          break;
        case 'parcial':
          conditions.push(
            Prisma.sql`${pagado} > 0 AND ${pagado} < c.total AND (c.fecha_vencimiento IS NULL OR c.fecha_vencimiento >= NOW())`,
          );
          break;
        case 'pendiente':
          conditions.push(
            Prisma.sql`${pagado} = 0 AND (c.fecha_vencimiento IS NULL OR c.fecha_vencimiento >= NOW())`,
          );
          break;
        default:
          conditions.push(Prisma.sql`FALSE`);
      }
    }

    if (filters.q && filters.q.trim()) {
      const q = filters.q.trim();
      conditions.push(
        Prisma.sql`(c.numero ILIKE ${'%' + q + '%'} OR cl.nombre ILIKE ${'%' + q + '%'} OR cl.ruc_dni ILIKE ${'%' + q + '%'})`,
      );
    }

    const where = Prisma.join(conditions, ' AND ');

    // Paginación y suma de pagos resueltas en SQL (antes: findMany completo + slice en memoria)
    const baseFrom = Prisma.sql`
      FROM cotizaciones c
      LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
      LEFT JOIN (
        SELECT id_cotizacion, SUM(monto) AS pagado
        FROM cotizacion_pagos
        GROUP BY id_cotizacion
      ) p ON p.id_cotizacion = c.id_cotizacion`;

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`SELECT COUNT(*)::int AS count ${baseFrom} WHERE ${where}`,
      ),
      this.prisma.$queryRaw<RawCobranzaRow[]>(
        Prisma.sql`
          SELECT
            c.id_cotizacion, c.numero, c.id_cliente, c.created_at, c.fecha_vencimiento,
            c.estado, c.total, COALESCE(p.pagado, 0) AS pagado,
            cl.id_cliente AS cliente_id, cl.nombre AS cliente_nombre,
            cl.ruc_dni AS cliente_ruc_dni, cl.email AS cliente_email,
            cl.telefono AS cliente_telefono
          ${baseFrom}
          WHERE ${where}
          ORDER BY c.fecha_vencimiento ASC, c.created_at DESC
          LIMIT ${limit} OFFSET ${skip}`,
      ),
    ]);

    const now = new Date();
    const mapped = rows.map((r) =>
      this.mapItem(
        {
          id_cotizacion: r.id_cotizacion,
          numero: r.numero,
          id_cliente: r.id_cliente,
          created_at: r.created_at,
          fecha_vencimiento: r.fecha_vencimiento,
          estado: r.estado,
          total: Number(r.total),
          cliente:
            r.cliente_id === null
              ? null
              : {
                  id_cliente: r.cliente_id,
                  nombre: r.cliente_nombre ?? '',
                  ruc_dni: r.cliente_ruc_dni,
                  email: r.cliente_email,
                  telefono: r.cliente_telefono,
                },
          pagos: [{ monto: Number(r.pagado) }],
        },
        now,
      ),
    );

    return { data: mapped, total: countRows[0]?.count ?? 0, page, limit };
  }

  async findById(id: number, alcance: number | null = null): Promise<CobranzaDetalleResponse> {
    const cot = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
      include: {
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            ruc_dni: true,
            email: true,
            telefono: true,
          },
        },
        pagos: {
          include: {
            usuario: { select: { id_usuario: true, nombre: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!cot) throw new NotFoundException('Cotización no encontrada');

    verificarAlcance(
      alcance,
      cot.id_usuario,
      'Cotización no encontrada',
      'No tienes permiso sobre esta cotización',
    );

    const now = new Date();
    const base = this.mapItem(
      { ...cot, pagos: cot.pagos.map((p) => ({ monto: p.monto })) },
      now,
    );

    return {
      ...base,
      observaciones: cot.observaciones,
      incluye_carreta: cot.incluye_carreta,
      costo_carreta: toNumber(cot.costo_carreta),
      subtotal: toNumber(cot.subtotal),
      pagos: cot.pagos.map((p) => ({
        id_pago: p.id_pago,
        monto: toNumber(p.monto),
        metodo_pago: p.metodo_pago,
        referencia: p.referencia,
        created_at: p.created_at,
        usuario: p.usuario,
      })),
    };
  }

  async registrarPago(idCotizacion: number, data: PagoInput, idUsuario: number, alcance: number | null = null): Promise<CobranzaDetalleResponse> {
    await registrarPagoSeguro(this.prisma, idCotizacion, data, idUsuario, alcance);
    return this.findById(idCotizacion, alcance);
  }

  private mapItem(
    c: {
      id_cotizacion: number;
      numero: string;
      id_cliente: number | null;
      created_at: Date;
      fecha_vencimiento: Date | null;
      estado: string;
      total: Decimal | number;
      cliente: CobranzaItemResponse['cliente'];
      pagos: Array<{ monto: Decimal | number }>;
    },
    now: Date,
  ): CobranzaItemResponse {
    const total = toNumber(c.total);
    const pagado = (c.pagos || []).reduce((s, p) => s + toNumber(p.monto), 0);
    const saldo = Math.max(total - pagado, 0);
    const vencida =
      !!c.fecha_vencimiento && new Date(c.fecha_vencimiento) < now && saldo > 0;
    const diasAtraso = c.fecha_vencimiento
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - new Date(c.fecha_vencimiento).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    let estadoCobranza: CobranzaItemResponse['estado_cobranza'] = 'pendiente';
    if (saldo <= 0) estadoCobranza = 'pagada';
    else if (vencida) estadoCobranza = 'vencida';
    else if (pagado > 0) estadoCobranza = 'parcial';

    return {
      id_cotizacion: c.id_cotizacion,
      numero: c.numero,
      id_cliente: c.id_cliente,
      created_at: c.created_at,
      fecha_vencimiento: c.fecha_vencimiento,
      estado_cotizacion: c.estado,
      estado_cobranza: estadoCobranza,
      total,
      pagado,
      saldo,
      dias_atraso: diasAtraso,
      vencida,
      cliente: c.cliente,
    };
  }
}

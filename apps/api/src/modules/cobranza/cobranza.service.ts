import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';
import { Decimal } from '@prisma/client/runtime/library';

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

const ESTADOS_COBRANZA = [
  EstadoCotizacion.enviada,
  EstadoCotizacion.aprobada,
  EstadoCotizacion.parcialmente_pagada,
] as const;

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
      fecha_vencimiento_inicio?: Date;
      fecha_vencimiento_fin?: Date;
      solo_vencidas?: boolean;
      q?: string;
    } = {},
  ): Promise<PaginatedCobranzaResponse> {
    const skip = (Math.max(page, 1) - 1) * limit;

    const where: any = {
      estado: { in: [...ESTADOS_COBRANZA] },
      // Incluye aprobadas/saldadas (saldo 0); estado_cobranza se filtra tras mapItem.
    };

    if (filters.id_cliente) where.id_cliente = filters.id_cliente;
    if (filters.estado) where.estado = filters.estado;

    if (filters.solo_vencidas) {
      where.fecha_vencimiento = { lt: new Date() };
    } else if (filters.fecha_vencimiento_inicio || filters.fecha_vencimiento_fin) {
      where.fecha_vencimiento = {};
      if (filters.fecha_vencimiento_inicio) where.fecha_vencimiento.gte = filters.fecha_vencimiento_inicio;
      if (filters.fecha_vencimiento_fin) where.fecha_vencimiento.lte = filters.fecha_vencimiento_fin;
    }

    if (filters.q && filters.q.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { cliente: { nombre: { contains: q, mode: 'insensitive' } } },
        { cliente: { ruc_dni: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows] = await Promise.all([
      this.prisma.cotizacion.findMany({
        where,
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
          pagos: { select: { monto: true } },
        },
        orderBy: [{ fecha_vencimiento: 'asc' }, { created_at: 'desc' }],
      }),
    ]);

    const now = new Date();
    const mapped = rows.map((c) => this.mapItem(c, now));
    const estadoCobranza = (filters.estado_cobranza || '').trim().toLowerCase();
    const open = estadoCobranza
      ? mapped.filter((c) => c.estado_cobranza === estadoCobranza)
      : mapped;

    const total = open.length;
    const data = open.slice(skip, skip + limit);

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<CobranzaDetalleResponse> {
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

  async registrarPago(
    idCotizacion: number,
    data: { monto: number; metodo_pago: string; referencia?: string | null },
    idUsuario: number,
  ): Promise<CobranzaDetalleResponse> {
    const monto = Number(data?.monto);
    if (!monto || monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!data?.metodo_pago) {
      throw new BadRequestException('El metodo_pago es obligatorio');
    }

    const cot = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: { pagos: { select: { monto: true } } },
    });
    if (!cot) throw new NotFoundException('Cotización no encontrada');

    const estadosValidos: string[] = [
      EstadoCotizacion.enviada,
      EstadoCotizacion.aprobada,
      EstadoCotizacion.parcialmente_pagada,
    ];
    if (!estadosValidos.includes(cot.estado)) {
      throw new BadRequestException(
        `No se pueden registrar pagos en una cotización en estado "${cot.estado}". Debe estar enviada o aprobada.`,
      );
    }

    const total = toNumber(cot.total);
    const pagado = cot.pagos.reduce((s, p) => s + toNumber(p.monto), 0);
    const saldo = total - pagado;

    if (monto > saldo + 0.009) {
      throw new BadRequestException(
        `El monto (S/ ${monto.toFixed(2)}) excede el saldo pendiente (S/ ${saldo.toFixed(2)})`,
      );
    }

    const nuevoPagado = pagado + monto;
    const nuevoEstado =
      nuevoPagado >= total - 0.009
        ? EstadoCotizacion.aprobada
        : EstadoCotizacion.parcialmente_pagada;

    await this.prisma.$transaction(async (tx) => {
      await tx.cotizacionPago.create({
        data: {
          id_cotizacion: idCotizacion,
          id_usuario: Number(idUsuario) > 0 ? Number(idUsuario) : null,
          monto,
          metodo_pago: data.metodo_pago as any,
          referencia: data.referencia || null,
        },
      });
      await tx.cotizacion.update({
        where: { id_cotizacion: idCotizacion },
        data: { estado: nuevoEstado as any },
      });
    });

    return this.findById(idCotizacion);
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

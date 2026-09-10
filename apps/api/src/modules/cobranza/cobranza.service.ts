import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstadoCuentaCobrar } from '@goldcontinent/shared/constants/enums';
import { Decimal } from '@prisma/client/runtime/library';

export interface CuentaCobrarResponse {
  id_cuenta: number;
  id_venta: number;
  id_cliente: number;
  montoOriginal: number;
  montoPendiente: number;
  estado: EstadoCuentaCobrar;
  fechaVencimiento: Date;
  diasAtraso: number;
  moraAcumulada: number;
  created_at: Date;
  updated_at: Date;
  venta?: {
    id_venta: number;
    numero_completo: string;
    fecha_emision: Date;
    total: number;
  } | null;
  cliente?: {
    id_cliente: number;
    nombre: string;
    ruc_dni: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
}

export interface PaginatedCobranzaResponse {
  data: CuentaCobrarResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateCobranzaDto {
  estado?: EstadoCuentaCobrar;
  montoPendiente?: number;
  moraAcumulada?: number;
  diasAtraso?: number;
}

function toNumber(value: Decimal | number | null): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function mapEstadoCuenta(estado: string): EstadoCuentaCobrar {
  const validEstados: EstadoCuentaCobrar[] = ['pendiente', 'parcial', 'pagada', 'vencida', 'anulada'];
  return validEstados.includes(estado as EstadoCuentaCobrar) ? estado as EstadoCuentaCobrar : 'pendiente';
}

@Injectable()
export class CobranzaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    filters: {
      estado?: EstadoCuentaCobrar;
      id_cliente?: number;
      fecha_vencimiento_inicio?: Date;
      fecha_vencimiento_fin?: Date;
      solo_vencidas?: boolean;
    } = {},
  ): Promise<PaginatedCobranzaResponse> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.estado) where.estado = filters.estado;
    if (filters.id_cliente) where.id_cliente = filters.id_cliente;
    if (filters.solo_vencidas) {
      where.fechaVencimiento = { lt: new Date() };
      where.estado = { in: ['pendiente', 'parcial', 'vencida'] };
    } else if (filters.fecha_vencimiento_inicio || filters.fecha_vencimiento_fin) {
      where.fechaVencimiento = {};
      if (filters.fecha_vencimiento_inicio) where.fechaVencimiento.gte = filters.fecha_vencimiento_inicio;
      if (filters.fecha_vencimiento_fin) where.fechaVencimiento.lte = filters.fecha_vencimiento_fin;
    }

    const [data, total] = await Promise.all([
      this.prisma.cuentaCobrar.findMany({
        where,
        select: {
          id_cuenta: true,
          id_venta: true,
          id_cliente: true,
          montoOriginal: true,
          montoPendiente: true,
          estado: true,
          fechaVencimiento: true,
          diasAtraso: true,
          moraAcumulada: true,
          created_at: true,
          updated_at: true,
          venta: {
            select: {
              id_venta: true,
              numero_completo: true,
              fecha_emision: true,
              total: true,
            },
          },
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              ruc_dni: true,
              email: true,
              telefono: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { fechaVencimiento: 'asc' },
      }),
      this.prisma.cuentaCobrar.count({ where }),
    ]);

    const mappedData = data.map(item => ({
      ...item,
      estado: mapEstadoCuenta(item.estado),
      montoOriginal: toNumber(item.montoOriginal),
      montoPendiente: toNumber(item.montoPendiente),
      moraAcumulada: toNumber(item.moraAcumulada),
      venta: item.venta ? {
        ...item.venta,
        total: toNumber(item.venta.total) ?? 0,
      } : null,
    }));

    return { data: mappedData, total, page, limit };
  }

  async findById(id: number): Promise<CuentaCobrarResponse | null> {
    const item = await this.prisma.cuentaCobrar.findUnique({
      where: { id_cuenta: id },
      select: {
        id_cuenta: true,
        id_venta: true,
        id_cliente: true,
        montoOriginal: true,
        montoPendiente: true,
        estado: true,
        fechaVencimiento: true,
        diasAtraso: true,
        moraAcumulada: true,
        created_at: true,
        updated_at: true,
        venta: {
          select: {
            id_venta: true,
            numero_completo: true,
            fecha_emision: true,
            total: true,
          },
        },
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            ruc_dni: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    if (!item) return null;

    return {
      ...item,
      estado: mapEstadoCuenta(item.estado),
      montoOriginal: toNumber(item.montoOriginal),
      montoPendiente: toNumber(item.montoPendiente),
      moraAcumulada: toNumber(item.moraAcumulada),
      venta: item.venta ? {
        ...item.venta,
        total: toNumber(item.venta.total) ?? 0,
      } : null,
    };
  }

  async update(id: number, data: UpdateCobranzaDto): Promise<CuentaCobrarResponse> {
    const item = await this.prisma.cuentaCobrar.update({
      where: { id_cuenta: id },
      data: {
        ...data,
        estado: data.estado as any,
      },
      select: {
        id_cuenta: true,
        id_venta: true,
        id_cliente: true,
        montoOriginal: true,
        montoPendiente: true,
        estado: true,
        fechaVencimiento: true,
        diasAtraso: true,
        moraAcumulada: true,
        created_at: true,
        updated_at: true,
        venta: {
          select: {
            id_venta: true,
            numero_completo: true,
            fecha_emision: true,
            total: true,
          },
        },
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            ruc_dni: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    return {
      ...item,
      estado: mapEstadoCuenta(item.estado),
      montoOriginal: toNumber(item.montoOriginal),
      montoPendiente: toNumber(item.montoPendiente),
      moraAcumulada: toNumber(item.moraAcumulada),
      venta: item.venta ? {
        ...item.venta,
        total: toNumber(item.venta.total) ?? 0,
      } : null,
    };
  }
}
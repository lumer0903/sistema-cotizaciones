import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface HistorialPrecioResponse {
  id_historial: number;
  id_producto: number;
  id_usuario: number | null;
  campo_modificado: string;
  valor_anterior: number;
  valor_nuevo: number;
  fecha_cambio: Date;
  producto?: {
    id_producto: number;
    codigo: string;
    descripcion: string;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
  } | null;
}

export interface PaginatedHistorialPreciosResponse {
  data: HistorialPrecioResponse[];
  total: number;
  page: number;
  limit: number;
}

function toNumber(value: Decimal | number | null): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class HistorialPreciosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    filters: {
      id_producto?: number;
      id_usuario?: number;
      campo_modificado?: string;
      fecha_inicio?: Date;
      fecha_fin?: Date;
    } = {},
  ): Promise<PaginatedHistorialPreciosResponse> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.id_producto) where.id_producto = filters.id_producto;
    if (filters.id_usuario) where.id_usuario = filters.id_usuario;
    if (filters.campo_modificado) where.campo_modificado = filters.campo_modificado;
    if (filters.fecha_inicio || filters.fecha_fin) {
      where.fecha_cambio = {};
      if (filters.fecha_inicio) where.fecha_cambio.gte = filters.fecha_inicio;
      if (filters.fecha_fin) where.fecha_cambio.lte = filters.fecha_fin;
    }

    const [data, total] = await Promise.all([
      this.prisma.historialPrecios.findMany({
        where,
        select: {
          id_historial: true,
          id_producto: true,
          id_usuario: true,
          campo_modificado: true,
          valor_anterior: true,
          valor_nuevo: true,
          fecha_cambio: true,
          producto: {
            select: {
              id_producto: true,
              codigo: true,
              descripcion: true,
            },
          },
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { fecha_cambio: 'desc' },
      }),
      this.prisma.historialPrecios.count({ where }),
    ]);

    const mappedData = data.map(item => ({
      ...item,
      valor_anterior: toNumber(item.valor_anterior),
      valor_nuevo: toNumber(item.valor_nuevo),
    }));

    return { data: mappedData, total, page, limit };
  }

  async findById(id: number): Promise<HistorialPrecioResponse | null> {
    const item = await this.prisma.historialPrecios.findUnique({
      where: { id_historial: id },
      select: {
        id_historial: true,
        id_producto: true,
        id_usuario: true,
        campo_modificado: true,
        valor_anterior: true,
        valor_nuevo: true,
        fecha_cambio: true,
        producto: {
          select: {
            id_producto: true,
            codigo: true,
            descripcion: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
          },
        },
      },
    });

    if (!item) return null;

    return {
      ...item,
      valor_anterior: toNumber(item.valor_anterior),
      valor_nuevo: toNumber(item.valor_nuevo),
    };
  }
}
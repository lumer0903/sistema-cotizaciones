import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { IQuoteRepository, PaginatedQuotesResponse, QuoteFilters } from '../../domain/repositories/quote.repository.interface';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

@Injectable()
export class PrismaQuoteRepository implements IQuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(quote: QuoteEntity): Promise<QuoteEntity> {
    try {
      const { detalle, ...quoteData } = quote;

      const saved = await this.prisma.cotizacion.create({
        data: {
          numero: quoteData.numero,
          id_cliente: quoteData.id_cliente,
          id_usuario: quoteData.id_usuario,
          tipo_precio: quoteData.tipo_precio,
          subtotal: quoteData.subtotal,
          igv: quoteData.igv,
          total: quoteData.total,
          observaciones: quoteData.observaciones,
          incluye_carreta: quoteData.incluye_carreta,
          costo_carreta: quoteData.costo_carreta,
          fecha_vencimiento: quoteData.fecha_vencimiento,
          detalle: {
            create: detalle.map(item => ({
              id_producto: item.id_producto,
              tipo_venta: item.tipo_venta,
              cantidad: item.cantidad,
              color_notas: item.color_notas,
              precio_unitario: item.precio_unitario,
              subtotal: item.subtotal,
              es_sugerido_ia: item.es_sugerido_ia ?? false,
            })),
          },
        },
        include: {
          detalle: {
            include: {
              producto: {
                select: { id_producto: true, codigo: true, descripcion: true },
              },
            },
          },
          cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
          usuario: { select: { id_usuario: true, nombre: true } },
        },
      });

      return this.mapToEntity(saved);
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new NotFoundException('Cliente, usuario o producto no encontrado');
      }
      throw error;
    }
  }

  async findById(id: number): Promise<QuoteEntity | null> {
    const quote = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
      include: {
        detalle: {
          include: {
            producto: {
              select: { id_producto: true, codigo: true, descripcion: true },
            },
          },
        },
        cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
        usuario: { select: { id_usuario: true, nombre: true } },
      },
    });

    return quote ? this.mapToEntity(quote) : null;
  }

  async findAll(): Promise<QuoteEntity[]> {
    const quotes = await this.prisma.cotizacion.findMany({
      include: {
        detalle: {
          include: {
            producto: {
              select: { id_producto: true, codigo: true, descripcion: true },
            },
          },
        },
        cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
        usuario: { select: { id_usuario: true, nombre: true } },
      },
    });

    return quotes.map(q => this.mapToEntity(q));
  }

  async findPaginated(page = 1, limit = 50, filters: QuoteFilters = {}): Promise<PaginatedQuotesResponse> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.estado) where.estado = filters.estado as EstadoCotizacion;
    if (filters.id_cliente) where.id_cliente = filters.id_cliente;
    if (filters.id_usuario) where.id_usuario = filters.id_usuario;
    if (filters.fecha_inicio || filters.fecha_fin) {
      where.created_at = {};
      if (filters.fecha_inicio) where.created_at.gte = filters.fecha_inicio;
      if (filters.fecha_fin) where.created_at.lte = filters.fecha_fin;
    }

    const [data, total] = await Promise.all([
      this.prisma.cotizacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          detalle: {
            include: {
              producto: {
                select: { id_producto: true, codigo: true, descripcion: true },
              },
            },
          },
          cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
          usuario: { select: { id_usuario: true, nombre: true } },
        },
      }),
      this.prisma.cotizacion.count({ where }),
    ]);

    return { data: data.map(q => this.mapToEntity(q)), total, page, limit };
  }

  async updateState(id: number, estado: string, tiempo_fin?: Date): Promise<QuoteEntity | null> {
    try {
      const updated = await this.prisma.cotizacion.update({
        where: { id_cotizacion: id },
        data: {
          estado: estado as EstadoCotizacion,
          tiempo_fin: tiempo_fin ?? undefined,
        },
        include: {
          detalle: {
            include: {
              producto: {
                select: { id_producto: true, codigo: true, descripcion: true },
              },
            },
          },
          cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
          usuario: { select: { id_usuario: true, nombre: true } },
        },
      });

      return updated ? this.mapToEntity(updated) : null;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Cotización no encontrada');
      }
      throw error;
    }
  }

  private mapToEntity(quote: any): QuoteEntity {
    const entity = new QuoteEntity({
      id_cotizacion: quote.id_cotizacion,
      numero: quote.numero,
      id_cliente: quote.id_cliente,
      id_usuario: quote.id_usuario,
      tipo_precio: quote.tipo_precio,
      subtotal: quote.subtotal?.toNumber?.() ?? Number(quote.subtotal) ?? 0,
      igv: quote.igv?.toNumber?.() ?? Number(quote.igv) ?? 0,
      total: quote.total?.toNumber?.() ?? Number(quote.total) ?? 0,
      observaciones: quote.observaciones,
      incluye_carreta: quote.incluye_carreta,
      costo_carreta: quote.costo_carreta?.toNumber?.() ?? Number(quote.costo_carreta) ?? 0,
      estado: quote.estado,
      tiempo_inicio: quote.tiempo_inicio,
      tiempo_fin: quote.tiempo_fin,
      fecha_vencimiento: quote.fecha_vencimiento,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      cliente: quote.cliente ?? null,
      usuario: quote.usuario ?? null,
    });

    entity.detalle = (quote.detalle ?? []).map((d: any) => ({
      id_detalle: d.id_detalle,
      id_producto: d.id_producto,
      tipo_venta: d.tipo_venta,
      cantidad: d.cantidad,
      color_notas: d.color_notas,
      precio_unitario: d.precio_unitario?.toNumber?.() ?? Number(d.precio_unitario) ?? 0,
      subtotal: d.subtotal?.toNumber?.() ?? Number(d.subtotal) ?? 0,
      es_sugerido_ia: d.es_sugerido_ia,
      producto: d.producto ?? null,
    }));

    return entity;
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { IQuoteRepository, PaginatedQuotesResponse, QuoteFilters } from '../../domain/repositories/quote.repository.interface';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

@Injectable()
export class PrismaQuoteRepository implements IQuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(quote: QuoteEntity): Promise<QuoteEntity> {
    const saved = await this.prisma.cotizacion.create({
      data: {
        numero: quote.numero,
        id_cliente: quote.id_cliente,
        id_usuario: quote.id_usuario,
        subtotal: quote.subtotal,
        igv: quote.igv,
        total: quote.total,
      },
    });
    return saved as unknown as QuoteEntity;
  }

  async findById(id: number): Promise<QuoteEntity | null> {
    const quote = await this.prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
    });
    return quote as unknown as QuoteEntity | null;
  }

  async findAll(): Promise<QuoteEntity[]> {
    const quotes = await this.prisma.cotizacion.findMany();
    return quotes as unknown as QuoteEntity[];
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
      }),
      this.prisma.cotizacion.count({ where }),
    ]);

    return { data: data as unknown as QuoteEntity[], total, page, limit };
  }
}

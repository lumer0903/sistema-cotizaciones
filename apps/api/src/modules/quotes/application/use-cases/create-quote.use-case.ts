import { Injectable, Inject, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IQuoteRepository } from '../../domain/repositories/quote.repository.interface';
import { CreateQuoteDto } from '../dtos/create-quote.dto';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';

@Injectable()
export class CreateQuoteUseCase {
  private readonly logger = new Logger(CreateQuoteUseCase.name);

  constructor(
    @Inject(IQuoteRepository)
    private readonly quoteRepository: IQuoteRepository,
    @InjectQueue('quote-processing') private quoteQueue: Queue,
  ) {}

  async execute(dto: CreateQuoteDto & { id_usuario?: number }): Promise<QuoteEntity> {
    try {
      if (!dto.detalle || dto.detalle.length === 0) {
        throw new BadRequestException('La cotización debe tener al menos un item');
      }

      // Calcular subtotal de items
      const subtotalItems = dto.detalle.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
      
      // Costo carreta
      const costoCarreta = dto.incluye_carreta ? (dto.costo_carreta ?? 15) : 0;
      
      // Totales
      const subtotal = subtotalItems;
      const igv = subtotal * 0.18;
      const total = subtotal + igv + costoCarreta;

      const quote = new QuoteEntity({
        numero: `COT-${Date.now()}`,
        id_cliente: dto.id_cliente,
        id_usuario: dto.id_usuario,
        tipo_precio: dto.tipo_precio ?? TipoPrecio.normal,
        subtotal,
        igv,
        total,
        observaciones: dto.observaciones,
        incluye_carreta: dto.incluye_carreta ?? true,
        costo_carreta: costoCarreta,
        estado: 'borrador',
        detalle: dto.detalle.map(item => ({
          ...item,
          subtotal: item.precio_unitario * item.cantidad,
          es_sugerido_ia: item.es_sugerido_ia ?? false,
        })),
      });

      const savedQuote = await this.quoteRepository.save(quote);

      // Dispatch job to BullMQ for PDF generation with timeout
      try {
        const jobOpts = {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 1000 },
        };
        await Promise.race([
          this.quoteQueue.add('generate-pdf', { quoteId: savedQuote.id_cotizacion }, jobOpts),
          this.createTimeoutPromise(5000, 'PDF generation queue timeout'),
        ]);
      } catch (queueError: unknown) {
        const err = queueError as Error;
        this.logger.warn(`Failed to queue PDF generation for quote ${savedQuote.id_cotizacion}: ${err.message}`);
        // Don't fail the request if queue is unavailable
      }

      return savedQuote;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error creating quote: ${err.message}`, err.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la cotización');
    }
  }

  private createTimeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error(message)), ms)
    );
  }
}
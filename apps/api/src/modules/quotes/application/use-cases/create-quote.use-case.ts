import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IQuoteRepository } from '../../domain/repositories/quote.repository.interface';
import { CreateQuoteDto } from '../dtos/create-quote.dto';
import { QuoteEntity } from '../../domain/entities/quote.entity';

@Injectable()
export class CreateQuoteUseCase {
  constructor(
    @Inject(IQuoteRepository)
    private readonly quoteRepository: IQuoteRepository,
    @InjectQueue('quote-processing') private quoteQueue: Queue,
  ) {}

  async execute(dto: CreateQuoteDto): Promise<QuoteEntity> {
    const quote = new QuoteEntity({
      numero: `COT-${Date.now()}`,
      id_cliente: dto.id_cliente,
      subtotal: dto.subtotal,
      igv: dto.igv,
      total: dto.total,
      estado: 'borrador',
    });

    const savedQuote = await this.quoteRepository.save(quote);

    // Dispatch job to BullMQ
    await this.quoteQueue.add('generate-pdf', {
      quoteId: savedQuote.id_cotizacion,
    });

    return savedQuote;
  }
}

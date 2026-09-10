import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QuotesController } from '../adapters/quotes.controller';
import { CreateQuoteUseCase } from '../application/use-cases/create-quote.use-case';
import { IQuoteRepository } from '../domain/repositories/quote.repository.interface';
import { PrismaQuoteRepository } from './repositories/prisma-quote.repository';
import { QuotePdfProcessor } from './processors/quote-pdf.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'quote-processing',
    }),
  ],
  controllers: [QuotesController],
  providers: [
    CreateQuoteUseCase,
    QuotePdfProcessor,
    {
      provide: IQuoteRepository,
      useClass: PrismaQuoteRepository,
    },
  ],
})
export class QuotesModule {}

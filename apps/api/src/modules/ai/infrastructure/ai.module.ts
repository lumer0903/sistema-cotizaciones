import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from '../adapters/ai.controller';
import { GetAiQuoteSuggestionsUseCase } from '../application/use-cases/get-ai-quote-suggestions.use-case';
import { IAiService } from '../domain/contracts/ai-service.interface';
import { HttpAiService } from './clients/http-ai.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [
    GetAiQuoteSuggestionsUseCase,
    {
      provide: IAiService,
      useClass: HttpAiService,
    },
  ],
})
export class AiModule {}

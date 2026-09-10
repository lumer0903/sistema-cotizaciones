import { Injectable, Inject } from '@nestjs/common';
import { IAiService } from '../../domain/contracts/ai-service.interface';
import { AiSuggestionRequestDto } from '../dtos/ai-suggestion-request.dto';

@Injectable()
export class GetAiQuoteSuggestionsUseCase {
  constructor(
    @Inject(IAiService)
    private readonly aiService: IAiService,
  ) {}

  async execute(dto: AiSuggestionRequestDto) {
    return this.aiService.generateQuoteSuggestions(dto);
  }
}

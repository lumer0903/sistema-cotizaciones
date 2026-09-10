import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { GetAiQuoteSuggestionsUseCase } from '../application/use-cases/get-ai-quote-suggestions.use-case';
import { AiSuggestionRequestDto } from '../application/dtos/ai-suggestion-request.dto';

@ApiTags('AI Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly getAiSuggestionsUseCase: GetAiQuoteSuggestionsUseCase) {}

  @Post('suggest-quote')
  @ApiOperation({ summary: 'Get AI suggestions for a quote based on a prompt' })
  async suggestQuote(@Body() dto: AiSuggestionRequestDto) {
    return this.getAiSuggestionsUseCase.execute(dto);
  }
}

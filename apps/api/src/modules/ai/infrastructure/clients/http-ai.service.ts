import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { IAiService } from '../../domain/contracts/ai-service.interface';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class HttpAiService implements IAiService {
  private readonly logger = new Logger(HttpAiService.name);
  private readonly aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  async generateQuoteSuggestions(data: any): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.aiUrl}/suggest`, data)
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error communicating with AI Service at ${this.aiUrl}`, error.message);
      throw new HttpException(
        'AI Service is currently unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}

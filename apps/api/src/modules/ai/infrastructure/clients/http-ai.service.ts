import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { IAiService, AiRecommendationResponse, AiRecommendationItem } from '../../domain/contracts/ai-service.interface';
import { firstValueFrom, timeout, catchError, TimeoutError } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class HttpAiService implements IAiService {
  private readonly logger = new Logger(HttpAiService.name);
  private readonly aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  private readonly useMock = process.env.AI_USE_MOCK === 'true' || !process.env.AI_SERVICE_URL;
  private readonly httpTimeout = parseInt(process.env.AI_HTTP_TIMEOUT || '5000', 10);

  constructor(private readonly httpService: HttpService) {}

  private getMockRecommendations(id_producto: number): AiRecommendationResponse {
    // Mock recommendations for development/testing
    const baseItems: AiRecommendationItem[] = [
      { id: id_producto + 1, codigo: `PROD-${id_producto + 1}`, descripcion: 'Producto Similar 1', precio: 100.00, stock: 50, similarityScore: 0.92, categoria: 'Similar', margen: 25 },
      { id: id_producto + 2, codigo: `PROD-${id_producto + 2}`, descripcion: 'Producto Similar 2', precio: 120.00, stock: 30, similarityScore: 0.87, categoria: 'Similar', margen: 30 },
      { id: id_producto + 3, codigo: `PROD-${id_producto + 3}`, descripcion: 'Mejor Opción Premium', precio: 200.00, stock: 20, similarityScore: 0.75, categoria: 'Premium', margen: 45 },
      { id: id_producto + 4, codigo: `PROD-${id_producto + 4}`, descripcion: 'Opción Económica', precio: 80.00, stock: 100, similarityScore: 0.65, categoria: 'Económico', margen: 15 },
      { id: id_producto + 5, codigo: `PROD-${id_producto + 5}`, descripcion: 'Equilibrio Calidad-Precio', precio: 150.00, stock: 40, similarityScore: 0.82, categoria: 'Balanceado', margen: 35 },
    ];

    return {
      similar: baseItems.slice(0, 2),
      upsell: baseItems.slice(2, 4),
      equilibrio: baseItems.slice(4, 5),
    };
  }

  private async callAIService<T>(endpoint: string, data: any): Promise<T> {
    if (this.useMock) {
      this.logger.log(`Using mock AI service for ${endpoint}`);
      return this.getMockRecommendations(data.id_producto || 1) as T;
    }

    try {
      const axiosResponse = await firstValueFrom(
        this.httpService.post<AiRecommendationResponse>(`${this.aiUrl}${endpoint}`, data).pipe(
          timeout(this.httpTimeout),
          catchError((error: AxiosError) => {
            this.logger.error(`Error communicating with AI Service at ${this.aiUrl}${endpoint}: ${error.message}`);
            if (process.env.NODE_ENV !== 'production') {
              this.logger.warn('Falling back to mock recommendations');
              return [this.getMockRecommendations(data.id_producto || 1)];
            }
            throw new HttpException(
              'AI Service is currently unavailable.',
              HttpStatus.SERVICE_UNAVAILABLE
            );
          })
        )
      );
      // Handle both possible return types from firstValueFrom
      const responseData = 'data' in axiosResponse ? axiosResponse.data : axiosResponse;
      return responseData as T;
    } catch (error: any) {
      if (error instanceof TimeoutError) {
        this.logger.error(`AI Service timeout after ${this.httpTimeout}ms`);
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn('Falling back to mock recommendations due to timeout');
          return this.getMockRecommendations(data.id_producto || 1) as T;
        }
        throw new HttpException(
          'AI Service timeout.',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }
      throw error;
    }
  }

  async generateQuoteSuggestions(data: any): Promise<any> {
    return this.callAIService('/suggest', data);
  }

  async recommendItem(data: {
    id_producto: number;
    id_cliente?: number;
    id_almacen?: number;
  }): Promise<AiRecommendationResponse> {
    return this.callAIService('/suggest', data);
  }
}
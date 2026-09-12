import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IAiService, AiRecommendationResponse, AiRecommendationItem } from '../../ai/domain/contracts/ai-service.interface';
import { RecomendarItemDto } from './dto/recomendar-item.dto';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';

export interface RecomendacionItemResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  precio: number;
  stock: number;
  similarityScore: number;
  categoria?: string;
  margen?: number;
  es_sugerido_ia: boolean;
}

export interface RecomendarItemResponse {
  similar: RecomendacionItemResponse[];
  upsell: RecomendacionItemResponse[];
  equilibrio: RecomendacionItemResponse[];
}

@Injectable()
export class RecomendacionesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IAiService) private readonly aiService: IAiService,
  ) {}

  async recomendarItem(
    dto: RecomendarItemDto,
    id_usuario: number,
  ): Promise<RecomendarItemResponse> {
    try {
      // 1. Obtener recomendaciones del servicio de IA
      const aiResponse = await this.aiService.recommendItem({
        id_producto: dto.id_producto_base,
        id_cliente: dto.id_cliente,
        id_almacen: dto.id_almacen,
      });

      // 2. Enriquecer con precios finales según tipo de cliente y stock real por almacén
      const enriched = await this.enrichRecommendations(aiResponse, dto.id_cliente, dto.id_almacen);

      // 3. Registrar auditoría de interacción IA
      await this.logIaInteraccion(id_usuario, dto.id_producto_base, dto, enriched);

      return enriched;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new HttpException('Producto base no encontrado', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  private async enrichRecommendations(
    aiResponse: AiRecommendationResponse,
    id_cliente?: number,
    id_almacen?: number,
  ): Promise<RecomendarItemResponse> {
    // Determinar tipo de precio
    let tipoPrecio: TipoPrecio = 'normal';
    if (id_cliente) {
      try {
        const cliente = await this.prisma.cliente.findUnique({
          where: { id_cliente },
          select: { tipo: true },
        });
        if (cliente) tipoPrecio = cliente.tipo;
      } catch (error: any) {
        if (error.code === 'P2025') {
          // Cliente no encontrado, usar tipo normal
        }
      }
    }

    const enrichCategory = async (items: AiRecommendationItem[]): Promise<RecomendacionItemResponse[]> => {
      const result: RecomendacionItemResponse[] = [];
      for (const item of items) {
        // Verificar stock real en almacén específico si se proporciona
        let stockReal = item.stock;
        if (id_almacen) {
          try {
            const stock = await this.prisma.stockActual.findUnique({
              where: { id_producto_id_almacen: { id_producto: item.id, id_almacen } },
              select: { cantidad: true },
            });
            stockReal = stock?.cantidad ?? 0;
          } catch (error: any) {
            if (error.code !== 'P2025') throw error;
            stockReal = 0;
          }
        }

        // Obtener precio final según tipo de cliente
        let precios: { precio_unidad_normal: any; precio_unidad_dist: any } | null = null;
        try {
          precios = await this.prisma.preciosActuales.findUnique({
            where: { id_producto: item.id },
            select: {
              precio_unidad_normal: true,
              precio_unidad_dist: true,
            },
          });
        } catch (error: any) {
          if (error.code !== 'P2025') throw error;
        }

        const precioFinal = tipoPrecio === 'distribuidor'
          ? precios?.precio_unidad_dist?.toNumber() ?? item.precio
          : precios?.precio_unidad_normal?.toNumber() ?? item.precio;

        result.push({
          id_producto: item.id,
          codigo: item.codigo,
          descripcion: item.descripcion,
          precio: precioFinal,
          stock: stockReal,
          similarityScore: item.similarityScore,
          categoria: item.categoria,
          margen: item.margen,
          es_sugerido_ia: true,
        });
      }
      return result;
    };

    return {
      similar: await enrichCategory(aiResponse.similar),
      upsell: await enrichCategory(aiResponse.upsell),
      equilibrio: await enrichCategory(aiResponse.equilibrio),
    };
  }

  private async logIaInteraccion(
    id_usuario: number,
    id_producto_base: number,
    request: RecomendarItemDto,
    response: RecomendarItemResponse,
  ): Promise<void> {
    try {
      const prompt = `Recomendación por ítem: producto_base=${id_producto_base}, cliente=${request.id_cliente ?? 'N/A'}, almacen=${request.id_almacen ?? 'N/A'}`;
      const respuesta = JSON.stringify({
        similar: response.similar.map(r => ({ id: r.id_producto, score: r.similarityScore })),
        upsell: response.upsell.map(r => ({ id: r.id_producto, score: r.similarityScore })),
        equilibrio: response.equilibrio.map(r => ({ id: r.id_producto, score: r.similarityScore })),
      });

      await this.prisma.iaInteracciones.create({
        data: {
          id_producto: id_producto_base,
          prompt,
          respuesta,
        },
      });
    } catch (error) {
      // No fallar la request principal si falla la auditoría
      console.error('Error logging IA interaction:', error);
    }
  }
}
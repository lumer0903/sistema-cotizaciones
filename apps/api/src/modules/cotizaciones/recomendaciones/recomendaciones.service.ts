import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
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
  almacen?: string | null;
  ubicacion?: string | null;
  unidades_por_caja?: number | null;
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
  ) { }

  async recomendarItem(
    dto: RecomendarItemDto,
    id_usuario: number,
  ): Promise<RecomendarItemResponse> {
    // 1. Validar existencia del producto base
    const productoBase = await this.prisma.producto.findUnique({
      where: { id_producto: dto.id_producto_base, deleted_at: null },
      select: { id_producto: true },
    });

    if (!productoBase) {
      throw new NotFoundException(`Producto base con ID ${dto.id_producto_base} no encontrado`);
    }

    try {
      // 2. Obtener recomendaciones del servicio de IA
      const aiResponse = await this.aiService.recommendItem({
        id_producto: dto.id_producto_base,
        id_cliente: dto.id_cliente,
        id_almacen: dto.id_almacen,
      });

      // 3. Enriquecer con precios y stock en paralelo
      const enriched = await this.enrichRecommendations(aiResponse, dto.id_cliente, dto.id_almacen, dto.tipo_precio);

      // 4. Auditoría asíncrona
      this.logIaInteraccion(id_usuario, dto.id_producto_base, dto, enriched);

      return enriched;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al generar recomendaciones IA: ${error.message}`);
    }
  }

  private async enrichRecommendations(
    aiResponse: AiRecommendationResponse,
    id_cliente?: number,
    id_almacen?: number,
    tipoPrecioOverride?: TipoPrecio,
  ): Promise<RecomendarItemResponse> {
    let tipoPrecio: TipoPrecio = tipoPrecioOverride ?? 'normal';

    if (!tipoPrecioOverride && id_cliente) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id_cliente, deleted_at: null },
        select: { tipo: true },
      });
      if (cliente) tipoPrecio = cliente.tipo as TipoPrecio;
    }

    // Cargar productos reales de la BD (una sola consulta) para anclar código/descripción/datos
    const idsSolicitados = [...(aiResponse.similar ?? []), ...(aiResponse.upsell ?? []), ...(aiResponse.equilibrio ?? [])]
      .map((item) => item.id)
      .filter((id) => Number.isInteger(id) && id > 0);

    const productosReales = idsSolicitados.length
      ? await this.prisma.producto.findMany({
          where: { id_producto: { in: idsSolicitados }, deleted_at: null },
          select: {
            id_producto: true,
            codigo: true,
            descripcion: true,
            unidades_por_caja: true,
            categoria: { select: { nombre_categoria: true } },
          },
        })
      : [];

    const productosById = new Map(productosReales.map((p) => [p.id_producto, p]));

    const enrichCategory = async (items: AiRecommendationItem[] = []): Promise<RecomendacionItemResponse[]> => {
      // Solo se recomiendan productos que existan realmente en la BD
      const itemsValidos = items.filter((item) => productosById.has(item.id));
      if (!itemsValidos.length) return [];

      return Promise.all(
        itemsValidos.map(async (item) => {
          const productoReal = productosById.get(item.id)!;

          // Consultas paralelas por cada ítem recomendado
          const [stockRow, precios] = await Promise.all([
            id_almacen
              ? this.prisma.stockActual.findUnique({
                where: { id_producto_id_almacen: { id_producto: item.id, id_almacen } },
                select: {
                  cantidad: true,
                  almacen: { select: { nombre: true, ubicacion: true } },
                },
              })
              : this.prisma.stockActual.findFirst({
                where: { id_producto: item.id, cantidad: { gt: 0 } },
                orderBy: { cantidad: 'desc' },
                select: {
                  cantidad: true,
                  almacen: { select: { nombre: true, ubicacion: true } },
                },
              }),
            this.prisma.preciosActuales.findUnique({
              where: { id_producto: item.id },
              select: {
                precio_unidad_normal: true,
                precio_unidad_dist: true,
              },
            }),
          ]);

          const stockReal = stockRow?.cantidad ?? item.stock ?? 0;
          const precioNormal = precios?.precio_unidad_normal ? Number(precios.precio_unidad_normal) : item.precio;
          const precioDist = precios?.precio_unidad_dist ? Number(precios.precio_unidad_dist) : item.precio;

          const precioFinal = tipoPrecio === 'distribuidor' ? precioDist : precioNormal;

          return {
            id_producto: item.id,
            codigo: productoReal.codigo,
            descripcion: productoReal.descripcion,
            precio: precioFinal,
            stock: stockReal,
            similarityScore: item.similarityScore,
            categoria: productoReal.categoria?.nombre_categoria ?? item.categoria,
            margen: item.margen,
            es_sugerido_ia: true,
            almacen: stockRow?.almacen?.nombre ?? null,
            ubicacion: stockRow?.almacen?.ubicacion ?? null,
            unidades_por_caja: productoReal.unidades_por_caja ?? null,
          };
        }),
      );
    };

    const [similar, upsell, equilibrio] = await Promise.all([
      enrichCategory(aiResponse.similar),
      enrichCategory(aiResponse.upsell),
      enrichCategory(aiResponse.equilibrio),
    ]);

    return { similar, upsell, equilibrio };
  }

  private async logIaInteraccion(
    id_usuario: number,
    id_producto_base: number,
    request: RecomendarItemDto,
    response: RecomendarItemResponse,
  ): Promise<void> {
    try {
      const prompt = `Recomendación por ítem: producto_base=${id_producto_base}, cliente=${request.id_cliente ?? 'N/A'}, almacen=${request.id_almacen ?? 'N/A'}, tipo_precio=${request.tipo_precio ?? 'auto'}`;
      const respuesta = JSON.stringify({
        similar: response.similar.map((r) => ({ id: r.id_producto, score: r.similarityScore })),
        upsell: response.upsell.map((r) => ({ id: r.id_producto, score: r.similarityScore })),
        equilibrio: response.equilibrio.map((r) => ({ id: r.id_producto, score: r.similarityScore })),
      });

      await this.prisma.iaInteracciones.create({
        data: {
          id_producto: id_producto_base,
          prompt,
          respuesta,
        },
      });
    } catch (error) {
      console.error('Error al registrar interacción IA:', error);
    }
  }
}
import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IAiService, AiRecommendationResponse, AiRecommendationItem } from '../../ai/domain/contracts/ai-service.interface';
import { RecomendarItemDto } from './dto/recomendar-item.dto';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';
import { resolverEsquemaPrecio } from '@goldcontinent/shared/constants/descripcion';

export interface RecomendacionItemResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  precio: number;
  stock: number;
  similarityScore: number;
  categoria?: string;
  margen?: number | null;
  es_sugerido_ia: boolean;
  almacen?: string | null;
  ubicacion?: string | null;
  unidades_por_caja?: number | null;
  imagen_url?: string | null;
}

export interface RecomendarItemResponse {
  similar: RecomendacionItemResponse[];
  upsell: RecomendacionItemResponse[];
  equilibrio: RecomendacionItemResponse[];
  /** ID de la fila creada en ia_interacciones (auditoría de la recomendación). */
  id_interaccion?: number | null;
}

/** Valor fijo de ia_interacciones.tipo_sugerencia para recomendaciones por ítem. */
export const TIPO_SUGERENCIA_IA = 'SIMILITUD_COSENO_TFIDF';

export interface AccionIaRequest {
  id_interaccion: number;
  accion: 'ACEPTADO' | 'RECHAZADO';
  id_cotizacion?: number;
  id_producto_sugerido?: number;
}

export interface AccionIaResponse {
  id_interaccion: number;
  accion_usuario: string;
  id_cotizacion: number | null;
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

    // Esquema de precio exacto (1 de los 6) según tipo de precio del cliente/
    // cotización + tipo de venta del ítem base. Fallback: precio_unidad_normal.
    const esquemaPrecio = resolverEsquemaPrecio(dto.tipo_precio, dto.tipo_venta);

    try {
      // 2. Obtener recomendaciones del servicio de IA (FastAPI exige el esquema de 6)
      const aiResponse = await this.aiService.recommendItem({
        id_producto: dto.id_producto_base,
        id_cliente: dto.id_cliente,
        id_almacen: dto.id_almacen,
        tipo_precio: esquemaPrecio,
      });

      // 3. Enriquecer con precios y stock en paralelo (mismo esquema de precio)
      const enriched = await this.enrichRecommendations(
        aiResponse,
        dto.id_cliente,
        dto.id_almacen,
        dto.tipo_precio,
        dto.tipo_venta,
      );

      // 4. Auditoría: registrar interacción IA (id_usuario, tipo_sugerencia, id_cotizacion)
      const idInteraccion = await this.logIaInteraccion(id_usuario, dto.id_producto_base, dto, enriched);

      return { ...enriched, id_interaccion: idInteraccion };
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
    tipoVenta?: string,
  ): Promise<RecomendarItemResponse> {
    let tipoPrecio: TipoPrecio = tipoPrecioOverride ?? 'normal';

    if (!tipoPrecioOverride && id_cliente) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id_cliente, deleted_at: null },
        select: { tipo: true },
      });
      if (cliente) tipoPrecio = cliente.tipo as TipoPrecio;
    }

    // Mismo esquema enviado a la IA: el precio mostrado en el panel debe ser el
    // que eligió el usuario (tienda/distribuidor x unidad/docena/mayor).
    const esquemaPrecio = resolverEsquemaPrecio(tipoPrecio, tipoVenta);

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
            foto_url: true,
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
                precio_docena_normal: true,
                precio_mayor_normal: true,
                precio_unidad_dist: true,
                precio_docena_dist: true,
                precio_mayor_dist: true,
              },
            }),
          ]);

          const stockReal = stockRow?.cantidad ?? item.stock ?? 0;
          const precioEsquema = precios
            ? Number((precios as Record<string, any>)[esquemaPrecio] ?? 0)
            : 0;
          const precioFinal = precioEsquema > 0 ? precioEsquema : item.precio;

          return {
            id_producto: item.id,
            codigo: productoReal.codigo,
            descripcion: productoReal.descripcion,
            imagen_url: productoReal.foto_url ?? null,
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
  ): Promise<number | null> {
    try {
      const prompt = `Recomendación por ítem: producto_base=${id_producto_base}, cliente=${request.id_cliente ?? 'N/A'}, almacen=${request.id_almacen ?? 'N/A'}, tipo_precio=${request.tipo_precio ?? 'auto'}`;
      const respuesta = JSON.stringify({
        similar: response.similar.map((r) => ({ id: r.id_producto, score: r.similarityScore })),
        upsell: response.upsell.map((r) => ({ id: r.id_producto, score: r.similarityScore })),
        equilibrio: response.equilibrio.map((r) => ({ id: r.id_producto, score: r.similarityScore })),
      });

      const creada = await this.prisma.iaInteracciones.create({
        data: {
          id_producto: id_producto_base,
          id_usuario,
          tipo_sugerencia: TIPO_SUGERENCIA_IA,
          id_cotizacion: request.id_cotizacion ?? null,
          prompt,
          respuesta,
        },
        select: { id_interaccion: true },
      });
      return creada.id_interaccion;
    } catch (error) {
      console.error('Error al registrar interacción IA:', error);
      return null;
    }
  }

  /**
   * Registra la decisión del asesor sobre una recomendación IA:
   * accion_usuario = 'ACEPTADO' (agrega/reemplaza el ítem sugerido) o 'RECHAZADO'
   * (descarta la tarjeta). ACEPTADO siempre sobrescribe; RECHAZADO solo se aplica
   * si aún no existe decisión, para no pisar una aceptación posterior.
   */
  async registrarAccionIa(
    dto: AccionIaRequest,
    id_usuario: number,
  ): Promise<AccionIaResponse> {
    const interaccion = await this.prisma.iaInteracciones.findUnique({
      where: { id_interaccion: dto.id_interaccion },
      select: { id_interaccion: true, accion_usuario: true, id_cotizacion: true, id_usuario: true },
    });
    if (!interaccion) {
      throw new NotFoundException(`Interacción IA ${dto.id_interaccion} no encontrada`);
    }

    const datos = {
      accion_usuario: dto.accion,
      id_usuario: interaccion.id_usuario ?? id_usuario,
      id_cotizacion: dto.id_cotizacion ?? interaccion.id_cotizacion,
    };

    if (dto.accion === 'ACEPTADO' || interaccion.accion_usuario == null) {
      await this.prisma.iaInteracciones.update({
        where: { id_interaccion: dto.id_interaccion },
        data: {
          ...datos,
          ...(dto.id_producto_sugerido ? { id_producto_sugerido: dto.id_producto_sugerido } : {}),
        },
      });
    }

    const actualizada = await this.prisma.iaInteracciones.findUniqueOrThrow({
      where: { id_interaccion: dto.id_interaccion },
      select: { id_interaccion: true, accion_usuario: true, id_cotizacion: true },
    });

    return {
      id_interaccion: actualizada.id_interaccion,
      accion_usuario: actualizada.accion_usuario ?? dto.accion,
      id_cotizacion: actualizada.id_cotizacion,
    };
  }
}

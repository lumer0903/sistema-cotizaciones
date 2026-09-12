import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, PrismaTransactionClient } from '../../../../common/prisma/prisma.service';
import { IQuoteRepository } from '../../domain/repositories/quote.repository.interface';
import { UpdateQuoteStateDto } from '../dtos/create-quote.dto';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { EstadoCotizacion, EstadoVenta, TipoPago, TipoVenta, TipoDocumento, OrigenMovimiento } from '@goldcontinent/shared/constants/enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChangeQuoteStateUseCase {
  constructor(
    @Inject(IQuoteRepository) private readonly quoteRepository: IQuoteRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: number, dto: UpdateQuoteStateDto, id_usuario: number): Promise<QuoteEntity> {
    const quote = await this.quoteRepository.findById(id);
    if (!quote) throw new NotFoundException('Cotización no encontrada');

    // Validar transiciones permitidas
    const validTransitions: Record<string, string[]> = {
      [EstadoCotizacion.borrador]: [EstadoCotizacion.enviada, EstadoCotizacion.rechazada],
      [EstadoCotizacion.enviada]: [EstadoCotizacion.aprobada, EstadoCotizacion.rechazada],
    };

    const allowed = validTransitions[quote.estado] ?? [];
    if (!allowed.includes(dto.estado)) {
      throw new BadRequestException(`No se puede cambiar de ${quote.estado} a ${dto.estado}`);
    }

    // Validaciones específicas para aprobada
    if (dto.estado === EstadoCotizacion.aprobada) {
      if (!dto.id_almacen) throw new BadRequestException('id_almacen es requerido para aprobar');
      if (!dto.tipoPago) throw new BadRequestException('tipoPago es requerido para aprobar');
      if (dto.tipoPago === 'credito' && !dto.diasPlazo) throw new BadRequestException('diasPlazo es requerido para ventas a crédito');
      if (!quote.id_cliente) throw new BadRequestException('La cotización debe tener cliente para aprobar');
    }

    const tiempo_fin = dto.estado === EstadoCotizacion.enviada ? new Date() : undefined;

    if (dto.estado === EstadoCotizacion.aprobada) {
      return this.processApproval(quote, dto, id_usuario);
    }

    // Para enviada y rechazada: solo actualizar estado y tiempo_fin si corresponde
    return this.quoteRepository.updateState(id, dto.estado, tiempo_fin) as Promise<QuoteEntity>;
  }

  private async processApproval(
    quote: QuoteEntity,
    dto: UpdateQuoteStateDto,
    id_usuario: number,
  ): Promise<QuoteEntity> {
    try {
      return await this.prisma.$transaction(async (tx) => {
      // 1. Validar stock disponible en el almacén
      for (const item of quote.detalle) {
        const stock = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto: item.id_producto, id_almacen: dto.id_almacen! } },
        });
        const disponible = stock?.cantidad ?? 0;
        if (disponible < item.cantidad) {
          const prod = await tx.producto.findUnique({ where: { id_producto: item.id_producto }, select: { codigo: true, descripcion: true } });
          throw new ConflictException(`Stock insuficiente para ${prod?.codigo} - ${prod?.descripcion}. Disponible: ${disponible}, Requerido: ${item.cantidad}`);
        }
      }

      // 2. Calcular totales
      const subtotal = quote.detalle.reduce((sum, item) => sum + item.subtotal, 0);
      const igv = subtotal * 0.18;
      const costoCarreta = quote.incluye_carreta ? quote.costo_carreta : 0;
      const total = subtotal + igv + costoCarreta;

      // 3. Generar número de venta (serie + correlativo)
      const lastVenta = await tx.venta.findFirst({
        where: { serie: 'F001' }, // Serie por defecto
        orderBy: { correlativo: 'desc' },
        select: { correlativo: true },
      });
      const correlativo = (lastVenta?.correlativo ?? 0) + 1;
      const numero_completo = `F001-${correlativo.toString().padStart(8, '0')}`;

      // 4. Crear Venta
      const venta = await tx.venta.create({
        data: {
          serie: 'F001',
          correlativo,
          numero_completo,
          tipo_documento: TipoDocumento.factura,
          estado: EstadoVenta.emitida,
          fecha_emision: new Date(),
          fecha_vencimiento: dto.tipoPago === 'credito' && dto.diasPlazo
            ? new Date(Date.now() + dto.diasPlazo * 24 * 60 * 60 * 1000)
            : null,
          id_cotizacion: quote.id_cotizacion,
          id_cliente: quote.id_cliente!,
          id_usuario,
          id_almacen: dto.id_almacen!,
          subtotal,
          igv,
          total,
          descuento_global: 0,
          tipoPago: dto.tipoPago as TipoPago,
          diasPlazo: dto.diasPlazo,
          montoPagado: dto.tipoPago === 'contado' ? total : 0,
          montoPendiente: dto.tipoPago === 'contado' ? 0 : total,
          observaciones: `Generada desde cotización ${quote.numero}`,
        },
      });

      // 5. Crear VentaDetalle y descontar stock + crear movimientos de inventario
      for (const item of quote.detalle) {
        // 5a. Crear detalle de venta
        await tx.ventaDetalle.create({
          data: {
            id_venta: venta.id_venta,
            id_producto: item.id_producto,
            tipo_venta: item.tipo_venta,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            descuento_item: 0,
            subtotal: item.subtotal,
            igv_item: item.subtotal * 0.18,
            total_item: item.subtotal * 1.18,
            es_sugerido_ia: item.es_sugerido_ia,
          },
        });

        // 5b. Descontar stock y crear movimiento de inventario
        const stockRecord = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto: item.id_producto, id_almacen: dto.id_almacen! } },
        });
        const stockAnterior = stockRecord?.cantidad ?? 0;
        const stockPosterior = stockAnterior - item.cantidad;

        await tx.stockActual.update({
          where: { id_producto_id_almacen: { id_producto: item.id_producto, id_almacen: dto.id_almacen! } },
          data: { cantidad: stockPosterior },
        });

        await tx.inventarioMovimiento.create({
          data: {
            id_producto: item.id_producto,
            id_almacen: dto.id_almacen!,
            tipo: 'salida',
            origen: 'cotizacion_aprobada',
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_posterior: stockPosterior,
            id_referencia: venta.id_venta,
            tipo_referencia: 'venta',
            observaciones: `Venta generada desde cotización ${quote.numero}`,
            id_usuario,
          },
        });

        // 5c. Verificar alerta stock mínimo
        await this.checkStockAlert(tx, item.id_producto, dto.id_almacen!, stockPosterior);
      }

      // 6. Crear CuentaCobrar si es crédito
      if (dto.tipoPago === 'credito' && dto.diasPlazo) {
        await tx.cuentaCobrar.create({
          data: {
            id_venta: venta.id_venta,
            id_cliente: quote.id_cliente!,
            montoOriginal: total,
            montoPendiente: total,
            estado: 'pendiente',
            fechaVencimiento: new Date(Date.now() + dto.diasPlazo * 24 * 60 * 60 * 1000),
            diasAtraso: 0,
            moraAcumulada: 0,
            updated_at: new Date(),
          },
        });
      }

      // 7. Actualizar estado de cotización a aprobada con tiempo_fin
      const updatedQuote = await tx.cotizacion.update({
        where: { id_cotizacion: quote.id_cotizacion },
        data: {
          estado: EstadoCotizacion.aprobada,
          tiempo_fin: new Date(),
        },
        include: {
          detalle: {
            include: {
              producto: { select: { id_producto: true, codigo: true, descripcion: true } },
            },
          },
          cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
          usuario: { select: { id_usuario: true, nombre: true } },
        },
      });

return this.mapToEntity(updatedQuote);
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Producto, almacén o cotización no encontrado');
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('Referencia inválida: cliente, producto o almacén no existe');
      }
      throw error;
    }
  }

  private async checkStockAlert(
    tx: PrismaTransactionClient,
    id_producto: number,
    id_almacen: number,
    stockActual: number,
  ): Promise<void> {
    const producto = await tx.producto.findUnique({
      where: { id_producto },
      select: { stock_minimo: true },
    });

    if (!producto) return;

    const stockMinimo = producto.stock_minimo;
    if (stockActual <= stockMinimo) {
      const existingAlert = await tx.alertas_stock.findFirst({
        where: { id_producto, id_almacen },
      });
      if (existingAlert) {
        await tx.alertas_stock.update({
          where: { id_alerta: existingAlert.id_alerta },
          data: { stock_actual: stockActual, stock_minimo: stockMinimo, estado: 'activa', reconocida_at: null },
        });
      } else {
        await tx.alertas_stock.create({
          data: { id_producto, id_almacen, stock_actual: stockActual, stock_minimo: stockMinimo, estado: 'activa' },
        });
      }
    } else {
      await tx.alertas_stock.updateMany({
        where: { id_producto, id_almacen, estado: 'activa' },
        data: { estado: 'resuelta', reconocida_at: new Date() },
      });
    }
  }

  private mapToEntity(quote: any): QuoteEntity {
    const entity = new QuoteEntity({
      id_cotizacion: quote.id_cotizacion,
      numero: quote.numero,
      id_cliente: quote.id_cliente,
      id_usuario: quote.id_usuario,
      tipo_precio: quote.tipo_precio,
      subtotal: quote.subtotal?.toNumber?.() ?? Number(quote.subtotal) ?? 0,
      igv: quote.igv?.toNumber?.() ?? Number(quote.igv) ?? 0,
      total: quote.total?.toNumber?.() ?? Number(quote.total) ?? 0,
      observaciones: quote.observaciones,
      incluye_carreta: quote.incluye_carreta,
      costo_carreta: quote.costo_carreta?.toNumber?.() ?? Number(quote.costo_carreta) ?? 0,
      estado: quote.estado,
      tiempo_inicio: quote.tiempo_inicio,
      tiempo_fin: quote.tiempo_fin,
      fecha_vencimiento: quote.fecha_vencimiento,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      cliente: quote.cliente ?? null,
      usuario: quote.usuario ?? null,
    });

    entity.detalle = (quote.detalle ?? []).map((d: any) => ({
      id_detalle: d.id_detalle,
      id_producto: d.id_producto,
      tipo_venta: d.tipo_venta,
      cantidad: d.cantidad,
      color_notas: d.color_notas,
      precio_unitario: d.precio_unitario?.toNumber?.() ?? Number(d.precio_unitario) ?? 0,
      subtotal: d.subtotal?.toNumber?.() ?? Number(d.subtotal) ?? 0,
      es_sugerido_ia: d.es_sugerido_ia,
      producto: d.producto ?? null,
    }));

    return entity;
  }
}
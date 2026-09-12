import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { IQuoteRepository } from '../../domain/repositories/quote.repository.interface';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';
import { Prisma, MetodoPago, TipoMovimiento, OrigenMovimiento } from '@prisma/client';

interface RegistrarPagoInput {
  id_cotizacion: number;
  monto: number;
  metodo_pago: MetodoPago;
  referencia?: string;
  id_usuario: number;
}

interface PagoResponse {
  id_pago: number;
  id_cotizacion: number;
  monto: number;
  metodo_pago: MetodoPago;
  referencia: string | null;
  id_usuario: number | null;
  created_at: Date;
}

interface CotizacionConPagos {
  id_cotizacion: number;
  numero: string;
  id_cliente?: number | null;
  id_usuario?: number | null;
  tipo_precio: string;
  subtotal: number;
  igv: number;
  total: number;
  observaciones?: string | null;
  incluye_carreta: boolean;
  costo_carreta: number;
  estado: string;
  tiempo_inicio: Date;
  tiempo_fin?: Date | null;
  fecha_vencimiento?: Date | null;
  created_at: Date;
  updated_at: Date;
  cliente?: { id_cliente: number; nombre: string; tipo: string } | null;
  usuario?: { id_usuario: number; nombre: string } | null;
  detalle: Array<{
    id_detalle: number;
    id_producto: number;
    tipo_venta: string;
    cantidad: number;
    color_notas?: string | null;
    precio_unitario: number;
    subtotal: number;
    es_sugerido_ia: boolean;
    producto?: { id_producto: number; codigo: string; descripcion: string } | null;
  }>;
  pagos: PagoResponse[];
  saldo_pendiente: number;
}

@Injectable()
export class RegistrarPagoUseCase {
  private readonly logger = new Logger(RegistrarPagoUseCase.name);

  constructor(
    @Inject(IQuoteRepository)
    private readonly quoteRepository: IQuoteRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    id_cotizacion: number,
    dto: { monto: number; metodo_pago: MetodoPago; referencia?: string },
    id_usuario: number,
  ): Promise<{
    cotizacion: CotizacionConPagos;
    saldo_pendiente: number;
    pagos: PagoResponse[];
  }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener la cotización con su detalle
      const cotizacion = await tx.cotizacion.findUnique({
        where: { id_cotizacion },
        include: {
          detalle: {
            include: { producto: true },
          },
          pagos: true,
        },
      });

      if (!cotizacion) {
        throw new NotFoundException('Cotización no encontrada');
      }

      // 2. Verificar que la cotización esté en un estado válido para recibir pagos
      const estadosPermitidos = ['borrador', 'enviada', 'parcialmente_pagada'];
      if (!estadosPermitidos.includes(cotizacion.estado)) {
        throw new ConflictException(
          `No se pueden registrar pagos en una cotización con estado '${cotizacion.estado}'`,
        );
      }

      // 3. Verificar que el monto no exceda el saldo pendiente
      const totalPagadoAnterior = cotizacion.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      const saldoPendienteAnterior = Number(cotizacion.total) - totalPagadoAnterior;

      if (dto.monto > saldoPendienteAnterior + 0.01) { // tolerancia de 1 centavo
        throw new BadRequestException(
          `El monto (${dto.monto}) excede el saldo pendiente (${saldoPendienteAnterior.toFixed(2)})`,
        );
      }

      // 4. Determinar si es el primer pago
      const esPrimerPago = cotizacion.pagos.length === 0;

      // 5. Insertar el nuevo pago
      const nuevoPago = await tx.cotizacionPago.create({
        data: {
          id_cotizacion,
          monto: new Prisma.Decimal(dto.monto.toFixed(2)),
          metodo_pago: dto.metodo_pago,
          referencia: dto.referencia,
          id_usuario,
        },
      });

      // 6. Obtener todos los pagos actualizados
      const pagosActualizados = await tx.cotizacionPago.findMany({
        where: { id_cotizacion },
        orderBy: { created_at: 'asc' },
      });

      // 7. Calcular totales
      const totalPagado = pagosActualizados.reduce((sum, p) => sum + Number(p.monto), 0);
      const saldoPendiente = Number(cotizacion.total) - totalPagado;

      // 8. Determinar nuevo estado
      let nuevoEstado = cotizacion.estado;
      if (totalPagado >= Number(cotizacion.total) - 0.01) {
        nuevoEstado = 'aprobada';
      } else if (totalPagado > 0) {
        nuevoEstado = 'parcialmente_pagada';
      }

      // 9. Si es el primer pago y la cotización no está aprobada, descontar stock
      if (esPrimerPago && nuevoEstado !== 'aprobada') {
        for (const item of cotizacion.detalle) {
          const stockActual = await tx.producto.findUnique({
            where: { id_producto: item.id_producto },
            select: { stock_principal: true },
          });

          if (!stockActual) {
            throw new NotFoundException(`Producto ${item.id_producto} no encontrado`);
          }

          const nuevoStock = stockActual.stock_principal - item.cantidad;
          if (nuevoStock < 0) {
            throw new ConflictException(
              `Stock insuficiente para producto ${item.producto?.codigo || item.id_producto}. Disponible: ${stockActual.stock_principal}, Requerido: ${item.cantidad}`,
            );
          }

          await tx.producto.update({
            where: { id_producto: item.id_producto },
            data: { stock_principal: nuevoStock },
          });

          // Registrar movimiento de inventario
          await tx.inventarioMovimiento.create({
            data: {
              id_producto: item.id_producto,
              id_almacen: 1, // Almacén principal por defecto
              tipo: 'salida',
              origen: 'cotizacion_aprobada',
              cantidad: item.cantidad,
              stock_anterior: stockActual.stock_principal,
              stock_posterior: nuevoStock,
              id_referencia: id_cotizacion,
              tipo_referencia: 'cotizacion',
              observaciones: `Descuento de stock por primer pago de cotización ${cotizacion.numero}`,
              id_usuario,
            },
          });
        }
      }

      // 10. Actualizar estado de la cotización
      await tx.cotizacion.update({
        where: { id_cotizacion },
        data: { estado: nuevoEstado },
      });

      // 11. Obtener cotización actualizada con pagos
      const cotizacionActualizada = await tx.cotizacion.findUnique({
        where: { id_cotizacion },
        include: {
          detalle: {
            include: { producto: { select: { id_producto: true, codigo: true, descripcion: true } } },
          },
          pagos: { orderBy: { created_at: 'asc' } },
          cliente: { select: { id_cliente: true, nombre: true, tipo: true } },
          usuario: { select: { id_usuario: true, nombre: true } },
        },
      });

      return {
        cotizacion: this.mapToEntityWithPagos(cotizacionActualizada!),
        saldo_pendiente: Math.max(0, saldoPendiente),
        pagos: pagosActualizados.map(p => ({
          id_pago: p.id_pago,
          id_cotizacion: p.id_cotizacion,
          monto: Number(p.monto),
          metodo_pago: p.metodo_pago,
          referencia: p.referencia,
          id_usuario: p.id_usuario,
          created_at: p.created_at,
        })),
      };
    });
  }

  private mapToEntityWithPagos(quote: any): {
    id_cotizacion: number;
    numero: string;
    id_cliente?: number | null;
    id_usuario?: number | null;
    tipo_precio: string;
    subtotal: number;
    igv: number;
    total: number;
    observaciones?: string | null;
    incluye_carreta: boolean;
    costo_carreta: number;
    estado: string;
    tiempo_inicio: Date;
    tiempo_fin?: Date | null;
    fecha_vencimiento?: Date | null;
    created_at: Date;
    updated_at: Date;
    cliente?: { id_cliente: number; nombre: string; tipo: string } | null;
    usuario?: { id_usuario: number; nombre: string } | null;
    detalle: Array<{
      id_detalle: number;
      id_producto: number;
      tipo_venta: string;
      cantidad: number;
      color_notas?: string | null;
      precio_unitario: number;
      subtotal: number;
      es_sugerido_ia: boolean;
      producto?: { id_producto: number; codigo: string; descripcion: string } | null;
    }>;
    pagos: PagoResponse[];
    saldo_pendiente: number;
  } {
    return {
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
      detalle: (quote.detalle ?? []).map((d: any) => ({
        id_detalle: d.id_detalle,
        id_producto: d.id_producto,
        tipo_venta: d.tipo_venta,
        cantidad: d.cantidad,
        color_notas: d.color_notas,
        precio_unitario: d.precio_unitario?.toNumber?.() ?? Number(d.precio_unitario) ?? 0,
        subtotal: d.subtotal?.toNumber?.() ?? Number(d.subtotal) ?? 0,
        es_sugerido_ia: d.es_sugerido_ia,
        producto: d.producto ?? null,
      })),
      pagos: (quote.pagos ?? []).map((p: any) => ({
        id_pago: p.id_pago,
        id_cotizacion: p.id_cotizacion,
        monto: Number(p.monto),
        metodo_pago: p.metodo_pago,
        referencia: p.referencia,
        id_usuario: p.id_usuario,
        created_at: p.created_at,
      })),
      saldo_pendiente: 0,
    };
  }
}
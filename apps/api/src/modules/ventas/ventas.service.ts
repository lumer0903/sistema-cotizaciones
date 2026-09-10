import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstadoVenta, TipoPago, TipoDocumento, TipoVenta } from '@goldcontinent/shared/constants/enums';
import { Decimal } from '@prisma/client/runtime/library';

export interface VentaResponse {
  id_venta: number;
  serie: string;
  correlativo: number;
  numero_completo: string;
  tipo_documento: TipoDocumento;
  estado: EstadoVenta;
  fecha_emision: Date;
  fecha_vencimiento: Date | null;
  id_cotizacion: number | null;
  id_cliente: number;
  id_usuario: number;
  id_almacen: number;
  subtotal: number;
  igv: number;
  total: number;
  descuento_global: number;
  tipoPago: TipoPago;
  diasPlazo: number | null;
  montoPagado: number;
  montoPendiente: number;
  autorizadoPor: number | null;
  autorizadoAt: Date | null;
  hash_cpe: string | null;
  qr_code: string | null;
  xml_enviado: boolean;
  observaciones: string | null;
  created_at: Date;
  updated_at: Date;
  cliente?: {
    id_cliente: number;
    nombre: string;
    ruc_dni: string | null;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
  } | null;
  almacen?: {
    id_almacen: number;
    nombre: string;
  } | null;
  detalles?: VentaDetalleResponse[];
}

export interface VentaDetalleResponse {
  id_detalle: number;
  id_venta: number;
  id_producto: number;
  tipo_venta: TipoVenta;
  cantidad: number;
  precio_unitario: number;
  descuento_item: number;
  subtotal: number;
  igv_item: number;
  total_item: number;
  es_sugerido_ia: boolean;
  producto?: {
    id_producto: number;
    codigo: string;
    descripcion: string;
  } | null;
}

export interface PaginatedVentasResponse {
  data: VentaResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateVentaDto {
  serie: string;
  correlativo: number;
  tipo_documento: TipoDocumento;
  id_cliente: number;
  id_usuario: number;
  id_almacen: number;
  subtotal: number;
  igv: number;
  total: number;
  descuento_global?: number;
  tipoPago: TipoPago;
  diasPlazo?: number;
  id_cotizacion?: number;
  observaciones?: string;
  detalles: CreateVentaDetalleDto[];
}

export interface CreateVentaDetalleDto {
  id_producto: number;
  tipo_venta: TipoVenta;
  cantidad: number;
  precio_unitario: number;
  descuento_item?: number;
}

export interface UpdateVentaDto {
  estado?: EstadoVenta;
  fecha_vencimiento?: Date | null;
  tipoPago?: TipoPago;
  diasPlazo?: number | null;
  observaciones?: string | null;
  autorizadoPor?: number | null;
  montoPagado?: number;
  montoPendiente?: number;
}

function toNumber(value: Decimal | number | null): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function mapEstadoVenta(estado: string): EstadoVenta {
  const validEstados: EstadoVenta[] = ['borrador', 'emitida', 'pagada', 'parcial', 'anulada'];
  return validEstados.includes(estado as EstadoVenta) ? estado as EstadoVenta : 'emitida';
}

@Injectable()
export class VentasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    filters: {
      estado?: string;
      tipoPago?: string;
      id_cliente?: number;
      id_usuario?: number;
      fecha_inicio?: Date;
      fecha_fin?: Date;
    } = {},
  ): Promise<PaginatedVentasResponse> {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters.estado) where.estado = filters.estado.toUpperCase() as EstadoVenta;
      if (filters.tipoPago) where.tipoPago = filters.tipoPago.toUpperCase() as TipoPago;
      if (filters.id_cliente) where.id_cliente = filters.id_cliente;
      if (filters.id_usuario) where.id_usuario = filters.id_usuario;
      if (filters.fecha_inicio || filters.fecha_fin) {
        where.fecha_emision = {};
        if (filters.fecha_inicio) where.fecha_emision.gte = filters.fecha_inicio;
        if (filters.fecha_fin) where.fecha_emision.lte = filters.fecha_fin;
      }

      const [data, total] = await Promise.all([
        this.prisma.venta.findMany({
          where,
          select: {
            id_venta: true,
            serie: true,
            correlativo: true,
            numero_completo: true,
            tipo_documento: true,
            estado: true,
            fecha_emision: true,
            fecha_vencimiento: true,
            id_cotizacion: true,
            id_cliente: true,
            id_usuario: true,
            id_almacen: true,
            subtotal: true,
            igv: true,
            total: true,
            descuento_global: true,
            tipoPago: true,
            diasPlazo: true,
            montoPagado: true,
            montoPendiente: true,
            autorizadoPor: true,
            autorizadoAt: true,
            hash_cpe: true,
            qr_code: true,
            xml_enviado: true,
            observaciones: true,
            created_at: true,
            updated_at: true,
            cliente: {
              select: {
                id_cliente: true,
                nombre: true,
                ruc_dni: true,
              },
            },
            usuario: {
              select: {
                id_usuario: true,
                nombre: true,
              },
            },
            almacen: {
              select: {
                id_almacen: true,
                nombre: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { fecha_emision: 'desc' },
        }),
        this.prisma.venta.count({ where }),
      ]);

      const mappedData = data.map(item => ({
        ...item,
        estado: mapEstadoVenta(item.estado),
        subtotal: toNumber(item.subtotal),
        igv: toNumber(item.igv),
        total: toNumber(item.total),
        descuento_global: toNumber(item.descuento_global),
        montoPagado: toNumber(item.montoPagado),
        montoPendiente: toNumber(item.montoPendiente),
      }));

      return { data: mappedData, total, page, limit };
    } catch (error) {
      console.error('Error fetching ventas:', error);
      return { data: [], total: 0, page, limit };
    }
  }

  async findById(id: number): Promise<VentaResponse | null> {
    const item = await this.prisma.venta.findUnique({
      where: { id_venta: id },
      select: {
        id_venta: true,
        serie: true,
        correlativo: true,
        numero_completo: true,
        tipo_documento: true,
        estado: true,
        fecha_emision: true,
        fecha_vencimiento: true,
        id_cotizacion: true,
        id_cliente: true,
        id_usuario: true,
        id_almacen: true,
        subtotal: true,
        igv: true,
        total: true,
        descuento_global: true,
        tipoPago: true,
        diasPlazo: true,
        montoPagado: true,
        montoPendiente: true,
        autorizadoPor: true,
        autorizadoAt: true,
        hash_cpe: true,
        qr_code: true,
        xml_enviado: true,
        observaciones: true,
        created_at: true,
        updated_at: true,
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            ruc_dni: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
          },
        },
        almacen: {
          select: {
            id_almacen: true,
            nombre: true,
          },
        },
        detalles: {
          select: {
            id_detalle: true,
            id_venta: true,
            id_producto: true,
            tipo_venta: true,
            cantidad: true,
            precio_unitario: true,
            descuento_item: true,
            subtotal: true,
            igv_item: true,
            total_item: true,
            es_sugerido_ia: true,
            producto: {
              select: {
                id_producto: true,
                codigo: true,
                descripcion: true,
              },
            },
          },
        },
      },
    });

    if (!item) return null;

    return {
      ...item,
      estado: mapEstadoVenta(item.estado),
      subtotal: toNumber(item.subtotal),
      igv: toNumber(item.igv),
      total: toNumber(item.total),
      descuento_global: toNumber(item.descuento_global),
      montoPagado: toNumber(item.montoPagado),
      montoPendiente: toNumber(item.montoPendiente),
      detalles: item.detalles?.map(detalle => ({
        ...detalle,
        tipo_venta: detalle.tipo_venta as TipoVenta,
        precio_unitario: toNumber(detalle.precio_unitario),
        descuento_item: toNumber(detalle.descuento_item),
        subtotal: toNumber(detalle.subtotal),
        igv_item: toNumber(detalle.igv_item),
        total_item: toNumber(detalle.total_item),
      })),
    };
  }

  async create(data: CreateVentaDto): Promise<VentaResponse> {
    const numero_completo = `${data.serie}-${data.correlativo.toString().padStart(8, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          serie: data.serie,
          correlativo: data.correlativo,
          numero_completo,
          tipo_documento: data.tipo_documento,
          id_cliente: data.id_cliente,
          id_usuario: data.id_usuario,
          id_almacen: data.id_almacen,
          subtotal: data.subtotal,
          igv: data.igv,
          total: data.total,
          descuento_global: data.descuento_global ?? 0,
          tipoPago: data.tipoPago,
          diasPlazo: data.diasPlazo,
          id_cotizacion: data.id_cotizacion,
          observaciones: data.observaciones,
          montoPagado: data.tipoPago === 'contado' ? data.total : 0,
          montoPendiente: data.tipoPago === 'contado' ? 0 : data.total,
        },
        select: {
          id_venta: true,
          serie: true,
          correlativo: true,
          numero_completo: true,
          tipo_documento: true,
          estado: true,
          fecha_emision: true,
          fecha_vencimiento: true,
          id_cotizacion: true,
          id_cliente: true,
          id_usuario: true,
          id_almacen: true,
          subtotal: true,
          igv: true,
          total: true,
          descuento_global: true,
          tipoPago: true,
          diasPlazo: true,
          montoPagado: true,
          montoPendiente: true,
          autorizadoPor: true,
          autorizadoAt: true,
          hash_cpe: true,
          qr_code: true,
          xml_enviado: true,
          observaciones: true,
          created_at: true,
          updated_at: true,
        },
      });

      await Promise.all(
        data.detalles.map((detalle) =>
          tx.ventaDetalle.create({
            data: {
              id_venta: venta.id_venta,
              id_producto: detalle.id_producto,
              tipo_venta: detalle.tipo_venta,
              cantidad: detalle.cantidad,
              precio_unitario: detalle.precio_unitario,
              descuento_item: detalle.descuento_item ?? 0,
              subtotal: detalle.precio_unitario * detalle.cantidad,
              igv_item: (detalle.precio_unitario * detalle.cantidad) * 0.18,
              total_item: (detalle.precio_unitario * detalle.cantidad) * 1.18,
              es_sugerido_ia: false,
            },
          }),
        ),
      );

      if (data.tipoPago === 'credito' && data.diasPlazo) {
        await tx.cuentaCobrar.create({
          data: {
            id_venta: venta.id_venta,
            id_cliente: data.id_cliente,
            montoOriginal: data.total,
            montoPendiente: data.total,
            estado: 'pendiente',
            fechaVencimiento: new Date(Date.now() + data.diasPlazo * 24 * 60 * 60 * 1000),
            diasAtraso: 0,
            moraAcumulada: 0,
            updated_at: new Date(),
          },
        });
      }

      return {
        ...venta,
        tipoPago: data.tipoPago,
        estado: mapEstadoVenta(venta.estado),
        subtotal: toNumber(venta.subtotal),
        igv: toNumber(venta.igv),
        total: toNumber(venta.total),
        descuento_global: toNumber(venta.descuento_global),
        montoPagado: toNumber(venta.montoPagado),
        montoPendiente: toNumber(venta.montoPendiente),
      };
    });
  }

  async update(id: number, data: UpdateVentaDto): Promise<VentaResponse> {
    const item = await this.prisma.venta.update({
      where: { id_venta: id },
      data: {
        ...data,
        autorizadoAt: data.autorizadoPor ? new Date() : undefined,
      },
      select: {
        id_venta: true,
        serie: true,
        correlativo: true,
        numero_completo: true,
        tipo_documento: true,
        estado: true,
        fecha_emision: true,
        fecha_vencimiento: true,
        id_cotizacion: true,
        id_cliente: true,
        id_usuario: true,
        id_almacen: true,
        subtotal: true,
        igv: true,
        total: true,
        descuento_global: true,
        tipoPago: true,
        diasPlazo: true,
        montoPagado: true,
        montoPendiente: true,
        autorizadoPor: true,
        autorizadoAt: true,
        hash_cpe: true,
        qr_code: true,
        xml_enviado: true,
        observaciones: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      ...item,
      estado: mapEstadoVenta(item.estado),
      subtotal: toNumber(item.subtotal),
      igv: toNumber(item.igv),
      total: toNumber(item.total),
      descuento_global: toNumber(item.descuento_global),
      montoPagado: toNumber(item.montoPagado),
      montoPendiente: toNumber(item.montoPendiente),
    };
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.ventaDetalle.deleteMany({ where: { id_venta: id } });
      await tx.cuentaCobrar.deleteMany({ where: { id_venta: id } });
      await tx.ventaPago.deleteMany({ where: { id_venta: id } });
      await tx.venta.update({
        where: { id_venta: id },
        data: { estado: 'anulada' },
      });
    });
  }
}
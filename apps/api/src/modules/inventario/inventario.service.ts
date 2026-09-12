import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, TipoMovimiento, OrigenMovimiento } from '@prisma/client';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';

export interface MovimientoResponse {
  id_movimiento: number;
  id_producto: number;
  id_almacen: number;
  tipo: TipoMovimiento;
  origen: OrigenMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  costo_unitario: number | null;
  id_referencia: number | null;
  tipo_referencia: string | null;
  observaciones: string | null;
  id_usuario: number | null;
  created_at: Date;
  producto?: {
    id_producto: number;
    codigo: string;
    descripcion: string;
  } | null;
  almacen?: {
    id_almacen: number;
    codigo: string;
    nombre: string;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
  } | null;
}

export interface PaginatedMovimientosResponse {
  data: MovimientoResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface KardexResponse {
  id_movimiento: number;
  fecha: Date;
  tipo: TipoMovimiento;
  origen: OrigenMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  costo_unitario: number | null;
  referencia: string | null;
  observaciones: string | null;
  usuario: string | null;
}

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly TIPOS_SALIDA: TipoMovimiento[] = ['salida', 'transferencia'];
  private readonly TIPOS_ENTRADA: TipoMovimiento[] = ['entrada', 'transferencia'];

  async createMovimiento(
    data: CreateMovimientoDto,
    id_usuario: number,
  ): Promise<MovimientoResponse> {
    const { id_producto, id_almacen, tipo, origen, cantidad, costo_unitario, id_referencia, tipo_referencia, observaciones } = data;

    // Validar producto y almacén
    const [producto, almacen] = await Promise.all([
      this.prisma.producto.findUnique({ where: { id_producto, deleted_at: null }, select: { id_producto: true } }),
      this.prisma.almacen.findUnique({ where: { id_almacen }, select: { id_almacen: true } }),
    ]);
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!almacen) throw new NotFoundException('Almacén no encontrado');

    // Validar stock para salidas/ajustes negativos
    if (this.TIPOS_SALIDA.includes(tipo)) {
      const stock = await this.prisma.stockActual.findUnique({
        where: { id_producto_id_almacen: { id_producto, id_almacen } },
      });
      const stockActual = stock?.cantidad ?? 0;
      if (stockActual < cantidad) {
        throw new ConflictException(`Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`);
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Obtener stock actual (crear si no existe)
        let stockRecord = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto, id_almacen } },
        });

        if (!stockRecord) {
          stockRecord = await tx.stockActual.create({
            data: { id_producto, id_almacen, cantidad: 0 },
          });
        }

        const stockAnterior = stockRecord.cantidad;
        let stockPosterior: number;

        // 2. Calcular nuevo stock según tipo
        if (this.TIPOS_ENTRADA.includes(tipo) && tipo !== 'transferencia') {
          stockPosterior = stockAnterior + cantidad;
        } else if (this.TIPOS_SALIDA.includes(tipo) && tipo !== 'transferencia') {
          stockPosterior = stockAnterior - cantidad;
        } else if (tipo === 'transferencia') {
          // Para transferencia, se maneja en dos movimientos separados (salida + entrada)
          stockPosterior = stockAnterior;
        } else {
          // ajuste: cantidad puede ser positivo o negativo
          stockPosterior = stockAnterior + cantidad;
        }

        if (stockPosterior < 0) {
          throw new BadRequestException('El stock no puede ser negativo');
        }

        // 3. Actualizar stock
        await tx.stockActual.update({
          where: { id_producto_id_almacen: { id_producto, id_almacen } },
          data: { cantidad: stockPosterior },
        });

        // 4. Crear movimiento
        const movimiento = await tx.inventarioMovimiento.create({
          data: {
            id_producto,
            id_almacen,
            tipo,
            origen,
            cantidad,
            stock_anterior: stockAnterior,
            stock_posterior: stockPosterior,
            costo_unitario: costo_unitario ? new Prisma.Decimal(costo_unitario.toFixed(2)) : null,
            id_referencia,
            tipo_referencia,
            observaciones,
            id_usuario,
          },
          select: {
            id_movimiento: true,
            id_producto: true,
            id_almacen: true,
            tipo: true,
            origen: true,
            cantidad: true,
            stock_anterior: true,
            stock_posterior: true,
            costo_unitario: true,
            id_referencia: true,
            tipo_referencia: true,
            observaciones: true,
            id_usuario: true,
            created_at: true,
            producto: { select: { id_producto: true, codigo: true, descripcion: true } },
            almacen: { select: { id_almacen: true, codigo: true, nombre: true } },
            usuario: { select: { id_usuario: true, nombre: true } },
          },
        });

        // 5. Verificar alerta de stock mínimo
        await this.checkStockAlert(tx, id_producto, id_almacen, stockPosterior);

        return this.mapMovimiento(movimiento);
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Producto o almacén no encontrado');
      }
      throw error;
    }
  }

  async createTransferencia(
    id_producto: number,
    id_almacen_origen: number,
    id_almacen_destino: number,
    cantidad: number,
    id_usuario: number,
    observaciones?: string,
  ): Promise<{ salida: MovimientoResponse; entrada: MovimientoResponse }> {
    if (id_almacen_origen === id_almacen_destino) {
      throw new BadRequestException('El almacén de origen y destino deben ser diferentes');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Validar stock en origen
        const stockOrigen = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto, id_almacen: id_almacen_origen } },
        });
        const stockActualOrigen = stockOrigen?.cantidad ?? 0;
        if (stockActualOrigen < cantidad) {
          throw new ConflictException(`Stock insuficiente en origen. Disponible: ${stockActualOrigen}`);
        }

        // SALIDA en origen
        const stockPosteriorOrigen = stockActualOrigen - cantidad;
        await tx.stockActual.update({
          where: { id_producto_id_almacen: { id_producto, id_almacen: id_almacen_origen } },
          data: { cantidad: stockPosteriorOrigen },
        });

        const salida = await tx.inventarioMovimiento.create({
          data: {
            id_producto,
            id_almacen: id_almacen_origen,
            tipo: 'transferencia',
            origen: 'transferencia',
            cantidad,
            stock_anterior: stockActualOrigen,
            stock_posterior: stockPosteriorOrigen,
            observaciones: `Transferencia a almacén ${id_almacen_destino}: ${observaciones ?? ''}`,
            id_usuario,
          },
          select: {
            id_movimiento: true,
            id_producto: true,
            id_almacen: true,
            tipo: true,
            origen: true,
            cantidad: true,
            stock_anterior: true,
            stock_posterior: true,
            costo_unitario: true,
            id_referencia: true,
            tipo_referencia: true,
            observaciones: true,
            id_usuario: true,
            created_at: true,
            producto: { select: { id_producto: true, codigo: true, descripcion: true } },
            almacen: { select: { id_almacen: true, codigo: true, nombre: true } },
            usuario: { select: { id_usuario: true, nombre: true } },
          },
        });

        // ENTRADA en destino
        const stockDestino = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto, id_almacen: id_almacen_destino } },
        });
        const stockActualDestino = stockDestino?.cantidad ?? 0;
        const stockPosteriorDestino = stockActualDestino + cantidad;

        await tx.stockActual.upsert({
          where: { id_producto_id_almacen: { id_producto, id_almacen: id_almacen_destino } },
          create: { id_producto, id_almacen: id_almacen_destino, cantidad: stockPosteriorDestino },
          update: { cantidad: stockPosteriorDestino },
        });

        const entrada = await tx.inventarioMovimiento.create({
          data: {
            id_producto,
            id_almacen: id_almacen_destino,
            tipo: 'transferencia',
            origen: 'transferencia',
            cantidad,
            stock_anterior: stockActualDestino,
            stock_posterior: stockPosteriorDestino,
            observaciones: `Transferencia desde almacén ${id_almacen_origen}: ${observaciones ?? ''}`,
            id_usuario,
          },
          select: {
            id_movimiento: true,
            id_producto: true,
            id_almacen: true,
            tipo: true,
            origen: true,
            cantidad: true,
            stock_anterior: true,
            stock_posterior: true,
            costo_unitario: true,
            id_referencia: true,
            tipo_referencia: true,
            observaciones: true,
            id_usuario: true,
            created_at: true,
            producto: { select: { id_producto: true, codigo: true, descripcion: true } },
            almacen: { select: { id_almacen: true, codigo: true, nombre: true } },
            usuario: { select: { id_usuario: true, nombre: true } },
          },
        });

        await this.checkStockAlert(tx, id_producto, id_almacen_origen, stockPosteriorOrigen);
        await this.checkStockAlert(tx, id_producto, id_almacen_destino, stockPosteriorDestino);

        return { salida: this.mapMovimiento(salida), entrada: this.mapMovimiento(entrada) };
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Producto o almacén no encontrado');
      }
      throw error;
    }
  }

  async getKardex(
    id_producto: number,
    filters: {
      id_almacen?: number;
      tipo?: TipoMovimiento;
      origen?: OrigenMovimiento;
      fecha_inicio?: Date;
      fecha_fin?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: KardexResponse[]; total: number; page: number; limit: number }> {
    const { id_almacen, tipo, origen, fecha_inicio, fecha_fin, page = 1, limit = 100 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { id_producto };
    if (id_almacen) where.id_almacen = id_almacen;
    if (tipo) where.tipo = tipo;
    if (origen) where.origen = origen;
    if (fecha_inicio || fecha_fin) {
      where.created_at = {};
      if (fecha_inicio) where.created_at.gte = fecha_inicio;
      if (fecha_fin) where.created_at.lte = fecha_fin;
    }

    const [data, total] = await Promise.all([
      this.prisma.inventarioMovimiento.findMany({
        where,
        select: {
          id_movimiento: true,
          tipo: true,
          origen: true,
          cantidad: true,
          stock_anterior: true,
          stock_posterior: true,
          costo_unitario: true,
          id_referencia: true,
          tipo_referencia: true,
          observaciones: true,
          created_at: true,
          usuario: { select: { nombre: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.inventarioMovimiento.count({ where }),
    ]);

    const mappedData = data.map(m => ({
      id_movimiento: m.id_movimiento,
      fecha: m.created_at,
      tipo: m.tipo,
      origen: m.origen,
      cantidad: m.cantidad,
      stock_anterior: m.stock_anterior,
      stock_posterior: m.stock_posterior,
      costo_unitario: m.costo_unitario?.toNumber() ?? null,
      referencia: m.tipo_referencia && m.id_referencia ? `${m.tipo_referencia}:${m.id_referencia}` : null,
      observaciones: m.observaciones,
      usuario: m.usuario?.nombre ?? null,
    }));

    return { data: mappedData, total, page, limit };
  }

  async getStockActual(
    filters: { id_producto?: number; id_almacen?: number; soloBajoMinimo?: boolean } = {},
  ): Promise<Array<{
    id_producto: number;
    codigo: string;
    descripcion: string;
    id_almacen: number;
    almacen_codigo: string;
    almacen_nombre: string;
    cantidad: number;
    stock_minimo: number;
    estado: 'normal' | 'bajo_minimo' | 'sin_stock';
  }>> {
    const { id_producto, id_almacen, soloBajoMinimo } = filters;

    const whereStock: any = {};
    if (id_producto) whereStock.id_producto = id_producto;
    if (id_almacen) whereStock.id_almacen = id_almacen;

    const stockData = await this.prisma.stockActual.findMany({
      where: whereStock,
      select: {
        id_producto: true,
        id_almacen: true,
        cantidad: true,
        producto: { select: { codigo: true, descripcion: true, stock_minimo: true } },
        almacen: { select: { codigo: true, nombre: true } },
      },
    });

    return stockData.map(s => {
      const stockMinimo = s.producto.stock_minimo;
      let estado: 'normal' | 'bajo_minimo' | 'sin_stock' = 'normal';
      if (s.cantidad === 0) estado = 'sin_stock';
      else if (s.cantidad <= stockMinimo) estado = 'bajo_minimo';

      return {
        id_producto: s.id_producto,
        codigo: s.producto.codigo,
        descripcion: s.producto.descripcion,
        id_almacen: s.id_almacen,
        almacen_codigo: s.almacen.codigo,
        almacen_nombre: s.almacen.nombre,
        cantidad: s.cantidad,
        stock_minimo: stockMinimo,
        estado,
      };
    }).filter(s => !soloBajoMinimo || s.estado !== 'normal');
  }

  private async checkStockAlert(
    tx: Prisma.TransactionClient,
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
      // Crear o actualizar alerta (no hay unique constraint, usar findFirst)
      const existingAlert = await tx.alertas_stock.findFirst({
        where: { id_producto, id_almacen },
      });
      if (existingAlert) {
        await tx.alertas_stock.update({
          where: { id_alerta: existingAlert.id_alerta },
          data: {
            stock_actual: stockActual,
            stock_minimo: stockMinimo,
            estado: 'activa',
            reconocida_at: null,
          },
        });
      } else {
        await tx.alertas_stock.create({
          data: {
            id_producto,
            id_almacen,
            stock_actual: stockActual,
            stock_minimo: stockMinimo,
            estado: 'activa',
          },
        });
      }
    } else {
      // Resolver alerta si existe
      await tx.alertas_stock.updateMany({
        where: { id_producto, id_almacen, estado: 'activa' },
        data: { estado: 'resuelta', reconocida_at: new Date() },
      });
    }
  }

  private mapMovimiento(m: any): MovimientoResponse {
    return {
      ...m,
      costo_unitario: m.costo_unitario?.toNumber() ?? null,
    };
  }
}
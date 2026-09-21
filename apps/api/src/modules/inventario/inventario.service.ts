import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) { }

  private readonly TIPOS_SALIDA: TipoMovimiento[] = ['salida', 'transferencia'];
  private readonly TIPOS_ENTRADA: TipoMovimiento[] = ['entrada', 'transferencia'];

  async createMovimiento(
    data: CreateMovimientoDto,
    id_usuario: number,
  ): Promise<MovimientoResponse> {
    const {
      id_producto,
      id_almacen,
      tipo,
      origen,
      cantidad,
      costo_unitario,
      id_referencia,
      tipo_referencia,
      observaciones,
    } = data;

    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad del movimiento debe ser mayor a 0');
    }

    // Validar existencia de producto y almacén en paralelo fuera de la transacción
    const [producto, almacen] = await Promise.all([
      this.prisma.producto.findUnique({
        where: { id_producto, deleted_at: null },
        select: { id_producto: true },
      }),
      this.prisma.almacen.findUnique({
        where: { id_almacen },
        select: { id_almacen: true },
      }),
    ]);

    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!almacen) throw new NotFoundException('Almacén no encontrado');

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Obtener o crear registro de stock dentro de la transacción
        let stockRecord = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto, id_almacen } },
        });

        if (!stockRecord) {
          stockRecord = await tx.stockActual.create({
            data: { id_producto, id_almacen, cantidad: 0 },
          });
        }

        const stockAnterior = stockRecord.cantidad;

        // Validar stock disponible en salidas dentro de la transacción (Evita Race Conditions)
        if (this.TIPOS_SALIDA.includes(tipo) && tipo !== 'transferencia' && stockAnterior < cantidad) {
          throw new ConflictException(
            `Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${cantidad}`,
          );
        }

        let stockPosterior: number;

        // 2. Calcular nuevo stock según tipo
        if (this.TIPOS_ENTRADA.includes(tipo) && tipo !== 'transferencia') {
          stockPosterior = stockAnterior + cantidad;
        } else if (this.TIPOS_SALIDA.includes(tipo) && tipo !== 'transferencia') {
          stockPosterior = stockAnterior - cantidad;
        } else {
          // Ajuste directo (cantidad puede representar variación relativa)
          stockPosterior = stockAnterior + cantidad;
        }

        if (stockPosterior < 0) {
          throw new BadRequestException('El stock resultante no puede ser negativo');
        }

        // 3. Actualizar stock
        await tx.stockActual.update({
          where: { id_producto_id_almacen: { id_producto, id_almacen } },
          data: { cantidad: stockPosterior },
        });

        // 4. Registrar movimiento
        const movimiento = await tx.inventarioMovimiento.create({
          data: {
            id_producto,
            id_almacen,
            tipo,
            origen,
            cantidad,
            stock_anterior: stockAnterior,
            stock_posterior: stockPosterior,
            costo_unitario: costo_unitario
              ? new Prisma.Decimal(costo_unitario.toFixed(2))
              : null,
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
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
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
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad a transferir debe ser mayor a 0');
    }

    if (id_almacen_origen === id_almacen_destino) {
      throw new BadRequestException('El almacén de origen y destino deben ser diferentes');
    }

    const [producto, almacenOrigen, almacenDestino] = await Promise.all([
      this.prisma.producto.findUnique({
        where: { id_producto, deleted_at: null },
        select: { id_producto: true },
      }),
      this.prisma.almacen.findUnique({
        where: { id_almacen: id_almacen_origen },
        select: { id_almacen: true },
      }),
      this.prisma.almacen.findUnique({
        where: { id_almacen: id_almacen_destino },
        select: { id_almacen: true },
      }),
    ]);

    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!almacenOrigen) throw new NotFoundException('Almacén de origen no encontrado');
    if (!almacenDestino) throw new NotFoundException('Almacén de destino no encontrado');

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Validar stock disponible en origen dentro de la transacción
        const stockOrigen = await tx.stockActual.findUnique({
          where: { id_producto_id_almacen: { id_producto, id_almacen: id_almacen_origen } },
        });
        const stockActualOrigen = stockOrigen?.cantidad ?? 0;

        if (stockActualOrigen < cantidad) {
          throw new ConflictException(
            `Stock insuficiente en almacén de origen. Disponible: ${stockActualOrigen}, Solicitado: ${cantidad}`,
          );
        }

        // 1. SALIDA en Origen
        const stockPosteriorOrigen = stockActualOrigen - cantidad;
        await tx.stockActual.update({
          where: { id_producto_id_almacen: { id_producto, id_almacen: id_almacen_origen } },
          data: { cantidad: stockPosteriorOrigen },
        });

        const salida = await tx.inventarioMovimiento.create({
          data: {
            id_producto,
            id_almacen: id_almacen_origen,
            tipo: 'salida',
            origen: 'transferencia',
            cantidad,
            stock_anterior: stockActualOrigen,
            stock_posterior: stockPosteriorOrigen,
            observaciones: `Transferencia a almacén ID ${id_almacen_destino}: ${observaciones ?? ''}`,
            id_usuario,
          },
          select: this.selectMovimientoFields(),
        });

        // 2. ENTRADA en Destino
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
            tipo: 'entrada',
            origen: 'transferencia',
            cantidad,
            stock_anterior: stockActualDestino,
            stock_posterior: stockPosteriorDestino,
            id_referencia: salida.id_movimiento,
            tipo_referencia: 'inventario_movimiento',
            observaciones: `Transferencia desde almacén ID ${id_almacen_origen}: ${observaciones ?? ''}`,
            id_usuario,
          },
          select: this.selectMovimientoFields(),
        });

        // Vincular la salida con la entrada creada
        await tx.inventarioMovimiento.update({
          where: { id_movimiento: salida.id_movimiento },
          data: {
            id_referencia: entrada.id_movimiento,
            tipo_referencia: 'inventario_movimiento',
          },
        });

        // Evaluar alertas en ambos almacenes
        await this.checkStockAlert(tx, id_producto, id_almacen_origen, stockPosteriorOrigen);
        await this.checkStockAlert(tx, id_producto, id_almacen_destino, stockPosteriorDestino);

        return {
          salida: this.mapMovimiento(salida),
          entrada: this.mapMovimiento(entrada),
        };
      });
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw error;
    }
  }

  // --- NUEVO: Consulta general de movimientos paginados ---
  async getMovimientos(filters: {
    id_producto?: number;
    id_almacen?: number;
    tipo?: TipoMovimiento;
    origen?: OrigenMovimiento;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedMovimientosResponse> {
    const { id_producto, id_almacen, tipo, origen, fecha_inicio, fecha_fin, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InventarioMovimientoWhereInput = {};
    if (id_producto) where.id_producto = id_producto;
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
        select: this.selectMovimientoFields(),
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.inventarioMovimiento.count({ where }),
    ]);

    return {
      data: data.map(m => this.mapMovimiento(m)),
      total,
      page,
      limit,
    };
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

    const where: Prisma.InventarioMovimientoWhereInput = { id_producto };
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

    const mappedData = data.map((m) => ({
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
  ): Promise<
    Array<{
      id_producto: number;
      codigo: string;
      descripcion: string;
      id_almacen: number;
      almacen_codigo: string;
      almacen_nombre: string;
      cantidad: number;
      stock_minimo: number;
      estado: 'normal' | 'bajo_minimo' | 'sin_stock';
    }>
  > {
    const { id_producto, id_almacen, soloBajoMinimo } = filters;

    const whereStock: Prisma.StockActualWhereInput = {};
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

    return stockData
      .map((s) => {
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
      })
      .filter((s) => !soloBajoMinimo || s.estado !== 'normal');
  }

  // --- NUEVO: Obtener y gestionar Alertas de Stock ---
  async getAlertasStock(estado: 'activa' | 'resuelta' = 'activa') {
    return this.prisma.alertas_stock.findMany({
      where: { estado },
      include: {
        productos: { select: { codigo: true, descripcion: true } }, // <--- 'productos' en lugar de 'producto'
        almacenes: { select: { codigo: true, nombre: true } },     // <--- verifica si 'almacenes' o 'almacen'
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async reconocerAlerta(id_alerta: number) {
    const alerta = await this.prisma.alertas_stock.findUnique({ where: { id_alerta } });
    if (!alerta) throw new NotFoundException('Alerta no encontrada');

    return this.prisma.alertas_stock.update({
      where: { id_alerta },
      data: { 
        reconocida_at: new Date(),
        estado: 'resuelta'
      },
    });
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
      await tx.alertas_stock.updateMany({
        where: { id_producto, id_almacen, estado: 'activa' },
        data: { estado: 'resuelta', reconocida_at: new Date() },
      });
    }
  }

  private selectMovimientoFields() {
    return {
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
    };
  }

  private mapMovimiento(m: any): MovimientoResponse {
    return {
      ...m,
      costo_unitario: m.costo_unitario?.toNumber() ?? null,
    };
  }
}
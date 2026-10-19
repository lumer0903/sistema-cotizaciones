import { AlertsQueryDto, MovementFilterDto, MovementsQueryDto, StockQueryDto } from '../../common/dto/inventory-query.dto';
import { movementWhere, csvText } from '../../common/utils/inventory-query.util';
import { bloquearProducto, sincronizarStock } from '../../common/utils/stock.util';
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
  almacen: string | null;
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

    if (tipo === 'transferencia' || origen === 'transferencia') throw new BadRequestException('Use el endpoint de transferencia entre almacenes');
    if (!Number.isInteger(cantidad) || cantidad === 0 || (tipo !== 'ajuste' && cantidad < 0)) {
      throw new BadRequestException('La cantidad del movimiento debe ser mayor a 0');
    }

    const permitidos: Record<string,string[]> = {
      entrada:['compra','devolucion_cliente','ajuste_fisico'],
      salida:['venta','merma','cotizacion_aprobada','ajuste_fisico'], ajuste:['ajuste_fisico'],
    };
    if (!permitidos[tipo]?.includes(origen)) throw new BadRequestException('Tipo y origen de movimiento incompatibles');

    // Validar existencia de producto y almacén en paralelo fuera de la transacción
    const [producto, almacen] = await Promise.all([
      this.prisma.producto.findUnique({
        where: { id_producto, deleted_at: null },
        select: { id_producto: true },
      }),
      this.prisma.almacen.findUnique({
        where: { id_almacen },
        select: { id_almacen: true, activo: true },
      }),
    ]);

    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!almacen?.activo) throw new NotFoundException('Almacén no encontrado');

    try {
      return await this.prisma.$transaction(async (tx) => {
        await bloquearProducto(tx, id_producto);
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
        if (this.TIPOS_SALIDA.includes(tipo) && stockAnterior < cantidad) {
          throw new ConflictException(
            `Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${cantidad}`,
          );
        }

        let stockPosterior: number;

        // 2. Calcular nuevo stock según tipo
        if (this.TIPOS_ENTRADA.includes(tipo)) {
          stockPosterior = stockAnterior + cantidad;
        } else if (this.TIPOS_SALIDA.includes(tipo)) {
          stockPosterior = stockAnterior - cantidad;
        } else {
          // Ajuste directo (cantidad puede representar variación relativa)
          stockPosterior = stockAnterior + cantidad;
        }

        if(stockPosterior>2147483647)throw new BadRequestException("Stock supera la capacidad admitida");
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
            costo_unitario: costo_unitario != null
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

        await sincronizarStock(tx, id_producto);
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
        select: { id_almacen: true, activo: true },
      }),
      this.prisma.almacen.findUnique({
        where: { id_almacen: id_almacen_destino },
        select: { id_almacen: true, activo: true },
      }),
    ]);

    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!almacenOrigen?.activo) throw new NotFoundException('Almacén de origen no encontrado');
    if (!almacenDestino?.activo) throw new NotFoundException('Almacén de destino no encontrado');

    try {
      return await this.prisma.$transaction(async (tx) => {
        await bloquearProducto(tx, id_producto);
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
        if(stockPosteriorDestino>2147483647)throw new BadRequestException("Stock supera la capacidad admitida");

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
        const salidaVinculada = await tx.inventarioMovimiento.update({
          where: { id_movimiento: salida.id_movimiento },
          data: {
            id_referencia: entrada.id_movimiento,
            tipo_referencia: 'inventario_movimiento',
          },
          select: this.selectMovimientoFields(),
        });

        // Evaluar alertas en ambos almacenes

        await sincronizarStock(tx, id_producto);
        return {
          salida: this.mapMovimiento(salidaVinculada),
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

  async getMovimientos(filters: MovementsQueryDto = new MovementsQueryDto()): Promise<PaginatedMovimientosResponse> {
    const where = movementWhere(filters);
    const [data,total] = await this.prisma.$transaction([
      this.prisma.inventarioMovimiento.findMany({where,select:this.selectMovimientoFields(),
        skip:(filters.page-1)*filters.limit,take:filters.limit,
        orderBy:[{created_at:'desc'},{id_movimiento:'desc'}]}),
      this.prisma.inventarioMovimiento.count({where}),
    ],{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
    return {data:data.map(m=>this.mapMovimiento(m)),total,page:filters.page,limit:filters.limit};
  }
  async getKardex(id_producto: number, filters: MovementsQueryDto = new MovementsQueryDto()) {
    const product=await this.prisma.producto.findFirst({where:{id_producto,deleted_at:null},select:{id_producto:true}});
    if(!product)throw new NotFoundException('Producto no encontrado');
    const result=await this.getMovimientos({...filters,id_producto});
    return {...result,data:result.data.map(m=>this.mapKardex(m))};
  }
  private mapKardex(m: MovimientoResponse): KardexResponse {
    return {id_movimiento:m.id_movimiento,fecha:m.created_at,tipo:m.tipo,origen:m.origen,
      cantidad:m.cantidad,stock_anterior:m.stock_anterior,stock_posterior:m.stock_posterior,
      costo_unitario:m.costo_unitario,observaciones:m.observaciones,
      referencia:m.tipo_referencia && m.id_referencia ? m.tipo_referencia+':'+m.id_referencia:null,
      almacen:m.almacen?m.almacen.codigo+' - '+m.almacen.nombre:null,usuario:m.usuario?.nombre??null};
  }
  /** Historial inmutable: marca de agua de ID y cursor, sin cargar todo en memoria. */
  async *exportKardex(id_producto: number, filters: MovementFilterDto) {
    const where=movementWhere({...filters,id_producto});
    const product=await this.prisma.producto.findFirst({where:{id_producto,deleted_at:null},select:{id_producto:true}});
    if(!product) throw new NotFoundException('Producto no encontrado');
    const highest=await this.prisma.inventarioMovimiento.aggregate({where,_max:{id_movimiento:true}});
    const high=highest._max.id_movimiento??0;
    let cursor=0;
    yield '\uFEFFFecha,Tipo,Origen,Almacen,Cantidad,Stock Anterior,Stock Posterior,Costo Unitario,Referencia,Usuario,Observaciones\r\n';
    while(cursor<high){
      const rows=await this.prisma.inventarioMovimiento.findMany({where:{...where,id_movimiento:{gt:cursor,lte:high}},
        select:this.selectMovimientoFields(),take:500,orderBy:{id_movimiento:'asc'}});
      if(!rows.length) break;
      yield rows.map(row=>{
        const m=this.mapKardex(this.mapMovimiento(row));
        return [csvText(m.fecha.toISOString()),csvText(m.tipo),csvText(m.origen),csvText(m.almacen),
          m.cantidad,m.stock_anterior,m.stock_posterior,m.costo_unitario??'',csvText(m.referencia),
          csvText(m.usuario),csvText(m.observaciones)].join(',');
      }).join('\r\n')+'\r\n';
      cursor=rows[rows.length-1].id_movimiento;
    }
  }
  async getStockActual(q: StockQueryDto = new StockQueryDto()) {
    const product=q.id_producto??null,warehouse=q.id_almacen??null,onlyLow=q.soloBajoMinimo??false;
    const base=Prisma.sql`FROM stock_actual s JOIN productos p ON p.id_producto=s.id_producto
      JOIN almacenes a ON a.id_almacen=s.id_almacen WHERE p.deleted_at IS NULL
      AND (${product}::int IS NULL OR s.id_producto=${product}::int)
      AND (${warehouse}::int IS NULL OR s.id_almacen=${warehouse}::int)
      AND (NOT ${onlyLow}::boolean OR s.cantidad<=p.stock_minimo)`;
    return this.prisma.$transaction(async tx=>{
      const counts=await tx.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT count(*) AS total ${base}`);
      const data=await tx.$queryRaw<Array<{
        id_producto:number;codigo:string;descripcion:string;id_almacen:number;
        almacen_codigo:string;almacen_nombre:string;cantidad:number;stock_minimo:number;
        estado:'normal'|'bajo_minimo'|'sin_stock';
      }>>(Prisma.sql`SELECT s.id_producto,p.codigo,p.descripcion,s.id_almacen,a.codigo AS almacen_codigo,
        a.nombre AS almacen_nombre,s.cantidad,p.stock_minimo,
        CASE WHEN s.cantidad=0 THEN 'sin_stock' WHEN s.cantidad<=p.stock_minimo THEN 'bajo_minimo' ELSE 'normal' END AS estado
        ${base} ORDER BY s.id_producto,s.id_almacen LIMIT ${q.limit} OFFSET ${(q.page-1)*q.limit}`);
      return {data,total:Number(counts[0].total),page:q.page,limit:q.limit};
    },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
  }
  async getAlertasStock(q: AlertsQueryDto = new AlertsQueryDto()) {
    const estado=q.estado??'abiertas';
    const where:Prisma.alertas_stockWhereInput={productos:{deleted_at:null},
      ...(estado==='todas'?{}:estado==='abiertas'?{estado:{in:['activa','reconocida']}}:{estado})};
    const [rows,total]=await this.prisma.$transaction([
      this.prisma.alertas_stock.findMany({where,take:q.limit,skip:(q.page-1)*q.limit,
        include:{productos:{select:{id_producto:true,codigo:true,descripcion:true}},
          almacenes:{select:{id_almacen:true,codigo:true,nombre:true}}},
        orderBy:[{created_at:'desc'},{id_alerta:'desc'}]}),
      this.prisma.alertas_stock.count({where}),
    ],{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
    return {data:rows.map(({productos,almacenes,...a})=>({...a,producto:productos,almacen:almacenes})),total,page:q.page,limit:q.limit};
  }
  async reconocerAlerta(id_alerta:number) {
    return this.prisma.$transaction(async tx=>{
      const a=await tx.alertas_stock.findUnique({where:{id_alerta}});
      if(!a) throw new NotFoundException('Alerta no encontrada');
      await bloquearProducto(tx,a.id_producto);
      const current=await tx.alertas_stock.findUniqueOrThrow({where:{id_alerta}});
      if(current.estado==='resuelta') throw new ConflictException('La alerta ya está resuelta');
      return tx.alertas_stock.update({where:{id_alerta},data:{estado:'reconocida',reconocida_at:new Date()}});
    });
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
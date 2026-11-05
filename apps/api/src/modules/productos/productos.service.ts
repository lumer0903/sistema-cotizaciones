import { ProductsQueryDto } from '../../common/dto/inventory-query.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { bloquearProducto, sincronizarStock } from '../../common/utils/stock.util';
import { guardarPreciosAuditados, PRICE_FIELDS } from '../../common/utils/precios.util';
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger, HttpException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { UpdatePreciosDto } from './dto/update-precios.dto';
import { CreateProductoDto } from './dto/create-producto.dto';
import { AiCacheRefreshService } from '../ai/infrastructure/ai-cache-refresh.service';
import { generarDescripcionProducto } from '@goldcontinent/shared/constants/descripcion';

/** Atributos que alimentan la descripción estructurada (TF-IDF). */
const ATRIBUTOS_DESCRIPCION = [
  'codigo',
  'tipo_flor',
  'material',
  'composicion',
  'presentacion',
  'follaje',
  'numero_cabezas',
  'tamano',
  'unidades_por_caja',
] as const;

function jsonToStringArray(value: Prisma.JsonValue | null): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return null;
}

export interface StockActualConAlmacen {
  id_almacen: number;
  cantidad: number;
  almacen: {
    id_almacen: number;
    codigo: string;
    nombre: string;
    ubicacion: string | null;
  };
}

export interface ProductoResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  tipo_flor: string | null;
  material: string | null;
  composicion: string | null;
  presentacion: string | null;
  numero_cabezas: number | null;
  tamano: string | null;
  follaje: string | null;
  colores_surtido: string[] | null;
  foto_url: string | null;
  activo: boolean;
  stock_principal: number;
  stock_total: number;
  stock_filtrado?: number;
  stock_minimo: number;
  unidades_por_caja: number;
  id_categoria: number | null;
  created_at: Date;
  updated_at: Date;
  categoria?: {
    id_categoria: number;
    nombre_categoria: string;
  } | null;
  precios?: {
    costo_normal: number;
    precio_unidad_normal: number;
    precio_docena_normal: number;
    precio_mayor_normal: number;
    costo_distribuidor: number;
    precio_unidad_dist: number;
    precio_docena_dist: number;
    precio_mayor_dist: number;
  } | null;
  stock_actual?: StockActualConAlmacen[] | null;
}

export interface PaginatedProductosResponse {
  data: ProductoResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface PreciosActualesResponse {
  id_producto: number;
  costo_normal: number;
  precio_unidad_normal: number;
  precio_docena_normal: number;
  precio_mayor_normal: number;
  costo_distribuidor: number;
  precio_unidad_dist: number;
  precio_docena_dist: number;
  precio_mayor_dist: number;
  updated_at: Date;
}

function toNumber(value: Decimal | number | null): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

interface ProductoWithRelations {
  id_producto: number;
  codigo: string;
  descripcion: string;
  tipo_flor: string | null;
  material: string | null;
  composicion: string | null;
  presentacion: string | null;
  numero_cabezas: number | null;
  tamano: string | null;
  follaje: string | null;
  colores_surtido: Prisma.JsonValue | null;
  foto_url: string | null;
  activo: boolean;
  stock_principal: number;
  stock_total: number;
  stock_minimo: number;
  unidades_por_caja: number;
  id_categoria: number | null;
  created_at: Date;
  updated_at: Date;
  categoria?: {
    id_categoria: number;
    nombre_categoria: string;
  } | null;
  precios_actuales?: {
    costo_normal: Decimal | number;
    precio_unidad_normal: Decimal | number;
    precio_docena_normal: Decimal | number;
    precio_mayor_normal: Decimal | number;
    costo_distribuidor: Decimal | number;
    precio_unidad_dist: Decimal | number;
    precio_docena_dist: Decimal | number;
    precio_mayor_dist: Decimal | number;
  } | null;
  stock_actual?: Array<{
    id_almacen: number;
    cantidad: number;
    almacen: {
      id_almacen: number;
      codigo: string;
      nombre: string;
      ubicacion: string | null;
    };
  }> | null;
}

function mapProducto(item: ProductoWithRelations): ProductoResponse {
  return {
    id_producto: item.id_producto,
    codigo: item.codigo,
    descripcion: item.descripcion,
    tipo_flor: item.tipo_flor,
    material: item.material,
    composicion: item.composicion,
    presentacion: item.presentacion,
    numero_cabezas: item.numero_cabezas,
    tamano: item.tamano,
    follaje: item.follaje,
    colores_surtido: jsonToStringArray(item.colores_surtido),
    foto_url: item.foto_url,
    activo: item.activo,
    stock_principal: item.stock_principal,
    stock_total: item.stock_total,
    stock_minimo: item.stock_minimo,
    unidades_por_caja: item.unidades_por_caja,
    id_categoria: item.id_categoria,
    created_at: item.created_at,
    updated_at: item.updated_at,
    categoria: item.categoria ?? null,
    precios: item.precios_actuales ? {
      costo_normal: toNumber(item.precios_actuales.costo_normal),
      precio_unidad_normal: toNumber(item.precios_actuales.precio_unidad_normal),
      precio_docena_normal: toNumber(item.precios_actuales.precio_docena_normal),
      precio_mayor_normal: toNumber(item.precios_actuales.precio_mayor_normal),
      costo_distribuidor: toNumber(item.precios_actuales.costo_distribuidor),
      precio_unidad_dist: toNumber(item.precios_actuales.precio_unidad_dist),
      precio_docena_dist: toNumber(item.precios_actuales.precio_docena_dist),
      precio_mayor_dist: toNumber(item.precios_actuales.precio_mayor_dist),
    } : null,
    stock_actual: item.stock_actual ?? null,
  };
}

@Injectable()
export class ProductosService {
  private readonly logger = new Logger(ProductosService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly aiCacheRefresh: AiCacheRefreshService,
  ) { }

  // Compatibilidad para consumidores internos; el controlador usa el DTO completo.
  async findAll(page=1,limit=50,search?:string,stock_status?:string,includePrecios=false,includeCategoria=false,includeStockActual=false) {
    return this.findAllFiltered({page,limit,search,
      stock_status:stock_status as ProductsQueryDto['stock_status'],
      include:[includePrecios?'precios':'',includeCategoria?'categoria':'',includeStockActual?'stock':''].filter(Boolean).join(',') || undefined});
  }
  async findAllFiltered(q: ProductsQueryDto): Promise<PaginatedProductosResponse> {
    const centroAlmacen = await this.prisma.almacen.findFirst({ where: { codigo: 'ALM-001', activo: true }, select: { id_almacen: true } });
    const centroId = centroAlmacen?.id_almacen ?? 1;
    const warehouse = q.id_almacen ?? centroId;
    const category = q.id_categoria ?? null;
    const active = q.activo ?? null;
    const pattern = q.search?.trim() ? '%' + q.search.trim().replace(/[\\%_]/g, '\\$&') + '%' : null;
    const scoped = Prisma.sql`
      SELECT p.id_producto, p.created_at, p.stock_minimo,
        CASE WHEN ${warehouse}::int IS NULL THEN p.stock_total ELSE COALESCE(s.cantidad, 0) END AS stock_scope
      FROM productos p
      LEFT JOIN stock_actual s ON s.id_producto = p.id_producto AND s.id_almacen = ${warehouse}::int
      WHERE p.deleted_at IS NULL
        AND (${category}::int IS NULL OR p.id_categoria = ${category}::int)
        AND (${active}::boolean IS NULL OR p.activo = ${active}::boolean)
        AND (${pattern}::text IS NULL OR p.codigo ILIKE ${pattern}::text OR p.descripcion ILIKE ${pattern}::text)
    `;
    const condition = q.stock_status === 'agotado' ? Prisma.sql`stock_scope = 0`
      : q.stock_status === 'bajo' ? Prisma.sql`stock_scope > 0 AND stock_scope <= stock_minimo`
      : q.stock_status === 'disponible' ? Prisma.sql`stock_scope > stock_minimo` : Prisma.sql`TRUE`;
    const order = q.sortBy === 'stock_estado'
      ? (q.sortOrder === 'desc' ? Prisma.sql`(stock_scope <= stock_minimo) ASC, stock_scope DESC, created_at DESC, id_producto DESC` : Prisma.sql`(stock_scope <= stock_minimo) DESC, stock_scope ASC, created_at DESC, id_producto DESC`)
      : q.sortOrder === 'asc' ? Prisma.sql`created_at ASC, id_producto ASC` : Prisma.sql`created_at DESC, id_producto DESC`;
    const includes = new Set(q.include?.split(',') ?? []);
    return this.prisma.$transaction(async (tx) => {
      const counts = await tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`WITH scoped AS (${scoped}) SELECT count(*) AS total FROM scoped WHERE ${condition}`);
      if ((q.page - 1) * q.limit >= Number(counts[0].total)) return { data: [], total: Number(counts[0].total), page: q.page, limit: q.limit };
      const rows = await tx.$queryRaw<Array<{ id_producto: number; stock_scope: number }>>(Prisma.sql`
        WITH scoped AS (${scoped}) SELECT id_producto, stock_scope FROM scoped WHERE ${condition}
        ORDER BY ${order} LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`);
      const where = { id_producto: { in: rows.map(r => r.id_producto) } };
      const include: any = {
        categoria: includes.has('categoria'),
        precios_actuales: includes.has('precios'),
      };
      if (includes.has('stock')) {
        include.stock_actual = {
          where: { id_almacen: warehouse },
          include: { almacen: true },
        };
      }
      const products = await tx.producto.findMany({ where, include });
      const byId = new Map(products.map(p => [p.id_producto, p]));
      return { data: rows.map(r => ({ ...mapProducto(byId.get(r.id_producto)!), stock_filtrado: r.stock_scope })), total: Number(counts[0].total), page: q.page, limit: q.limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async findById(id: number, includePrecios = false, includeCategoria = false, includeStockActual = false): Promise<ProductoResponse> {
    const include: any = {};
    if (includeCategoria) {
      include.categoria = {
        select: {
          id_categoria: true,
          nombre_categoria: true,
        },
      };
    }
    if (includePrecios) {
      include.precios_actuales = {
        select: {
          costo_normal: true,
          precio_unidad_normal: true,
          precio_docena_normal: true,
          precio_mayor_normal: true,
          costo_distribuidor: true,
          precio_unidad_dist: true,
          precio_docena_dist: true,
          precio_mayor_dist: true,
        },
      };
    }
    if (includeStockActual) {
      include.stock_actual = {
        select: {
          id_almacen: true,
          cantidad: true,
          almacen: {
            select: {
              id_almacen: true,
              codigo: true,
              nombre: true,
              ubicacion: true,
            },
          },
        },
      };
    }

    const item = await this.prisma.producto.findUnique({
      where: { id_producto: id, deleted_at: null },
      select: {
        id_producto: true,
        codigo: true,
        descripcion: true,
        tipo_flor: true,
        material: true,
        composicion: true,
          presentacion: true,
          follaje: true,
          numero_cabezas: true,
          tamano: true,
          colores_surtido: true,
          foto_url: true,
          activo: true,
          stock_principal: true,
          stock_total: true,
          stock_minimo: true,
          unidades_por_caja: true,
          id_categoria: true,
          created_at: true,
          updated_at: true,
          ...include,
      },
    });

    if (!item) throw new NotFoundException('Producto no encontrado');

    return mapProducto(item as unknown as ProductoWithRelations);
  }

  async create(data: CreateProductoDto, actorId: number): Promise<ProductoResponse> {
    // Descripción estructurada: la enviada por el cliente (generada con el mismo
    // helper) o, si no viene, la calcula aquí para garantizar el formato del TF-IDF.
    const descripcionGenerada = data.descripcion?.trim()
      ? data.descripcion.trim()
      : generarDescripcionProducto({
          codigo: data.codigo,
          tipo_flor: data.tipo_flor,
          material: data.material,
          composicion: data.composicion,
          presentacion: data.presentacion,
          follaje: data.follaje,
          numero_cabezas: data.numero_cabezas,
          tamano: data.tamano,
          unidades_por_caja: data.unidades_por_caja,
        });
    if (data.foto_url?.startsWith('data:')) throw new BadRequestException('Suba la imagen con /productos/upload');
    const stockTotal = data.stock_principal;

    try {
      const creado = await this.prisma.$transaction(async (tx) => {
        const almacenPrincipal = await tx.almacen.findUnique({where:{id_almacen:data.id_almacen}});
        if (!almacenPrincipal?.activo) throw new BadRequestException('Almacén no disponible');

        const producto = await tx.producto.create({
          data: {
            codigo: data.codigo,
            descripcion: descripcionGenerada,
            tipo_flor: data.tipo_flor,
            material: data.material,
            composicion: data.composicion,
            presentacion: data.presentacion,
            follaje: data.follaje,
            numero_cabezas: data.numero_cabezas,
            tamano: data.tamano,
            colores_surtido: data.colores_surtido,
            foto_url: data.foto_url,
            activo: true,
            stock_principal: data.stock_principal,
            stock_total: stockTotal,
            stock_minimo: data.stock_minimo,
            unidades_por_caja: data.unidades_por_caja,
            id_categoria: data.id_categoria,
          },
          select: {
            id_producto: true,
            codigo: true,
            descripcion: true,
            tipo_flor: true,
            material: true,
            composicion: true,
            presentacion: true,
            follaje: true,
            numero_cabezas: true,
            tamano: true,
            colores_surtido: true,
            foto_url: true,
            activo: true,
            stock_principal: true,
            stock_total: true,
            stock_minimo: true,
            unidades_por_caja: true,
            id_categoria: true,
            created_at: true,
            updated_at: true,
          },
        });

        await guardarPreciosAuditados(tx,producto.id_producto,{
costo_normal: Number(data.costo_normal ?? 0),
            precio_unidad_normal: Number(data.precio_tienda_unidad),
            precio_docena_normal: Number(data.precio_tienda_docena),
            precio_mayor_normal: Number(data.precio_tienda_caja),
            costo_distribuidor: Number(data.costo_distribuidor ?? 0),
            precio_unidad_dist: Number(data.precio_distribuidor_unidad),
            precio_docena_dist: Number(data.precio_distribuidor_docena),
            precio_mayor_dist: Number(data.precio_distribuidor_caja),
        },actorId,'Creación de producto');

        await tx.stockActual.create({
          data: {
            id_producto: producto.id_producto,
            id_almacen: almacenPrincipal.id_almacen,
            cantidad: data.stock_principal,
          },
        });

        if (data.stock_principal > 0) await tx.inventarioMovimiento.create({
          data: {
            id_usuario: actorId,
            id_producto: producto.id_producto,
            id_almacen: almacenPrincipal.id_almacen,
            tipo: 'entrada',
            origen: 'ajuste_fisico',
            cantidad: data.stock_principal,
            stock_anterior: 0,
            stock_posterior: data.stock_principal,
            observaciones: 'Stock inicial al crear producto',
          },
        });

        await sincronizarStock(tx, producto.id_producto);
        const refreshed = await tx.producto.findUniqueOrThrow({where:{id_producto:producto.id_producto}});
        return mapProducto(refreshed);
      });

      // Reentrenar TF-IDF con la nueva descripción (fire-and-forget, no bloquea)
      this.aiCacheRefresh.refreshCache(`create:${creado.id_producto}`);
      return creado;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El código del producto ya existe');
      }
      if(error.code==='P2003') throw new BadRequestException('Categoría, almacén o usuario no válido');
      throw error;
    }
  }

  async update(id: number, data: UpdateProductoDto, actorId: number): Promise<ProductoResponse> {
    try {
      // 1. Separar campos de precios y relacionales de los campos propios del Producto
      const {
        precio_tienda_unidad,
        precio_tienda_docena,
        precio_tienda_caja,
        precio_distribuidor_unidad,
        precio_distribuidor_docena,
        precio_distribuidor_caja,
        costo_normal,
        costo_distribuidor,
        ...productoData
      } = data;

      if (productoData.codigo) {
        const existe = await this.prisma.producto.findFirst({
          where: {
            codigo: productoData.codigo,
            NOT: { id_producto: id },
          },
        });
        if (existe) throw new ConflictException('El código del producto ya existe');
      }

      const item = await this.prisma.$transaction(async (tx) => {
      await bloquearProducto(tx, id);
      const productoActual = await tx.producto.findUnique({
        where: { id_producto: id },
        select: {
          stock_principal: true,
          codigo: true,
          tipo_flor: true,
          material: true,
          composicion: true,
          presentacion: true,
          follaje: true,
          numero_cabezas: true,
          tamano: true,
          unidades_por_caja: true,
        },
      });
      if (!productoActual) throw new NotFoundException('Producto no encontrado');

      // 1b. Si cambió algún atributo que alimenta la descripción, regenerarla con
      //     el mismo helper del formulario (formato estructurado del TF-IDF).
      const cambioAtributo = ATRIBUTOS_DESCRIPCION.some((campo) => {
        const nuevo = (productoData as Record<string, unknown>)[campo];
        return (
          nuevo !== undefined &&
          String(nuevo ?? '') !== String((productoActual as Record<string, unknown>)[campo] ?? '')
        );
      });
      if (cambioAtributo) {
        productoData.descripcion = generarDescripcionProducto({
          codigo: productoData.codigo ?? productoActual.codigo,
          tipo_flor: productoData.tipo_flor ?? productoActual.tipo_flor,
          material: productoData.material ?? productoActual.material,
          composicion: productoData.composicion ?? productoActual.composicion,
          presentacion: productoData.presentacion ?? productoActual.presentacion,
          follaje: productoData.follaje ?? productoActual.follaje,
          numero_cabezas: productoData.numero_cabezas ?? productoActual.numero_cabezas,
          tamano: productoData.tamano ?? productoActual.tamano,
          unidades_por_caja: productoData.unidades_por_caja ?? productoActual.unidades_por_caja,
        });
      }

      const principal = await tx.stockActual.findFirst({
        where: { id_producto: id, almacen: { codigo: 'ALM-001' } }, select: { cantidad: true },
      });
      const stockAnterior = principal?.cantidad ?? 0;
      const stockNuevo = productoData.stock_principal !== undefined
        ? Number(productoData.stock_principal)
        : stockAnterior;
      const stockCambio = stockNuevo !== stockAnterior;

      const almacenPrincipal = await tx.almacen.findFirst({
        where: { codigo: 'ALM-001' },
      });

        if (stockCambio && !almacenPrincipal) throw new NotFoundException('Almacén principal no encontrado');

        // 2. Actualizar únicamente la tabla Producto
        const updated = await tx.producto.update({
          where: { id_producto: id },
          data: {
            ...productoData,
            stock_principal: stockNuevo,

          },
          select: {
            id_producto: true,
            codigo: true,
            descripcion: true,
            tipo_flor: true,
            material: true,
            composicion: true,
            presentacion: true,
            follaje: true,
            numero_cabezas: true,
            tamano: true,
            colores_surtido: true,
            foto_url: true,
            activo: true,
            stock_principal: true,
            stock_total: true,
            stock_minimo: true,
            unidades_por_caja: true,
            id_categoria: true,
            created_at: true,
            updated_at: true,
          },
        });

        // 3. Mapear y actualizar la tabla preciosActuales si se enviaron precios
        const updatePreciosData: Record<string, number> = {};
        if (precio_tienda_unidad !== undefined) updatePreciosData.precio_unidad_normal = Number(precio_tienda_unidad);
        if (precio_tienda_docena !== undefined) updatePreciosData.precio_docena_normal = Number(precio_tienda_docena);
        if (precio_tienda_caja !== undefined) updatePreciosData.precio_mayor_normal = Number(precio_tienda_caja);
        if (precio_distribuidor_unidad !== undefined) updatePreciosData.precio_unidad_dist = Number(precio_distribuidor_unidad);
        if (precio_distribuidor_docena !== undefined) updatePreciosData.precio_docena_dist = Number(precio_distribuidor_docena);
        if (precio_distribuidor_caja !== undefined) updatePreciosData.precio_mayor_dist = Number(precio_distribuidor_caja);
        if (costo_normal !== undefined) updatePreciosData.costo_normal = Number(costo_normal);
        if (costo_distribuidor !== undefined) updatePreciosData.costo_distribuidor = Number(costo_distribuidor);

        await guardarPreciosAuditados(tx, id, updatePreciosData, actorId);

        // 4. Ajuste de stock e historial de movimientos si cambió el stock
        if (stockCambio && almacenPrincipal) {
          await tx.stockActual.upsert({
            where: { id_producto_id_almacen: { id_producto: id, id_almacen: almacenPrincipal.id_almacen } },
            create: { id_producto: id, id_almacen: almacenPrincipal.id_almacen, cantidad: stockNuevo },
            update: { cantidad: stockNuevo },
          });

          const diferencia = stockNuevo - stockAnterior;
          await tx.inventarioMovimiento.create({
            data: {
              id_producto: id,
              id_almacen: almacenPrincipal.id_almacen,
              tipo: diferencia > 0 ? 'entrada' : 'salida',
              origen: 'ajuste_fisico',
              cantidad: Math.abs(diferencia),
              stock_anterior: stockAnterior,
              stock_posterior: stockNuevo,
              id_usuario: actorId,
              observaciones: `Ajuste de stock: ${diferencia > 0 ? '+' : ''}${diferencia}`,
            },
          });
        }

        await sincronizarStock(tx, id);
        return tx.producto.findUniqueOrThrow({ where: { id_producto: updated.id_producto } });
      });

      // Reentrenar TF-IDF con la descripción actualizada (fire-and-forget)
      this.aiCacheRefresh.refreshCache(`update:${id}`);

      return mapProducto({
        ...item,
        categoria: null,
        precios_actuales: null,
        stock_actual: null,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Producto no encontrado');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('El código del producto ya existe');
      }
      this.logger.error(`Error en update producto ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await bloquearProducto(tx,id);
      await tx.producto.update({where:{id_producto:id},data:{deleted_at:new Date()}});
      await tx.alertas_stock.updateMany({where:{id_producto:id},data:{estado:'resuelta'}});
    });
  }

  async updatePrecios(
    id: number,
    data: UpdatePreciosDto,
    id_usuario: number,
  ): Promise<PreciosActualesResponse> {
    const producto = await this.prisma.producto.findUnique({
      where: { id_producto: id, deleted_at: null },
      select: { id_producto: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const fields = PRICE_FIELDS.filter(field => data[field] !== undefined);
    if (fields.length === 0) throw new BadRequestException('Al menos un precio es requerido');

    try {
      return await this.prisma.$transaction(async (tx) => {
        await bloquearProducto(tx, id);
        await guardarPreciosAuditados(tx, id, data, id_usuario);
        const updated = await tx.preciosActuales.findUnique({
          where: { id_producto: id },
        });

        if (!updated) {
          throw new InternalServerErrorException('Error al actualizar precios: no se encontró el registro actualizado');
        }

        return {
          id_producto: id,
          costo_normal: updated!.costo_normal.toNumber(),
          precio_unidad_normal: updated!.precio_unidad_normal.toNumber(),
          precio_docena_normal: updated!.precio_docena_normal.toNumber(),
          precio_mayor_normal: updated!.precio_mayor_normal.toNumber(),
          costo_distribuidor: updated!.costo_distribuidor.toNumber(),
          precio_unidad_dist: updated!.precio_unidad_dist.toNumber(),
          precio_docena_dist: updated!.precio_docena_dist.toNumber(),
          precio_mayor_dist: updated!.precio_mayor_dist.toNumber(),
          updated_at: updated!.updated_at,
        };
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Producto no encontrado');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Error de referencia: usuario inválido para auditoría');
      }
      if (error instanceof HttpException) throw error;
      const err = error as Error;
      this.logger.error(`Error updating prices for product ${id}: ${err.message}`, err.stack);
      throw new InternalServerErrorException('No se pudieron actualizar los precios');
    }
  }
}
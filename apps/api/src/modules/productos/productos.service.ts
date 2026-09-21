import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { UpdatePreciosDto } from './dto/update-precios.dto';
import { CreateProductoDto } from './dto/create-producto.dto';

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
  colores_surtido: string[] | null;
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
  ) { }

  async findAll(
    page = 1,
    limit = 50,
    search?: string,
    stock_status?: string,
    includePrecios = false,
    includeCategoria = false,
    includeStockActual = false,
  ): Promise<PaginatedProductosResponse> {
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null };

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (stock_status) {
      if (stock_status === 'agotado') {
        where.stock_total = { lte: 0 };
      } else if (stock_status === 'bajo') {
        where.stock_total = { gt: 0, lte: 20 };
      } else if (stock_status === 'disponible') {
        where.stock_total = { gt: 20 };
      }
    }

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

    try {
      const [data, total] = await Promise.all([
        this.prisma.producto.findMany({
          where,
          select: {
            id_producto: true,
            codigo: true,
            descripcion: true,
            tipo_flor: true,
            material: true,
            composicion: true,
            presentacion: true,
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
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.producto.count({ where }),
      ]);

      const mappedData = data.map(item => mapProducto(item as unknown as ProductoWithRelations));

      return { data: mappedData, total, page, limit };
    } catch (error: any) {
      this.logger.error(`Error en findAll productos: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al consultar el catálogo de productos');
    }
  }

  async findById(id: number, includePrecios = false, includeCategoria = false, includeStockActual = false): Promise<ProductoResponse | null> {
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

    if (!item) return null;

    return mapProducto(item as unknown as ProductoWithRelations);
  }

  async create(data: CreateProductoDto): Promise<ProductoResponse> {
    const partes = [
      data.presentacion,
      data.material ? `de ${data.material}` : null,
      data.numero_cabezas ? `${data.numero_cabezas} cabezas` : null,
      data.composicion,
      data.colores_surtido?.length ? `colores: ${(data.colores_surtido as string[]).join(', ')}` : null,
    ].filter(Boolean);

    const descripcionGenerada = partes.join(', ');
    const stockTotal = data.stock_principal;

    try {
      return await this.prisma.$transaction(async (tx) => {
        let almacenPrincipal = await tx.almacen.findFirst({
          where: { codigo: 'ALM-001' },
        });
        if (!almacenPrincipal) {
          almacenPrincipal = await tx.almacen.create({
            data: {
              codigo: 'ALM-001',
              nombre: 'ALMACÉN PRINCIPAL',
              ubicacion: 'Sede Central',
              activo: true,
            },
          });
        }

        const producto = await tx.producto.create({
          data: {
            codigo: data.codigo,
            descripcion: descripcionGenerada,
            tipo_flor: data.tipo_flor,
            material: data.material,
            composicion: data.composicion,
            presentacion: data.presentacion,
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

        let fotoUrl = data.foto_url;
        if (data.foto_url && data.foto_url.startsWith('data:')) {
          const base64Data = data.foto_url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeMatch = data.foto_url.match(/data:(image\/\w+);base64/);
          const mimetype = mimeMatch ? mimeMatch[1] : 'image/png';

          const fakeFile = {
            buffer,
            mimetype,
            originalname: `${data.codigo}.png`,
            size: buffer.length,
          } as Express.Multer.File;

          fotoUrl = await this.minio.uploadProductImage(fakeFile) ?? undefined;

          await tx.producto.update({
            where: { id_producto: producto.id_producto },
            data: { foto_url: fotoUrl },
          });
        }

        await tx.preciosActuales.create({
          data: {
            id_producto: producto.id_producto,
            costo_normal: Number(data.costo_normal ?? 0),
            precio_unidad_normal: Number(data.precio_tienda_unidad),
            precio_docena_normal: Number(data.precio_tienda_docena),
            precio_mayor_normal: Number(data.precio_tienda_caja),
            costo_distribuidor: Number(data.costo_distribuidor ?? 0),
            precio_unidad_dist: Number(data.precio_distribuidor_unidad),
            precio_docena_dist: Number(data.precio_distribuidor_docena),
            precio_mayor_dist: Number(data.precio_distribuidor_caja),
          },
        });

        await tx.stockActual.create({
          data: {
            id_producto: producto.id_producto,
            id_almacen: almacenPrincipal.id_almacen,
            cantidad: data.stock_principal,
          },
        });

        await tx.inventarioMovimiento.create({
          data: {
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

        return mapProducto({
          ...producto,
          foto_url: fotoUrl ?? null,
          categoria: null,
          precios_actuales: null,
          stock_actual: null,
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El código del producto ya existe');
      }
      throw error;
    }
  }

  async update(id: number, data: any): Promise<ProductoResponse> {
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
        id_almacen,
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

      const productoActual = await this.prisma.producto.findUnique({
        where: { id_producto: id },
        select: { stock_principal: true },
      });
      if (!productoActual) throw new NotFoundException('Producto no encontrado');

      const stockAnterior = productoActual.stock_principal;
      const stockNuevo = productoData.stock_principal !== undefined
        ? Number(productoData.stock_principal)
        : stockAnterior;
      const stockCambio = stockNuevo !== stockAnterior;

      const almacenPrincipal = await this.prisma.almacen.findFirst({
        where: { codigo: 'ALM-001' },
      });

      const item = await this.prisma.$transaction(async (tx) => {
        // 2. Actualizar únicamente la tabla Producto
        const updated = await tx.producto.update({
          where: { id_producto: id },
          data: {
            ...productoData,
            stock_principal: stockNuevo,
            stock_total: stockNuevo,
          },
          select: {
            id_producto: true,
            codigo: true,
            descripcion: true,
            tipo_flor: true,
            material: true,
            composicion: true,
            presentacion: true,
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

        if (Object.keys(updatePreciosData).length > 0) {
          await tx.preciosActuales.upsert({
            where: { id_producto: id },
            create: {
              id_producto: id,
              costo_normal: updatePreciosData.costo_normal ?? 0,
              precio_unidad_normal: updatePreciosData.precio_unidad_normal ?? 0,
              precio_docena_normal: updatePreciosData.precio_docena_normal ?? 0,
              precio_mayor_normal: updatePreciosData.precio_mayor_normal ?? 0,
              costo_distribuidor: updatePreciosData.costo_distribuidor ?? 0,
              precio_unidad_dist: updatePreciosData.precio_unidad_dist ?? 0,
              precio_docena_dist: updatePreciosData.precio_docena_dist ?? 0,
              precio_mayor_dist: updatePreciosData.precio_mayor_dist ?? 0,
            },
            update: updatePreciosData,
          });
        }

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
              observaciones: `Ajuste de stock: ${diferencia > 0 ? '+' : ''}${diferencia}`,
            },
          });
        }

        return updated;
      });

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
    try {
      await this.prisma.producto.update({
        where: { id_producto: id },
        data: { deleted_at: new Date() },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Producto no encontrado');
      }
      throw error;
    }
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

    const fields = Object.keys(data) as (keyof UpdatePreciosDto)[];
    if (fields.length === 0) throw new BadRequestException('Al menos un precio es requerido');

    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
      select: { id_usuario: true },
    });
    if (!usuario) {
      this.logger.warn(`Usuario ${id_usuario} no encontrado, usando usuario sistema (id: 1)`);
      const sistemaUser = await this.prisma.usuario.findFirst({
        select: { id_usuario: true },
      });
      if (sistemaUser) {
        id_usuario = sistemaUser.id_usuario;
      } else {
        throw new BadRequestException('No hay usuarios disponibles para auditoría');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.preciosActuales.findUnique({
          where: { id_producto: id },
        });

        const changes: { campo: string; anterior: number; nuevo: number }[] = [];
        const updateData: Record<string, number> = {};

        for (const campo of fields) {
          const nuevoValor = Number(data[campo]!);
          const anterior = current?.[campo]?.toNumber() ?? 0;

          if (nuevoValor !== anterior) {
            changes.push({ campo, anterior, nuevo: nuevoValor });
            updateData[campo] = nuevoValor;
          }
        }

        if (changes.length > 0) {
          await tx.preciosActuales.upsert({
            where: { id_producto: id },
            create: { id_producto: id, ...updateData },
            update: updateData,
          });

          await tx.historialPrecios.createMany({
            data: changes.map(c => ({
              id_producto: id,
              id_usuario,
              campo_modificado: c.campo,
              valor_anterior: new Prisma.Decimal(c.anterior.toFixed(2)),
              valor_nuevo: new Prisma.Decimal(c.nuevo.toFixed(2)),
            })),
          });
        }

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
      const err = error as Error;
      this.logger.error(`Error updating prices for product ${id}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Error al actualizar precios: ${err.message}`);
    }
  }
}
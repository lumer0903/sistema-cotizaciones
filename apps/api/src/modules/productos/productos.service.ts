import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface ProductoResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  foto_url: string | null;
  activo: boolean;
  stock_principal: number;
  stock_tacna: number;
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
}

export interface PaginatedProductosResponse {
  data: ProductoResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProductoDto {
  codigo: string;
  descripcion: string;
  foto_url?: string;
  activo?: boolean;
  stock_principal?: number;
  stock_tacna?: number;
  stock_minimo?: number;
  unidades_por_caja?: number;
  id_categoria?: number;
}

export interface UpdateProductoDto {
  codigo?: string;
  descripcion?: string;
  foto_url?: string | null;
  activo?: boolean;
  stock_principal?: number;
  stock_tacna?: number;
  stock_minimo?: number;
  unidades_por_caja?: number;
  id_categoria?: number | null;
}

function toNumber(value: Decimal | number | null): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

interface ProductoWithRelations {
  id_producto: number;
  codigo: string;
  descripcion: string;
  foto_url: string | null;
  activo: boolean;
  stock_principal: number;
  stock_tacna: number;
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
}

function mapProducto(item: ProductoWithRelations): ProductoResponse {
  return {
    id_producto: item.id_producto,
    codigo: item.codigo,
    descripcion: item.descripcion,
    foto_url: item.foto_url,
    activo: item.activo,
    stock_principal: item.stock_principal,
    stock_tacna: item.stock_tacna,
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
  };
}

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    search?: string,
    includePrecios = false,
    includeCategoria = false,
  ): Promise<PaginatedProductosResponse> {
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null };

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
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

    const [data, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        select: {
          id_producto: true,
          codigo: true,
          descripcion: true,
          foto_url: true,
          activo: true,
          stock_principal: true,
          stock_tacna: true,
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
  }

  async findById(id: number, includePrecios = false, includeCategoria = false): Promise<ProductoResponse | null> {
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

    const item = await this.prisma.producto.findUnique({
      where: { id_producto: id, deleted_at: null },
      select: {
        id_producto: true,
        codigo: true,
        descripcion: true,
        foto_url: true,
        activo: true,
        stock_principal: true,
        stock_tacna: true,
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
    const item = await this.prisma.producto.create({
      data: {
        codigo: data.codigo,
        descripcion: data.descripcion,
        foto_url: data.foto_url,
        activo: data.activo ?? true,
        stock_principal: data.stock_principal ?? 0,
        stock_tacna: data.stock_tacna ?? 0,
        stock_minimo: data.stock_minimo ?? 10,
        unidades_por_caja: data.unidades_por_caja ?? 1,
        id_categoria: data.id_categoria,
      },
      select: {
        id_producto: true,
        codigo: true,
        descripcion: true,
        foto_url: true,
        activo: true,
        stock_principal: true,
        stock_tacna: true,
        stock_total: true,
        stock_minimo: true,
        unidades_por_caja: true,
        id_categoria: true,
        created_at: true,
        updated_at: true,
      },
    });

    return mapProducto({
      ...item,
      categoria: null,
      precios_actuales: null,
    });
  }

  async update(id: number, data: UpdateProductoDto): Promise<ProductoResponse> {
    const item = await this.prisma.producto.update({
      where: { id_producto: id },
      data: {
        ...data,
        stock_total: data.stock_principal !== undefined || data.stock_tacna !== undefined
          ? (data.stock_principal ?? 0) + (data.stock_tacna ?? 0)
          : undefined,
      },
      select: {
        id_producto: true,
        codigo: true,
        descripcion: true,
        foto_url: true,
        activo: true,
        stock_principal: true,
        stock_tacna: true,
        stock_total: true,
        stock_minimo: true,
        unidades_por_caja: true,
        id_categoria: true,
        created_at: true,
        updated_at: true,
      },
    });

    return mapProducto({
      ...item,
      categoria: null,
      precios_actuales: null,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.producto.update({
      where: { id_producto: id },
      data: { deleted_at: new Date() },
    });
  }
}
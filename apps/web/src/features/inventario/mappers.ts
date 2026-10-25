import { ProductoInventario } from '@goldcontinent/shared/types/inventario';

/** Shape crudo del endpoint /productos (listado con includes). */
export interface ProductoAPI {
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
  id_categoria: number | null;
  categoria: { id_categoria: number; nombre_categoria: string } | null;
  stock_total: number;
  stock_filtrado?: number;
  stock_minimo: number;
  stock_principal: number;
  stock_tacna: number;
  foto_url: string | null;
  follaje?: string | null;
  activo: boolean;
  unidades_por_caja?: number;
  stock_actual: Array<{
    id_almacen: number;
    cantidad: number;
    almacen: { id_almacen: number; codigo: string; nombre: string; ubicacion: string | null };
  }>;
  precios?: Record<string, unknown> | null;
  precios_actuales?: Record<string, unknown> | null;
  costo_unidad_tienda?: unknown;
  costo_unidad_distribuidor?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
}

/** Convierte la respuesta de la API al modelo de inventario de la UI. */
export const mapToProductoInventario = (p: ProductoAPI): ProductoInventario => ({
  id_producto: p.id_producto,
  codigo: p.codigo,
  descripcion: p.descripcion,
  tipo_flor: p.tipo_flor,
  material: p.material,
  composicion: p.composicion,
  presentacion: p.presentacion,
  numero_cabezas: p.numero_cabezas,
  tamano: p.tamano,
  colores_surtido: p.colores_surtido,
  id_categoria: p.id_categoria,
  categoria: p.categoria,
  stock_total: p.stock_total,
  stock_filtrado: p.stock_filtrado,
  stock_minimo: p.stock_minimo,
  stock_principal: p.stock_principal,
  foto_url: p.foto_url,
  follaje: p.follaje ?? null,
  activo: p.activo,
  stock_actual:
    p.stock_actual?.map((s) => ({
      ...s,
      id_stock: 0,
      id_producto: p.id_producto,
      updated_at: new Date(),
      almacen: {
        ...s.almacen,
        codigo: s.almacen.codigo,
        activo: true,
      },
    })) || [],
  precios_actuales: (p.precios_actuales ?? p.precios ??
    null) as ProductoInventario['precios_actuales'],
  costo_unidad_tienda: (p.costo_unidad_tienda as any) ?? null,
  costo_unidad_distribuidor: (p.costo_unidad_distribuidor as any) ?? null,
  unidades_por_caja: p.unidades_por_caja ?? 1,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
});

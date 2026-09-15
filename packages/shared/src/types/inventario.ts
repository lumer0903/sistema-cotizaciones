import { Producto, PreciosActuales, StockActual, InventarioMovimiento, TipoMovimiento, OrigenMovimiento } from '@prisma/client';
import type { Categoria, Almacen } from './database';

export type { Categoria, Almacen };

export interface ProductoInventario extends Producto {
  tipo_flor: string | null;
  material: string | null;
  composicion: string | null;
  presentacion: string | null;
  numero_cabezas: number | null;
  tamano: string | null;
  colores_surtido: string[] | null;
  categoria: Categoria | null;
  precios_actuales: PreciosActuales | null;
  stock_actual: (StockActual & { almacen: Almacen })[];
}

export type TipoModal = 'CREAR' | 'EDITAR' | 'DETALLE' | 'KARDEX' | null;

export interface InventarioFilters {
  search: string;
  id_categoria: number | null;
  id_almacen: number | null;
  soloStockBajo: boolean;
  page: number;
  limit: number;
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

export interface PaginatedKardexResponse {
  data: KardexResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface MovimientoInventarioForm {
  id_producto: number;
  id_almacen: number;
  tipo: TipoMovimiento;
  origen: OrigenMovimiento;
  cantidad: number;
  costo_unitario?: number | null;
  id_referencia?: number | null;
  tipo_referencia?: string | null;
  observaciones?: string | null;
}
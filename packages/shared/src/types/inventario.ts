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

export type TipoModal = 'CREAR' | 'EDITAR' | 'DETALLE' | 'KARDEX' | 'MOVIMIENTO' | 'TRANSFERENCIA' | 'ALERTAS' | null;

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

export interface StockActualResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  id_almacen: number;
  almacen_codigo: string;
  almacen_nombre: string;
  cantidad: number;
  stock_minimo: number;
  estado: 'normal' | 'bajo_minimo' | 'sin_stock';
}

export interface AlertaStockResponse {
  id_alerta: number;
  id_producto: number;
  id_almacen: number;
  stock_actual: number;
  stock_minimo: number;
  estado: 'activa' | 'resuelta';
  reconocida_at: Date | null;
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
}

export interface CreateMovimientoDTO {
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

export interface CreateTransferenciaDTO {
  id_producto: number;
  id_almacen_origen: number;
  id_almacen_destino: number;
  cantidad: number;
  observaciones?: string | null;
}

export interface FiltrosMovimientos {
  id_producto?: number;
  id_almacen?: number;
  tipo?: TipoMovimiento;
  origen?: OrigenMovimiento;
  fecha_inicio?: Date | string;
  fecha_fin?: Date | string;
  page?: number;
  limit?: number;
}

export interface FiltrosStock {
  id_producto?: number;
  id_almacen?: number;
  soloBajoMinimo?: boolean;
}
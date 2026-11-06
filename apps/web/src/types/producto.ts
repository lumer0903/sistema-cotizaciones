export interface Categoria {
  id: string | number;
  id_categoria?: string | number;
  nombre: string;
  nombre_categoria?: string;
}

export interface Almacen {
  id: string | number;
  id_almacen?: string | number;
  nombre: string;
}

export interface Producto {
  id: string | number;
  id_producto?: string | number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  foto_url?: string;
  precio_unidad_normal?: number;
  stock_principal?: number;
  stock_total?: number;
  id_categoria?: string | number;
  categoria?: Categoria;
  [key: string]: any;
}

export interface CreateProductoDto {
  nombre: string;
  codigo: string;
  descripcion?: string;
  precio_unidad_normal?: number;
  id_categoria?: string | number;
  [key: string]: any;
}
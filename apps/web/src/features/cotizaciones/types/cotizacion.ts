export type EstadoCotizacion =
    | 'TODOS'
    | 'BORRADOR'
    | 'ENVIADO'
    | 'PARCIALMENTE_PAGADA'
    | 'APROBADO'
    | 'RECHAZADO';

export interface ProductoCarrito {
    id: string;
    id_producto?: number;
    codigo: string;
    descripcion: string;
    precioUnitario: number;
    cantidad: number;
    total: number;
    tipo_venta?: 'UNIDAD' | 'DOCENA' | 'MAYOR' | string;
    observacion?: string;
    es_sugerido_ia?: boolean;
    stock?: number;
    almacen?: string;
    ubicacion?: string;
}

export interface CotizacionItem {
    id: number;
    id_cotizacion: number;
    codigo: string;
    cliente: string;
    fecha: string;
    tipo: 'DISTRIBUIDOR' | 'TIENDA';
    estado: EstadoCotizacion;
    total: number;
}

export interface CotizacionesFilterParams {
    buscar?: string;
    fecha?: string;
    estado?: EstadoCotizacion;
    page?: number;
    limit?: number;
}

export interface CotizacionesPaginatedResponse {
    data: CotizacionItem[];
    total: number;
    page: number;
    limit: number;
}

export interface RecomendacionItem {
    id_producto: number;
    codigo: string;
    descripcion: string;
    precio: number;
    stock: number;
    similarityScore: number;
    categoria?: string;
    margen?: number;
    es_sugerido_ia: boolean;
    almacen?: string | null;
    ubicacion?: string | null;
}

export interface RecomendarItemRequest {
    id_producto_base: number;
    id_cliente?: number;
    id_almacen?: number;
    /** 'normal' = tienda, 'distribuidor' = distribuidor. Tiene prioridad sobre el tipo del cliente. */
    tipo_precio?: 'normal' | 'distribuidor';
}

export interface RecomendarItemResponse {
    similar: RecomendacionItem[];
    upsell: RecomendacionItem[];
    equilibrio: RecomendacionItem[];
}
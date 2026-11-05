export type EstadoCotizacion =
    | 'TODOS'
    | 'BORRADOR'
    | 'ENVIADO'
    | 'PARCIALMENTE_PAGADA'
    | 'APROBADO'
    | 'RECHAZADO'
    | 'EXPIRADA'
    | 'CONVERTIDA_A_VENTA';

export interface ProductoCarrito {
    id: string;
    id_producto?: number;
    codigo: string;
    descripcion: string;
    precioUnitario: number;
    cantidad: number;
    total?: number;
    tipo_venta?: 'UNIDAD' | 'DOCENA' | 'MAYOR' | string;
    observacion?: string;
    es_sugerido_ia?: boolean;
    stock?: number;
    almacen?: string;
    ubicacion?: string;
    imagenUrl?: string;
}

export function getItemTotal(item: ProductoCarrito): number {
    return item.precioUnitario * item.cantidad;
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
    margen?: number | null;
    es_sugerido_ia: boolean;
    almacen?: string | null;
    ubicacion?: string | null;
    unidades_por_caja?: number | null;
    imagen_url?: string | null;
}

export interface RecomendarItemRequest {
    id_producto_base: number;
    id_cliente?: number;
    id_almacen?: number;
    tipo_precio?: 'normal' | 'distribuidor';
    tipo_venta?: 'UNIDAD' | 'DOCENA' | 'MAYOR' | string;
    /** Cotización (borrador) desde la que se pide la recomendación → ia_interacciones.id_cotizacion */
    id_cotizacion?: number;
}

export interface RecomendarItemResponse {
    similar: RecomendacionItem[];
    upsell: RecomendacionItem[];
    equilibrio: RecomendacionItem[];
    /** Fila creada en ia_interacciones; se usa para reportar ACEPTADO/RECHAZADO */
    id_interaccion?: number | null;
}

export interface RegistrarAccionIaRequest {
    id_interaccion: number;
    accion: 'ACEPTADO' | 'RECHAZADO';
    id_cotizacion?: number;
    id_producto_sugerido?: number;
}

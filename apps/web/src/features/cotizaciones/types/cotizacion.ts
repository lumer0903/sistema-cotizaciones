export type EstadoCotizacion =
    | 'TODOS'
    | 'BORRADOR'
    | 'ENVIADO'
    | 'APROBADO'
    | 'RECHAZADO'
    | 'PENDIENTE'
    | 'CANCELADO';

export interface ProductoCarrito {
    id: string;
    codigo: string;
    descripcion: string;
    precioUnitario: number;
    cantidad: number;
    total: number;
    observacion?: string;
}

export interface CotizacionItem {
    id: string | number;
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
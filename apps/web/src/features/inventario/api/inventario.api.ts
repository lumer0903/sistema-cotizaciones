import { apiClient } from '@/lib/apiClient';
import { invalidateInventarioQueries } from '@/lib/queryClient';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { mapToProductoInventario, ProductoAPI } from '../mappers';
import {
    FiltrosInventario,
    FiltrosMovimientos,
    FiltrosStock,
    MovimientoFormData,
    TransferenciaFormData,
} from '../types/inventario.types';

// Re-export types for consumers
export type {
    MovimientoFormData,
    TransferenciaFormData,
    FiltrosMovimientos,
    FiltrosStock,
};

export interface ProductosPaginadosResponse {
    success: true;
    data: ProductoInventario[];
    total: number;
    page: number;
    limit: number;
}

export interface MovimientoResponse {
    id_movimiento: number;
    id_producto: number;
    id_almacen: number;
    tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
    origen: string;
    cantidad: number;
    stock_anterior: number;
    stock_posterior: number;
    costo_unitario: number | null;
    id_referencia: number | null;
    tipo_referencia: string | null;
    observaciones: string | null;
    id_usuario: number | null;
    created_at: string;
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
    success: true;
    data: MovimientoResponse[];
    total: number;
    page: number;
    limit: number;
}

export interface KardexResponse {
    id_movimiento: number;
    fecha: string;
    tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
    origen: string;
    cantidad: number;
    stock_anterior: number;
    stock_posterior: number;
    costo_unitario: number | null;
    referencia: string | null;
    observaciones: string | null;
    almacen: string | null;
    usuario: string | null;
}

export interface PaginatedKardexResponse {
    success: true;
    data: KardexResponse[];
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

export interface StockActualPaginatedResponse {
    success: true;
    data: StockActualResponse[];
    total: number;
    page: number;
    limit: number;
}

export interface AlertaStockResponse {
    id_alerta: number;
    id_producto: number;
    id_almacen: number;
    stock_actual: number;
    stock_minimo: number;
    estado: 'activa' | 'reconocida' | 'resuelta';
    reconocida_at: string | null;
    created_at: string;
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

export interface AlertasStockResponse {
    success: true;
    data: AlertaStockResponse[];
    total: number;
    page: number;
    limit: number;
}

export interface TransferenciaResponse {
    salida: MovimientoResponse;
    entrada: MovimientoResponse;
}

export const inventarioApi = {
    obtenerProductos: async (filtros?: FiltrosInventario): Promise<ProductosPaginadosResponse> => {
        const params = new URLSearchParams();
        if (filtros?.busqueda) params.set('search', filtros.busqueda);
        if (filtros?.pagina) params.set('page', String(filtros.pagina));
        if (filtros?.limite) params.set('limit', String(filtros.limite));
        if (filtros?.categoriaId) params.set('id_categoria', String(filtros.categoriaId));
        if (filtros?.almacenId) params.set('id_almacen', String(filtros.almacenId));
        // La ficha técnica necesita precios; incluir siempre
        if (!params.has('include')) params.set('include', 'precios,categoria,stock');
        const endpoint = params.toString() ? `/productos?${params.toString()}` : '/productos';
        return apiClient<ProductosPaginadosResponse>(endpoint);
    },

    obtenerPorId: async (id: string | number): Promise<ProductoInventario> => {
        const res=await apiClient<{data:ProductoAPI}>('/productos/'+id+'?include=precios,categoria,stock');
        return mapToProductoInventario(res.data);
    },

    obtenerMovimientos: async (filtros?: FiltrosMovimientos): Promise<PaginatedMovimientosResponse> => {
        const params = new URLSearchParams();
        if (filtros?.id_producto) params.set('id_producto', String(filtros.id_producto));
        if (filtros?.id_almacen) params.set('id_almacen', String(filtros.id_almacen));
        if (filtros?.tipo) params.set('tipo', filtros.tipo);
        if (filtros?.origen) params.set('origen', filtros.origen);
        if (filtros?.fecha_inicio) params.set('fecha_inicio', String(filtros.fecha_inicio));
        if (filtros?.fecha_fin) params.set('fecha_fin', String(filtros.fecha_fin));
        if (filtros?.pagina) params.set('page', String(filtros.pagina));
        if (filtros?.limite) params.set('limit', String(filtros.limite));
        const endpoint = params.toString() ? `/inventario/movimientos?${params.toString()}` : '/inventario/movimientos';
        return apiClient<PaginatedMovimientosResponse>(endpoint);
    },

    crearMovimiento: async (data: MovimientoFormData): Promise<{ success: true; data: MovimientoResponse }> => {
        const res = await apiClient<{ success: true; data: MovimientoResponse }>('/inventario/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        void invalidateInventarioQueries();
        return res;
    },

    crearTransferencia: async (data: TransferenciaFormData): Promise<{ success: true; data: TransferenciaResponse }> => {
        const res = await apiClient<{ success: true; data: TransferenciaResponse }>('/inventario/transferencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        void invalidateInventarioQueries();
        return res;
    },

    obtenerKardex: async (
        idProducto: number,
        filtros?: {
            id_almacen?: number;
            tipo?: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
            origen?: string;
            fecha_inicio?: string;
            fecha_fin?: string;
            page?: number;
            limit?: number;
        },
        signal?: AbortSignal,
    ): Promise<PaginatedKardexResponse> => {
        const params = new URLSearchParams();
        if (filtros?.id_almacen) params.set('id_almacen', String(filtros.id_almacen));
        if (filtros?.tipo) params.set('tipo', filtros.tipo);
        if (filtros?.origen) params.set('origen', filtros.origen);
        if (filtros?.fecha_inicio) params.set('fecha_inicio', filtros.fecha_inicio);
        if (filtros?.fecha_fin) params.set('fecha_fin', filtros.fecha_fin);
        if (filtros?.page) params.set('page', String(filtros.page));
        if (filtros?.limit) params.set('limit', String(filtros.limit));
        const queryString = params.toString();
        const endpoint = queryString
            ? `/inventario/kardex/${idProducto}?${queryString}`
            : `/inventario/kardex/${idProducto}`;
        return apiClient<PaginatedKardexResponse>(endpoint, { signal });
    },

    obtenerStockActual: async (filtros?: FiltrosStock): Promise<StockActualPaginatedResponse> => {
        const params = new URLSearchParams();
        if (filtros?.id_producto) params.set('id_producto', String(filtros.id_producto));
        if (filtros?.id_almacen) params.set('id_almacen', String(filtros.id_almacen));
        if (filtros?.pagina) params.set('page',String(filtros.pagina));
        if (filtros?.limite) params.set('limit',String(filtros.limite));
        if (filtros?.soloBajoMinimo) params.set('soloBajoMinimo', 'true');
        const endpoint = params.toString() ? `/inventario/stock?${params.toString()}` : '/inventario/stock';
        return apiClient<StockActualPaginatedResponse>(endpoint);
    },

    obtenerAlertasStock: async (estado: 'abiertas' | 'activa' | 'reconocida' | 'resuelta' | 'todas' = 'abiertas', page = 1, limit = 20, signal?: AbortSignal): Promise<AlertasStockResponse> => {
        const params = new URLSearchParams();
        params.set('estado', estado);
        params.set('page', String(page));
        params.set('limit', String(limit));
        const endpoint = params.toString() ? `/inventario/alertas?${params.toString()}` : '/inventario/alertas';
        return apiClient<AlertasStockResponse>(endpoint, { signal });
    },

    reconocerAlerta: async (idAlerta: number): Promise<void> => {
        await apiClient(`/inventario/alertas/${idAlerta}/reconocer`, {
            method: 'PATCH',
        });
        void invalidateInventarioQueries();
    },
};
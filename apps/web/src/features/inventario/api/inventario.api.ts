import { apiClient } from '@/lib/api-client';
import { Producto } from '@/types';
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
    data: Producto[];
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
    estado: 'activa' | 'resuelta';
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
        const endpoint = params.toString() ? `/productos?${params.toString()}` : '/productos';
        return apiClient<ProductosPaginadosResponse>(endpoint);
    },

    obtenerPorId: async (id: string | number): Promise<Producto> => {
        return apiClient(`/productos/${id}?include=precios,categoria,stock`);
    },

    actualizarStock: async (id: string | number, stock: number): Promise<Producto> => {
        return apiClient(`/inventario/${id}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock }),
        });
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
        return apiClient('/inventario/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    crearTransferencia: async (data: TransferenciaFormData): Promise<{ success: true; data: TransferenciaResponse }> => {
        return apiClient('/inventario/transferencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
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
        }
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
        return apiClient<PaginatedKardexResponse>(endpoint);
    },

    exportarKardexCSV: async (
        idProducto: number,
        filtros?: {
            id_almacen?: number;
            tipo?: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
            origen?: string;
            fecha_inicio?: string;
            fecha_fin?: string;
        }
    ): Promise<Blob> => {
        const params = new URLSearchParams();
        if (filtros?.id_almacen) params.set('id_almacen', String(filtros.id_almacen));
        if (filtros?.tipo) params.set('tipo', filtros.tipo);
        if (filtros?.origen) params.set('origen', filtros.origen);
        if (filtros?.fecha_inicio) params.set('fecha_inicio', filtros.fecha_inicio);
        if (filtros?.fecha_fin) params.set('fecha_fin', filtros.fecha_fin);
        params.set('page', '1');
        params.set('limit', '10000');
        const queryString = params.toString();
        const endpoint = `/inventario/kardex/${idProducto}/export?${queryString}`;

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const basePath = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
        const cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

        const isBrowser = typeof window !== 'undefined';
        const getTokenFromCookies = (): string | null => {
            if (!isBrowser) return null;
            const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
            return match ? decodeURIComponent(match[1]) : null;
        };
        const cookieToken = getTokenFromCookies();
        const localToken = isBrowser ? localStorage.getItem('access_token') : null;
        const token = (cookieToken?.trim() ?? localToken?.trim()) || null;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const response = await fetch(`${basePath}${cleanEndpoint}`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Error al exportar kardex');
        }

        return response.blob();
    },

    obtenerStockActual: async (filtros?: FiltrosStock): Promise<StockActualPaginatedResponse> => {
        const params = new URLSearchParams();
        if (filtros?.id_producto) params.set('id_producto', String(filtros.id_producto));
        if (filtros?.id_almacen) params.set('id_almacen', String(filtros.id_almacen));
        if (filtros?.soloBajoMinimo) params.set('soloBajoMinimo', 'true');
        const endpoint = params.toString() ? `/inventario/stock?${params.toString()}` : '/inventario/stock';
        return apiClient<StockActualPaginatedResponse>(endpoint);
    },

    obtenerAlertasStock: async (estado?: 'activa' | 'resuelta'): Promise<AlertasStockResponse> => {
        const params = new URLSearchParams();
        if (estado) params.set('estado', estado);
        const endpoint = params.toString() ? `/inventario/alertas?${params.toString()}` : '/inventario/alertas';
        return apiClient<AlertasStockResponse>(endpoint);
    },

    reconocerAlerta: async (idAlerta: number): Promise<void> => {
        await apiClient(`/inventario/alertas/${idAlerta}/reconocer`, {
            method: 'PATCH',
        });
    },
};
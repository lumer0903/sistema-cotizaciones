import { apiClient } from '@/lib/apiClient';
import {
    CotizacionItem,
    CotizacionesFilterParams,
    CotizacionesPaginatedResponse,
} from '../types/cotizacion';
import { ProductoBase } from '../components/AgregarProductoModal';

export async function getCotizaciones(
    params: CotizacionesFilterParams = {}
): Promise<CotizacionesPaginatedResponse | CotizacionItem[]> {
    const query = new URLSearchParams();

    if (params.buscar && params.buscar.trim() !== '') {
        query.append('buscar', params.buscar.trim());
    }
    if (params.fecha && params.fecha.trim() !== '') {
        query.append('fecha', params.fecha.trim());
    }
    if (params.estado && params.estado !== 'TODOS' && params.estado.trim() !== '') {
        query.append('estado', params.estado);
    }
    if (params.page && params.page > 1) {
        query.append('page', params.page.toString());
    }
    if (params.limit) {
        query.append('limit', params.limit.toString());
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/cotizaciones?${queryString}` : '/cotizaciones';

    try {
        const data = await apiClient(endpoint);
        return data as CotizacionesPaginatedResponse | CotizacionItem[];
    } catch (error) {
        console.warn(`[cotizacionApi] Error al consultar ${endpoint}.`, error);
        if (queryString) {
            const fallbackData = await apiClient('/cotizaciones');
            return fallbackData as CotizacionesPaginatedResponse | CotizacionItem[];
        }
        throw error;
    }
}

export async function getCotizacionById(id: string | number): Promise<CotizacionItem> {
    const data = (await apiClient(`/cotizaciones/${id}`)) as CotizacionItem;
    return data;
}

export async function obtenerProductosImportados(): Promise<ProductoBase[]> {
    try {
        const response = await apiClient('/productos');
        if (Array.isArray(response)) return response as ProductoBase[];
        if (response && typeof response === 'object') {
            const res = response as Record<string, unknown>;
            if (Array.isArray(res.data)) return res.data as ProductoBase[];
            if (Array.isArray(res.items)) return res.items as ProductoBase[];
        }
        return [];
    } catch (error) {
        console.error('[cotizacionApi] Error al obtener productos:', error);
        return [];
    }
}
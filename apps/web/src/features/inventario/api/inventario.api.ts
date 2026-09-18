import { apiClient } from '@/lib/api-client';
import { Producto } from '@/types';
import { FiltrosInventario } from '../types/inventario.types';

export interface ProductosPaginadosResponse {
    success: true;
    data: Producto[];
    total: number;
    page: number;
    limit: number;
}

export const inventarioApi = {
    obtenerProductos: async (filtros?: FiltrosInventario): Promise<ProductosPaginadosResponse> => {
        const params = new URLSearchParams();
        if (filtros?.busqueda) params.set('search', filtros.busqueda);
        if (filtros?.pagina) params.set('page', String(filtros.pagina));
        if (filtros?.limite) params.set('limit', String(filtros.limite));
        const endpoint = params.toString() ? `/productos?${params.toString()}` : '/productos';
        return apiClient<ProductosPaginadosResponse>(endpoint);
    },

    obtenerPorId: async (id: string | number): Promise<Producto> => {
        return apiClient(`/inventario/${id}`);
    },

    actualizarStock: async (id: string | number, stock: number): Promise<Producto> => {
        return apiClient(`/inventario/${id}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock }),
        });
    },
};
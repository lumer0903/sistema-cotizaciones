import { ProductoConsulta } from '../types/precio';
import { inventarioApi } from '@/features/inventario/api/inventario.api';
import { apiClient } from '@/lib/api-client';
import { getImageUrl } from '@/lib/imageUtils';

const getRandomNumber = (min: number, max: number) => {
    return Number((Math.random() * (max - min) + min).toFixed(2));
};

export const getProductosConsulta = async (): Promise<ProductoConsulta[]> => {
    const response = await inventarioApi.obtenerProductos();
    const productosInventario = response.data;

    return productosInventario.map((prod: any, index: number) => {
        const baseUnidad = getRandomNumber(10, 85);

        // Usar stock_total (stock real total) o stock_principal como fallback
        const stockTotal = prod.stock_total ?? prod.stock_principal ?? prod.stock_actual?.[0]?.cantidad ?? 0;

        return {
            id: String(prod.id ?? prod.id_producto ?? prod.codigo ?? `temp-${index}`),
            codigo: prod.codigo || 'S/C',
            descripcion: prod.descripcion || prod.nombre || '',
            stock: stockTotal,
            imagenUrl: getImageUrl(prod.foto_url || prod.imagenUrl || prod.imagen, '200'),
            precioDistribuidor: {
                unidad: baseUnidad,
                docena: Number((baseUnidad * 0.82).toFixed(2)),
                mayor: Number((baseUnidad * 0.68).toFixed(2)),
            },
            precioTienda: {
                unidad: Number((baseUnidad * 0.92).toFixed(2)),
                docena: Number((baseUnidad * 0.76).toFixed(2)),
                mayor: Number((baseUnidad * 0.62).toFixed(2)),
            },
        };
    });
};

export interface HistorialPrecioItem {
    id: string | number;
    campoModificado: string;
    fechaCambio: string;
    usuario: string;
    valorAnterior: number;
    valorNuevo: number;
}

export const getHistorialPrecios = async (productoId: string | number): Promise<HistorialPrecioItem[]> => {
    const response = await apiClient<{ success: true; data: HistorialPrecioItem[] }>(
        `/historial-precios?id_producto=${productoId}&limit=100`
    );
    return response.data;
};
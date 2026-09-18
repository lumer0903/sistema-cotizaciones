import { ProductoConsulta } from '../types/precio';
import { inventarioApi } from '@/features/inventario/api/inventario.api';
import { apiClient } from '@/lib/api-client';

const getRandomNumber = (min: number, max: number) => {
    return Number((Math.random() * (max - min) + min).toFixed(2));
};

export const getProductosConsulta = async (): Promise<ProductoConsulta[]> => {
    // 1. Obtenemos los productos reales llamando a inventarioApi.obtenerProductos()
    const response = await inventarioApi.obtenerProductos();
    const productosInventario = response.data;

    // 2. Transformamos los productos agregándoles la escala de precios
    return productosInventario.map((prod: any, index: number) => {
        const baseUnidad = getRandomNumber(10, 85);

        return {
            id: String(prod.id ?? prod.id_producto ?? prod.codigo ?? `temp-${index}`),
            codigo: prod.codigo || 'S/C',
            descripcion: prod.descripcion || prod.nombre || '',
            stock: prod.stock ?? 0,
            imagenUrl: prod.imagenUrl || prod.imagen,
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
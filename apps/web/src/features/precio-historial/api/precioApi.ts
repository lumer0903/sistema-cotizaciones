import { ProductoConsulta } from '../types/precio';
import { apiClient } from '@/lib/apiClient';
import { getImageUrl } from '@/lib/imageUtils';

interface ProductoPreciosResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total?: number;
  stock_principal?: number;
  stock_minimo?: number;
  foto_url?: string;
  precios?: {
    precio_unidad_normal: number;
    precio_docena_normal: number;
    precio_mayor_normal: number;
    precio_unidad_dist: number;
    precio_docena_dist: number;
    precio_mayor_dist: number;
  } | null;
}

interface ProductosListResponse {
  success: boolean;
  data: ProductoPreciosResponse[];
}

export const getProductosConsulta = async (): Promise<ProductoConsulta[]> => {
  const response = await apiClient<ProductosListResponse>(
    '/productos?include=precios,stock&limit=500'
  );

  return (response.data ?? []).map((prod) => {
    const stockTotal = prod.stock_total ?? prod.stock_principal ?? 0;

    return {
      id: String(prod.id_producto),
      codigo: prod.codigo || 'S/C',
      descripcion: prod.descripcion || '',
      stock: stockTotal,
      stockMinimo: prod.stock_minimo ?? 10,
      imagenUrl: getImageUrl(prod.foto_url, '200'),
      precioDistribuidor: {
        unidad: Number(prod.precios?.precio_unidad_dist ?? 0),
        docena: Number(prod.precios?.precio_docena_dist ?? 0),
        mayor: Number(prod.precios?.precio_mayor_dist ?? 0),
      },
      precioTienda: {
        unidad: Number(prod.precios?.precio_unidad_normal ?? 0),
        docena: Number(prod.precios?.precio_docena_normal ?? 0),
        mayor: Number(prod.precios?.precio_mayor_normal ?? 0),
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

interface HistorialPrecioRaw {
  id_historial?: number;
  id?: string | number;
  campo_modificado?: string;
  campoModificado?: string;
  fecha_cambio?: string;
  fechaCambio?: string;
  usuario_nombre?: string | null;
  usuario?: { nombre?: string } | string | null;
  valor_anterior?: number;
  valorAnterior?: number;
  valor_nuevo?: number;
  valorNuevo?: number;
}

function mapHistorialItem(raw: HistorialPrecioRaw): HistorialPrecioItem {
  const usuario =
    typeof raw.usuario === 'string'
      ? raw.usuario
      : raw.usuario?.nombre ?? raw.usuario_nombre ?? '—';
  const fecha = raw.fechaCambio ?? raw.fecha_cambio ?? '';
  return {
    id: raw.id ?? raw.id_historial ?? 0,
    campoModificado: raw.campoModificado ?? raw.campo_modificado ?? '—',
    fechaCambio: fecha ? new Date(fecha).toLocaleDateString('es-PE') : '—',
    usuario,
    valorAnterior: Number(raw.valorAnterior ?? raw.valor_anterior ?? 0),
    valorNuevo: Number(raw.valorNuevo ?? raw.valor_nuevo ?? 0),
  };
}

export const getHistorialPrecios = async (productoId: string | number): Promise<HistorialPrecioItem[]> => {
  const response = await apiClient<{ success: true; data: HistorialPrecioRaw[] }>(
    `/historial-precios?id_producto=${productoId}&limit=100`
  );
  return (response.data ?? []).map(mapHistorialItem);
};

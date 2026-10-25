import { ProductoConsulta } from '../types/precio';
import { apiClient } from '@/lib/apiClient';
import { getImageUrl } from '@/lib/imageUtils';
export interface Page<T>{data:T[];total:number;page:number;limit:number;next_cursor?:string|null}
interface ProductRaw {id_producto:number;codigo:string;descripcion:string;stock_total:number;stock_minimo:number;foto_url?:string;precios:Record<string,string>|null}
const amount=(v:unknown)=>v===null||v===undefined||!Number.isFinite(Number(v))?null:Number(v);
export async function getProductosConsulta(params='page=1&limit=8',signal?:AbortSignal):Promise<Page<ProductoConsulta>> {
 const response=await apiClient<Page<ProductRaw>>('/precios?'+params,{signal});
 return {...response,data:response.data.map(p=>({id:String(p.id_producto),codigo:p.codigo,descripcion:p.descripcion,
 stock:p.stock_total,stockMinimo:p.stock_minimo,imagenUrl:getImageUrl(p.foto_url,'200'),
 precioTienda:{unidad:amount(p.precios?.precio_unidad_normal),docena:amount(p.precios?.precio_docena_normal),mayor:amount(p.precios?.precio_mayor_normal)},
 precioDistribuidor:{unidad:amount(p.precios?.precio_unidad_dist),docena:amount(p.precios?.precio_docena_dist),mayor:amount(p.precios?.precio_mayor_dist)}}))};
}
export interface HistorialPrecioItem {
  id: number;
  campoModificado: string;
  fechaCambio: string;
  usuario: string;
  valorAnterior: number;
  valorNuevo: number;
  evento: string;
  motivo: string;
  costoUnitario: number | null;
  motivoLimpio: string;
}
interface HistoryRaw {
  id_historial: number;
  campo_modificado: string;
  fecha_cambio: string;
  actor_nombre: string;
  valor_anterior: string;
  valor_nuevo: string;
  evento: string;
  motivo: string;
  costo_unitario: number | null;
  motivo_limpio: string;
}
export async function getHistorialPrecios(id: string, params = 'page=1&limit=20', signal?: AbortSignal): Promise<Page<HistorialPrecioItem>> {
  const response = await apiClient<Page<HistoryRaw>>('/historial-precios?id_producto=' + encodeURIComponent(id) + '&' + params, { signal });
  return {
    ...response,
    data: response.data.map(p => ({
      id: p.id_historial,
      campoModificado: p.campo_modificado,
      fechaCambio: p.fecha_cambio,
      usuario: p.actor_nombre,
      valorAnterior: Number(p.valor_anterior),
      valorNuevo: Number(p.valor_nuevo),
      evento: p.evento,
      motivo: p.motivo,
      costoUnitario: p.costo_unitario,
      motivoLimpio: p.motivo_limpio,
    })),
  };
}

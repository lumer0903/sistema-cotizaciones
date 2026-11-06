'use client';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/apiClient';
import { mapToProductoInventario, ProductoAPI, PaginatedResponse } from './mappers';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
type ListResult={key:string;data:ProductoInventario[];error:string|null};
type DetailResult={key:string;data:ProductoInventario|null;error:string|null};
export function useInventoryProducts(open:boolean, search:string, selectedId?:number|null) {
  const query=useDebounce(search,300);
  const [session,setSession]=useState({open,epoch:0});
  if(session.open!==open)setSession({open,epoch:session.epoch+1});
  const listKey=session.epoch+'/'+query;
  const detailKey=session.epoch+'/'+(selectedId??'');
  const [list,setList]=useState<ListResult|null>(null);
  const [detail,setDetail]=useState<DetailResult|null>(null);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();let current=true;
    const params=new URLSearchParams({page:'1',limit:'20',include:'precios,categoria,stock'});
    if(query.trim())params.set('search',query.trim());
    apiClient<PaginatedResponse<ProductoAPI>>('/productos?'+params,{signal:controller.signal})
      .then(res=>{if(current)setList({key:listKey,data:res.data.map(mapToProductoInventario),error:null});})
      .catch(err=>{if(current)setList({key:listKey,data:[],error:err.message||'Error al buscar productos'});});
    return()=>{current=false;controller.abort();};
  },[open,query,listKey]);
  useEffect(()=>{
    if(!open||!selectedId)return;
    const controller=new AbortController();let current=true;
    apiClient<{data:ProductoAPI}>('/productos/'+selectedId+'?include=precios,categoria,stock',{signal:controller.signal})
      .then(res=>{if(current)setDetail({key:detailKey,data:mapToProductoInventario(res.data),error:null});})
      .catch(err=>{if(current)setDetail({key:detailKey,data:null,error:err.message||'Producto no disponible'});});
    return()=>{current=false;controller.abort();};
  },[open,selectedId,detailKey]);
  return {
    productos:open&&list?.key===listKey?list.data:[],
    preselected:open&&selectedId&&detail?.key===detailKey?detail.data:null,
    loading:open&&list?.key!==listKey,
    error:(list?.key===listKey?list.error:null)||(selectedId&&detail?.key===detailKey?detail.error:null),
  };
}

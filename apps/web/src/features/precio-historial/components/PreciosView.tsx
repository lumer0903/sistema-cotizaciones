'use client';
import {useCallback,useState} from 'react';
import {Input,Select,FilterCard,Pagination,Button} from '@/components/ui';
import {useDebounce} from '@/hooks/useDebounce';
import {usePermissions} from '@/hooks/usePermissions';
import {apiClient} from '@/lib/apiClient';
import {BulkPriceModal} from './BulkPriceModal';
import {PriceCard} from './PriceCard';
import {HistorialPrecioModal} from './HistorialPrecioModal';
import {getProductosConsulta} from '../api/precioApi';
import {usePriceRequest} from '../usePriceRequest';
export function PreciosView(){
 const {isAdmin,isGerente,can}=usePermissions();
 const [bulk,setBulk]=useState(false);
 const [categorySearch,setCategorySearch]=useState(''),[categoryLabel,setCategoryLabel]=useState('');
 const categoryQuery=useDebounce(categorySearch,300);
 const loadCategories=useCallback((signal:AbortSignal)=>apiClient<{data:Array<{id_categoria:number;nombre_categoria:string}>;total:number}>('/precios/categorias?limit=20&search='+encodeURIComponent(categoryQuery),{signal}),[categoryQuery]);
 const categories=usePriceRequest('categories/'+categoryQuery,loadCategories);
 const [filters,setFilters]=useState({search:'',tipo_precio:'',stock_status:'',id_categoria:'',activo:'',precio_min:'',precio_max:''});
 const [page,setPage]=useState(1),[limit,setLimit]=useState(8),[retry,setRetry]=useState(0);
 const [selected,setSelected]=useState<{id:string;codigo:string}|null>(null);
 const search=useDebounce(filters.search,300);
 const min=useDebounce(filters.precio_min,300),max=useDebounce(filters.precio_max,300);
 const params=new URLSearchParams({page:String(page),limit:String(limit)});
 Object.entries({...filters,search,precio_min:min,precio_max:max}).forEach(([k,v])=>{if(v!=='')params.set(k,v);});
 const query=params.toString();
 const load=useCallback((signal:AbortSignal)=>getProductosConsulta(query,signal),[query]);
 const state=usePriceRequest(query+'/'+retry,load);
 const update=(key:keyof typeof filters,value:string)=>{setFilters(old=>({...old,[key]:value,...(key==='tipo_precio'&&!value?{precio_min:'',precio_max:''}:{})}));setPage(1);};
 const data=state.data;
 const tipo=filters.tipo_precio.endsWith('_dist')?'distribuidor':filters.tipo_precio?'tienda':'';
 return <div className="w-full space-y-6">
 <h1 className="sr-only">Consulta de precios</h1>
 {(isAdmin||isGerente)&&can('productos','edicion')&&<Button onClick={()=>setBulk(true)}>Ajuste masivo</Button>}
 <FilterCard><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Input label="Buscar código o descripción" value={filters.search} onChange={e=>update('search',e.target.value)}/>
 <Select label="Tarifa" value={filters.tipo_precio} onChange={e=>update('tipo_precio',String(e.target.value))} options={[
 {label:'Todas',value:''},...['unidad_normal','docena_normal','mayor_normal','unidad_dist','docena_dist','mayor_dist'].map(v=>({value:'precio_'+v,label:v.replaceAll('_',' ')}))]}/>
 <Select label="Stock" value={filters.stock_status} onChange={e=>update('stock_status',String(e.target.value))} options={[{label:'Todos',value:''},{label:'Agotado',value:'agotado'},{label:'Bajo',value:'bajo'},{label:'Disponible',value:'disponible'}]}/>
 <div><Input label="Buscar categoría" value={categorySearch} onChange={e=>setCategorySearch(e.target.value)}/>
 <Select label="Categoría" value={filters.id_categoria} onChange={e=>{const id=String(e.target.value);update('id_categoria',id);setCategoryLabel(categories.data?.data.find(c=>String(c.id_categoria)===id)?.nombre_categoria??'');}} options={[{label:'Todas las categorías',value:''},...(filters.id_categoria&&!categories.data?.data.some(c=>String(c.id_categoria)===filters.id_categoria)?[{label:categoryLabel,value:filters.id_categoria}]:[]),...(categories.data?.data??[]).map(c=>({label:c.nombre_categoria,value:String(c.id_categoria)}))]}/>
 {categories.loading&&<p role="status">Buscando categorías…</p>}{categories.error&&<p role="alert">{categories.error}</p>}
 </div>
 <Select label="Actividad" value={filters.activo} onChange={e=>update('activo',String(e.target.value))} options={[{label:'Todos',value:''},{label:'Activos',value:'true'},{label:'Inactivos',value:'false'}]}/>
 <div className="flex gap-2"><Input label="Precio mínimo" type="number" min="0" step="0.01" disabled={!filters.tipo_precio} value={filters.precio_min} onChange={e=>update('precio_min',e.target.value)}/><Input label="Precio máximo" type="number" min="0" step="0.01" disabled={!filters.tipo_precio} value={filters.precio_max} onChange={e=>update('precio_max',e.target.value)}/></div>
 </div></FilterCard>
 {state.loading?<div role="status" className="animate-pulse p-8 bg-surface-muted rounded-xl">Cargando precios…</div>:
 state.error?<div role="alert"><p>{state.error}</p><Button onClick={()=>setRetry(v=>v+1)}>Reintentar</Button></div>:
 !data?.data.length?<p className="p-8 text-center">No se encontraron productos con estos filtros.</p>:
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{data.data.map(producto=><PriceCard key={producto.id} producto={producto} tipoPrecio={tipo}
 onVerHistorial={isAdmin||isGerente?()=>setSelected({id:producto.id,codigo:producto.codigo}):undefined}/>)}</div>}
 <Pagination loading={state.loading} currentPage={page} totalPages={Math.max(1,Math.ceil((data?.total??0)/limit))} totalItems={data?.total??0} limit={limit} onPageChange={setPage}
 onLimitChange={v=>{setLimit(v);setPage(1);}} itemLabel="productos"/>
 {bulk&&<BulkPriceModal category={filters.id_categoria} categoryName={categoryLabel} onClose={()=>setBulk(false)} onSaved={()=>{setBulk(false);setRetry(v=>v+1);}}/>}
 {selected&&<HistorialPrecioModal key={selected.id} open onClose={()=>setSelected(null)} productoId={selected.id} codigoProducto={selected.codigo}/>}
 </div>;
}

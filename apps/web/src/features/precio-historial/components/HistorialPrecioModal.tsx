'use client';
import {priceLabels,priceEventLabels} from '../priceLabels';
import {useCallback,useState} from 'react';
import {Modal,Input,Button,Pagination,Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui';
import {getHistorialPrecios} from '../api/precioApi';
import {usePriceRequest} from '../usePriceRequest';
export function HistorialPrecioModal({open,onClose,productoId,codigoProducto}:{open:boolean;onClose:()=>void;productoId:string;codigoProducto:string}){
 const [page,setPage]=useState(1),[limit,setLimit]=useState(24),[inicio,setInicio]=useState(''),[fin,setFin]=useState(''),[retry,setRetry]=useState(0);
 const params=new URLSearchParams({page:String(page),limit:String(limit)});
 if(inicio)params.set('fecha_inicio',inicio);if(fin)params.set('fecha_fin',fin);
 const query=params.toString();
 const load=useCallback((signal:AbortSignal)=>getHistorialPrecios(productoId,query,signal),[productoId,query]);
 const state=usePriceRequest(open?productoId+'/'+query+'/'+retry:null,load),data=state.data;
 return <Modal open={open} onClose={onClose} title={'Historial: '+codigoProducto} maxWidth="xl">
 <div className="flex gap-3 mb-4"><Input label="Desde (Lima)" type="date" value={inicio} onChange={e=>{setInicio(e.target.value);setPage(1);}}/>
 <Input label="Hasta (Lima)" type="date" value={fin} onChange={e=>{setFin(e.target.value);setPage(1);}}/></div>
 {state.loading?<p role="status">Cargando historial…</p>:state.error?<div role="alert">{state.error}<Button onClick={()=>setRetry(v=>v+1)}>Reintentar</Button></div>:
 !data?.data.length?<p>No hay cambios registrados en este rango.</p>:
 <Table scrollLabel="Historial de precios"><TableHeader><TableRow>{['Campo / evento','Fecha y hora (Lima)','Usuario / motivo','Anterior','Nuevo'].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></TableHeader>
 <TableBody>{data.data.map(item=><TableRow key={item.id}>
 <TableCell>{priceLabels[item.campoModificado]??item.campoModificado}<div>{priceEventLabels[item.evento]??item.evento}</div></TableCell>
 <TableCell>{new Date(item.fechaCambio).toLocaleString('es-PE',{timeZone:'America/Lima'})}</TableCell>
 <TableCell>{item.usuario}<div>{item.motivo}</div></TableCell>
 <TableCell>{item.evento==='CREACION'?'—':'S/ '+item.valorAnterior.toFixed(2)}</TableCell>
 <TableCell>S/ {item.valorNuevo.toFixed(2)}</TableCell>
 </TableRow>)}</TableBody></Table>}
 <Pagination loading={state.loading} currentPage={page} totalPages={Math.max(1,Math.ceil((data?.total??0)/limit))} totalItems={data?.total??0} limit={limit} onPageChange={setPage}
 onLimitChange={v=>{setLimit(v);setPage(1);}} itemLabel="cambios"/>
 </Modal>;
}

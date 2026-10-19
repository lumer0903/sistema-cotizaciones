'use client';
import {priceLabels} from '../priceLabels';
import {newPriceAdjustmentKey} from '../adjustmentKey';
import {useCallback,useState} from 'react';
import {Modal,Input,Button} from '@/components/ui';
import {apiClient,apiErrorMessage} from '@/lib/apiClient';
import {usePriceRequest} from '../usePriceRequest';
const fields=['precio_unidad_normal','precio_docena_normal','precio_mayor_normal','precio_unidad_dist','precio_docena_dist','precio_mayor_dist'];
export function BulkPriceModal({category,categoryName,onClose,onSaved}:{category:string;categoryName:string;onClose:()=>void;onSaved:()=>void}){
 const [percentage,setPercentage]=useState(''),[reason,setReason]=useState(''),[selected,setSelected]=useState(fields);
 const [key,setKey]=useState(()=>newPriceAdjustmentKey()),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const query='limit=1'+(category?'&id_categoria='+category:'');
 const load=useCallback((signal:AbortSignal)=>apiClient<{total:number}>('/precios?'+query,{signal}),[query]);
 const target=usePriceRequest(query,load);
 const percentageValid=/^-?\d+(\.\d{1,2})?$/.test(percentage)&&Number(percentage)>-100&&Number(percentage)<=1000;
 const valid=percentageValid&&selected.length>0&&reason.trim().length>=3;
 const resetKey=()=>{setKey(newPriceAdjustmentKey());setError('');};
 async function submit(){
  if(!valid||saving)return;setSaving(true);setError('');
  try {await apiClient('/precios/ajustes-masivos',{method:'POST',body:JSON.stringify({clave:key,id_categoria:category?Number(category):undefined,campos:selected,porcentaje:Number(percentage),motivo:reason.trim()})});onSaved();}
  catch(e){setError(apiErrorMessage(e));}
  finally{setSaving(false);}
 }
 return <Modal open onClose={()=>{if(!saving)onClose();}} title="Ajuste masivo de precios" maxWidth="md">
 <p>Se aplicará a {target.data?.total??'…'} productos de {categoryName||'todo el catálogo'}. Los costos se conservan.</p>
 <Input label="Porcentaje (negativo para reducir)" type="number" step="0.01" min="-99.99" max="1000" disabled={saving} value={percentage} onChange={e=>{setPercentage(e.target.value);resetKey();}} error={percentage&&!percentageValid?'Ingrese un porcentaje entre -99.99 y 1000, con hasta dos decimales':undefined}/>
 <Input label="Motivo" error={reason&&reason.trim().length<3?'Escriba un motivo de al menos tres caracteres':undefined} maxLength={300} disabled={saving} value={reason} onChange={e=>{setReason(e.target.value);resetKey();}}/>
 <fieldset disabled={saving} className="my-4 space-y-2"><legend>Tarifas a modificar</legend>{fields.map(f=><label key={f} className="flex items-center gap-2">
 <span className="w-5 shrink-0"><Input className="h-5 w-5 p-0" type="checkbox" checked={selected.includes(f)} onChange={e=>{setSelected(old=>e.target.checked?[...old,f]:old.filter(x=>x!==f));resetKey();}} aria-label={'Modificar '+priceLabels[f]}/></span><span>{priceLabels[f]}</span></label>)}</fieldset>
 <p className="text-sm">La operación completa se revierte si alguna tarifa incumple unidad ≥ docena ≥ mayor.</p>
 {error&&<p role="alert">{error}</p>}{target.error&&<p role="alert">{target.error}</p>}
 <Button disabled={!valid||saving||target.loading||!!target.error} onClick={submit}>{saving?'Aplicando…':'Aplicar ajuste'}</Button>
 </Modal>;
}

'use client';
import {useEffect,useState} from 'react';
import {apiErrorMessage} from '@/lib/apiClient';
export function usePriceRequest<T>(key:string|null,load:(signal:AbortSignal)=>Promise<T>){
 const [result,setResult]=useState<{key:string;data?:T;error?:string}|null>(null);
 useEffect(()=>{
  if(!key)return;
  let current=true;const controller=new AbortController();
  load(controller.signal).then(data=>{if(current)setResult({key,data});})
   .catch(error=>{if(current)setResult({key,error:apiErrorMessage(error)});});
  return()=>{current=false;controller.abort();};
 },[key,load]);
 return {data:result?.key===key?result.data:undefined,error:result?.key===key?result.error:undefined,
 loading:!!key&&result?.key!==key};
}

import {afterEach,describe,it,expect,vi} from 'vitest';
import {renderHook,waitFor,act,cleanup} from '@testing-library/react';
import {usePriceRequest} from './usePriceRequest';
vi.mock('@/lib/apiClient',()=>({apiErrorMessage:()=> 'Error de servidor'}));
afterEach(cleanup);
describe('respuestas de precios por identidad',()=>{
 it('no asocia historial de un producto anterior al seleccionado',async()=>{
  let resolveOld:(v:string)=>void=()=>{};
  const old=()=>new Promise<string>(r=>{resolveOld=r;});
  const fresh=()=>Promise.resolve('PRODUCTO NUEVO');
  const {result,rerender}=renderHook(({key,load})=>usePriceRequest(key,load),{initialProps:{key:'old',load:old}});
  expect(result.current.loading).toBe(true);
  rerender({key:'new',load:fresh});
  await waitFor(()=>expect(result.current.data).toBe('PRODUCTO NUEVO'));
  await act(async()=>resolveOld('PRODUCTO VIEJO'));
  expect(result.current.data).toBe('PRODUCTO NUEVO');
 });
 it('distingue fallo HTTP de historial vacío',async()=>{
  const load=()=>Promise.reject(new Error('500'));
  const {result}=renderHook(()=>usePriceRequest('history',load));
  await waitFor(()=>expect(result.current.error).toBe('Error de servidor'));
  expect(result.current.data).toBeUndefined();expect(result.current.loading).toBe(false);
 });
});

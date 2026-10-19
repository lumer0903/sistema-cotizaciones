import { afterEach,describe,it,expect,vi } from 'vitest';
import { renderHook,waitFor,act,cleanup } from '@testing-library/react';
import { useInventoryProducts } from './useInventoryProducts';
import { apiClient } from '@/lib/apiClient';
vi.mock('@/lib/apiClient',()=>({apiClient:vi.fn()}));
vi.mock('@/hooks/useDebounce',()=>({useDebounce:(value:string)=>value}));
const product=(id:number,code:string)=>({id_producto:id,codigo:code,descripcion:code,stock_total:5,stock_principal:0,
  stock_minimo:10,stock_actual:[],colores_surtido:[],categoria:null,activo:true,unidades_por_caja:1});
afterEach(()=>{cleanup();vi.resetAllMocks();});
describe('búsqueda remota de inventario',()=>{
  it('preselecciona por ID y encuentra productos fuera de la antigua página de 500',async()=>{
    vi.mocked(apiClient).mockImplementation(async(path)=>path.startsWith('/productos/12000')
      ?{data:product(12000,'ANTIGUO')}:{data:[product(12000,'ANTIGUO')],total:1});
    const {result}=renderHook(()=>useInventoryProducts(true,'ANTIGUO',12000));
    await waitFor(()=>expect(result.current.preselected?.id_producto).toBe(12000));
    await waitFor(()=>expect(result.current.productos[0]?.id_producto).toBe(12000));
    expect(vi.mocked(apiClient).mock.calls.some(([url])=>url.includes('limit=20')&&url.includes('search=ANTIGUO'))).toBe(true);
    expect(vi.mocked(apiClient).mock.calls.some(([url])=>url.startsWith('/productos/12000?'))).toBe(true);
  });
  it('una respuesta vieja no reemplaza la búsqueda actual',async()=>{
    let resolveOld:(v:unknown)=>void=()=>{};
    vi.mocked(apiClient).mockImplementation((url)=>url.includes('search=OLD')
      ?new Promise(resolve=>{resolveOld=resolve;})
      :Promise.resolve({data:[product(2,'NEW')],total:1}));
    const {result,rerender}=renderHook(({search})=>useInventoryProducts(true,search),{initialProps:{search:'OLD'}});
    rerender({search:'NEW'});
    await waitFor(()=>expect(result.current.productos[0]?.codigo).toBe('NEW'));
    await act(async()=>resolveOld({data:[product(1,'OLD')],total:1}));
    expect(result.current.productos[0]?.codigo).toBe('NEW');
  });
});

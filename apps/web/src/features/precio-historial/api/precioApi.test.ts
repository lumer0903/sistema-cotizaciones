import {afterEach,describe,it,expect,vi} from 'vitest';
import {apiClient} from '@/lib/apiClient';
import {getProductosConsulta,getHistorialPrecios} from './precioApi';
vi.mock('@/lib/apiClient',()=>({apiClient:vi.fn()}));
vi.mock('@/lib/imageUtils',()=>({getImageUrl:()=>''}));
afterEach(()=>vi.resetAllMocks());
describe('consulta de precios acotada',()=>{
 it('conserva total y página sin descargar el resto del catálogo',async()=>{
  vi.mocked(apiClient).mockResolvedValue({data:[{id_producto:12000,codigo:'P',descripcion:'P',stock_total:1,precios:{precio_unidad_dist:'2388.80'}}],total:10000,page:2,limit:8});
  const result=await getProductosConsulta('page=2&limit=8&search=P');
  expect(result.total).toBe(10000);expect(result.page).toBe(2);
  expect(result.data[0].precioDistribuidor.unidad).toBe(2388.8);
  expect(result.data[0].precioTienda.unidad).toBeNull();
  expect(apiClient).toHaveBeenCalledTimes(1);
  expect(apiClient).toHaveBeenCalledWith('/precios?page=2&limit=8&search=P',{signal:undefined});
 });
 it('conserva historial completo navegable, fecha ISO y actor',async()=>{
  vi.mocked(apiClient).mockResolvedValue({data:[{id_historial:1,campo_modificado:'precio_unidad_normal',fecha_cambio:'2030-04-01T23:30:00Z',actor_nombre:'QA',valor_anterior:'10.10',valor_nuevo:'11.11',evento:'CAMBIO',motivo:'Ajuste'}],total:116,page:2,limit:20});
  const result=await getHistorialPrecios('1','page=2&limit=20');
  expect(result.total).toBe(116);expect(result.data[0].fechaCambio).toBe('2030-04-01T23:30:00Z');expect(result.data[0].usuario).toBe('QA');
 });
});

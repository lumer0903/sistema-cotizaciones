import { afterEach,describe,it,expect,vi } from 'vitest';
import { apiClient,apiErrorMessage,ApiError } from './apiClient';
afterEach(()=>vi.unstubAllGlobals());
describe('errores HTTP del cliente',()=>{
  it('conserva status y mensajes de validación en array',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({message:['cantidad debe ser entera','almacén inválido']}),{status:400,headers:{'Content-Type':'application/json'}})));
    await expect(apiClient('/inventario/movimientos')).rejects.toMatchObject({status:400,message:'cantidad debe ser entera; almacén inválido'});
  });
  it('distingue permisos, inexistencia, error del servidor y error de red',()=>{
    expect(apiErrorMessage(new ApiError(403,'Forbidden'))).toContain('permisos');
    expect(apiErrorMessage(new ApiError(404,'Not Found'))).toContain('recurso');
    expect(apiErrorMessage(new ApiError(500,'Internal error'))).toContain('servidor');
    expect(apiErrorMessage(new TypeError('fetch failed'))).toContain('conectar');
  });
});

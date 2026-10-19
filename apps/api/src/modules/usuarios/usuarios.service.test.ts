import {describe,it,expect,vi} from 'vitest';
import {UsuariosService} from './usuarios.service';
describe('último administrador',()=>{
 it.each([{rol:'vendedor'},{activo:false}])('no permite dejar el sistema sin administrador %j',async data=>{
  const update=vi.fn(); const tx:any={$queryRaw:vi.fn(),usuario:{findFirst:vi.fn().mockResolvedValue({id_usuario:1,activo:true,rol:'admin'}),count:vi.fn().mockResolvedValue(0),update}};
  const db:any={$transaction:(fn:any)=>fn(tx),rol:{findFirst:vi.fn().mockResolvedValue({id_rol:1})}};
  await expect(new UsuariosService(db).update(1,data,2)).rejects.toThrow('único administrador');expect(update).not.toHaveBeenCalled();
 });
});

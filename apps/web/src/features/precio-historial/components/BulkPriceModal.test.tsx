import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {BulkPriceModal} from './BulkPriceModal';
import {apiClient} from '@/lib/apiClient';
vi.mock('@/lib/apiClient',()=>({apiClient:vi.fn(),apiErrorMessage:()=> 'Error de servidor'}));
afterEach(()=>{cleanup();vi.resetAllMocks();vi.unstubAllGlobals();});
it('abre en HTTP interno sin crypto.randomUUID y conserva la clave al reintentar',async()=>{
 const realCrypto=globalThis.crypto;
 vi.stubGlobal('crypto',{getRandomValues:(bytes:Uint8Array)=>realCrypto.getRandomValues(bytes)});
 let writes=0;const saved=vi.fn();
 vi.mocked(apiClient).mockImplementation(async(_path,options)=>{
  if(options?.method==='POST'){writes++;if(writes===1)throw new Error('500');return {success:true};}
  return {total:10};
 });
 render(<BulkPriceModal category="1" categoryName="Flores" onClose={()=>{}} onSaved={saved}/>);
 await screen.findByText(/10 productos de Flores/);
 fireEvent.change(screen.getByLabelText('Porcentaje (negativo para reducir)'),{target:{value:'5'}});
 fireEvent.change(screen.getByLabelText('Motivo'),{target:{value:'Actualización de tarifas'}});
 fireEvent.click(screen.getByRole('button',{name:'Aplicar ajuste'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Error de servidor');
 fireEvent.click(screen.getByRole('button',{name:'Aplicar ajuste'}));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 const bodies=vi.mocked(apiClient).mock.calls.filter(([,o])=>o?.method==='POST').map(([,o])=>JSON.parse(String(o?.body)));
 expect(bodies).toHaveLength(2);expect(bodies[0].clave).toBe(bodies[1].clave);
 expect(bodies[0].clave).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 expect(bodies[0].campos).toHaveLength(6);expect(bodies[0].porcentaje).toBe(5);
});

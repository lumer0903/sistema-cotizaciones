import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {HistorialPrecioModal} from './HistorialPrecioModal';
import {getHistorialPrecios} from '../api/precioApi';
import {ApiError} from '@/lib/apiClient';
vi.mock('../api/precioApi',()=>({getHistorialPrecios:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
const props={open:true,onClose:()=>{},productoId:'12000',codigoProducto:'SKU REAL'};
describe('historial visible y navegable',()=>{
 it('abre cargando y permite otra página con filtros por fecha',async()=>{
  vi.mocked(getHistorialPrecios).mockResolvedValue({data:[{id:1,campoModificado:'precio_unidad_normal',fechaCambio:'2030-04-01T23:30:00Z',usuario:'Actor original',valorAnterior:10,valorNuevo:12,evento:'CAMBIO',motivo:'QA'}],total:116,page:1,limit:24});
  render(<HistorialPrecioModal {...props}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando historial');
  await screen.findByText('Actor original');
  expect(screen.getByText('SKU REAL',{exact:false})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Página siguiente'}));
  await waitFor(()=>expect(vi.mocked(getHistorialPrecios).mock.calls.at(-1)?.[1]).toContain('page=2'));
  fireEvent.change(screen.getByLabelText('Desde (Lima)'),{target:{value:'2030-04-01'}});
  await waitFor(()=>expect(vi.mocked(getHistorialPrecios).mock.calls.at(-1)?.[1]).toContain('fecha_inicio=2030-04-01'));
  expect(vi.mocked(getHistorialPrecios).mock.calls.at(-1)?.[1]).toContain('page=1');
 });
 it('un 403 muestra el error y permite reintentar sin fingir historial vacío',async()=>{
  vi.mocked(getHistorialPrecios).mockRejectedValueOnce(new ApiError(403,'Forbidden')).mockResolvedValueOnce({data:[],total:0,page:1,limit:24});
  render(<HistorialPrecioModal {...props}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('No tiene permisos');
  expect(screen.queryByText(/No hay cambios registrados/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));
  expect(await screen.findByText('No hay cambios registrados en este rango.')).toBeInTheDocument();
 });
});

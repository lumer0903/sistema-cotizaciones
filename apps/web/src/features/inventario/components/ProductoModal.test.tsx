import { it,expect,vi,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { ProductoModal } from './ProductoModal';
import { apiClient } from '@/lib/apiClient';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
vi.mock('@/lib/apiClient',()=>({apiClient:vi.fn(),uploadFile:vi.fn()}));
vi.mock('@/lib/toast',()=>({showToast:{success:vi.fn(),error:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('edita conservando mínimo cero y sin enviar un cambio implícito de almacén',async()=>{
  vi.mocked(apiClient).mockResolvedValue({success:true});
  const product={id_producto:123,codigo:'QA-123',descripcion:'ROSA DE PRUEBA',id_categoria:1,
    tipo_flor:'ROSA',material:'TELA',composicion:'PLASTICO',presentacion:'RAMO',follaje:'VERDE',
    numero_cabezas:1,tamano:'10 CM',unidades_por_caja:1,colores_surtido:['ROJO'],
    stock_minimo:0,stock_principal:5,stock_total:5,activo:true,foto_url:null,
    stock_actual:[{id_almacen:1,cantidad:5,almacen:{id_almacen:1,codigo:'ALM-001',nombre:'Principal'}}],
    precios_actuales:{costo_normal:0,costo_distribuidor:0,precio_unidad_normal:1,precio_docena_normal:1,precio_mayor_normal:1,
      precio_unidad_dist:1,precio_docena_dist:1,precio_mayor_dist:1},
  } as unknown as ProductoInventario;
  render(<ProductoModal open modo="editar" productoInicial={product} onClose={()=>{}} categorias={[{id_categoria:1,nombre_categoria:'Flores'}]} almacenes={[{id_almacen:1,nombre:'Principal'}]} />);
  fireEvent.click(screen.getByRole('button',{name:'Guardar Producto'}));
  await waitFor(()=>expect(apiClient).toHaveBeenCalled());
  const [,options]=vi.mocked(apiClient).mock.calls.find(([url])=>url==='/api/productos/123')!;
  const body=JSON.parse(String(options?.body));
  expect(body.stock_minimo).toBe(0);expect(body).not.toHaveProperty('id_almacen');expect(body.codigo).toBe('QA-123');
});

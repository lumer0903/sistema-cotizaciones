import { afterAll,beforeAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient,Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductosService } from '../productos/productos.service';
import { InventarioService } from './inventario.service';
import { ProductsQueryDto,MovementsQueryDto,AlertsQueryDto,StockQueryDto } from '../../common/dto/inventory-query.dto';
import { MinioService } from '../../common/storage/minio.service';
import { AiCacheRefreshService } from '../ai/infrastructure/ai-cache-refresh.service';
const db=new PrismaClient();
const prisma=db as unknown as PrismaService;
const products=new ProductosService(prisma,{} as MinioService,{refreshCache(){}} as unknown as AiCacheRefreshService);
const inventory=new InventarioService(prisma);
const tag='inventory-regression-'+randomUUID();
const ids:number[]=[],warehouses:number[]=[];
let user:number,category:number,product:number;
const q=<T>(ctor:new()=>T,values:Partial<T>)=>Object.assign(new ctor() as object,values) as T;
beforeAll(async()=>{
 if(!new URL(process.env.DATABASE_URL!).pathname.startsWith('/pricing_qa_')) throw new Error('Use auditoria-precios/run-regression.cjs: estas pruebas requieren una base QA efímera');
  user=(await db.usuario.create({data:{nombre:tag,email:tag+'@test.invalid',password_hash:'fixture'}})).id_usuario;
  category=(await db.categoria.create({data:{nombre_categoria:tag}})).id_categoria;
  for(let i=0;i<2;i++)warehouses.push((await db.almacen.create({data:{codigo:tag+i,nombre:tag}})).id_almacen);
  const created=await products.create({codigo:tag,descripcion:tag,id_categoria:category,id_almacen:warehouses[0],
    tipo_flor:'QA',material:'QA',composicion:'QA',presentacion:'QA',numero_cabezas:1,tamano:'QA',
    unidades_por_caja:1,stock_principal:5,stock_minimo:10,colores_surtido:['QA'],
    precio_tienda_unidad:1,precio_tienda_docena:1,precio_tienda_caja:1,
    precio_distribuidor_unidad:1,precio_distribuidor_docena:1,precio_distribuidor_caja:1},user);
  product=created.id_producto;ids.push(product);
},30000);
afterAll(async()=>{await db.$disconnect();});

describe('regresiones de inventario con PostgreSQL',()=>{
  it('alta respeta almacén, registra actor y genera alerta',async()=>{
    const stocks=await db.stockActual.findMany({where:{id_producto:product}});
    expect(stocks).toHaveLength(1);expect(stocks[0].id_almacen).toBe(warehouses[0]);
    expect((await db.inventarioMovimiento.findFirstOrThrow({where:{id_producto:product}})).id_usuario).toBe(user);
    expect(await db.alertas_stock.count({where:{id_producto:product,estado:'activa'}})).toBe(1);
  });
  it('filtros y stock visible corresponden al almacén',async()=>{
    expect((await products.findAllFiltered(q(ProductsQueryDto,{id_categoria:2147483647}))).total).toBe(0);
    expect((await products.findAllFiltered(q(ProductsQueryDto,{id_almacen:2147483647}))).total).toBe(0);
    const res=await products.findAllFiltered(q(ProductsQueryDto,{search:tag,id_categoria:category,id_almacen:warehouses[0],stock_status:'bajo',include:'stock'}));
    expect(res.total).toBe(1);expect(res.data[0].stock_filtrado).toBe(5);
    const stock=await inventory.getStockActual(q(StockQueryDto,{limit:1}));
    expect(stock.data).toHaveLength(1);expect(stock.total).toBeGreaterThan(1);
  });
  it('ajuste negativo y costo cero persisten sin perder auditoría',async()=>{
    const m=await inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'ajuste',origen:'ajuste_fisico',cantidad:-2,costo_unitario:0},user);
    expect(m.stock_posterior).toBe(3);expect(m.costo_unitario).toBe(0);
    await inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'ajuste',origen:'ajuste_fisico',cantidad:2},user);
  });
  it('rechaza desbordamientos de stock sin modificar saldos',async()=>{
    await expect(inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'entrada',origen:'compra',cantidad:2147483647},user)).rejects.toThrow('capacidad');
    expect((await db.producto.findUniqueOrThrow({where:{id_producto:product}})).stock_total).toBe(5);
  });
  it('rechaza etiquetas inconsistentes y transferencias unilaterales',async()=>{
    await expect(inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'entrada',origen:'merma',cantidad:1},user)).rejects.toThrow();
    await expect(inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'entrada',origen:'transferencia',cantidad:1},user)).rejects.toThrow();
  });
  it('fallo intermedio revierte stock y movimientos de transferencia',async()=>{
    const count=await db.inventarioMovimiento.count({where:{id_producto:product}});
    await expect(inventory.createTransferencia(product,warehouses[0],warehouses[1],3,-1)).rejects.toThrow();
    expect((await db.stockActual.findFirstOrThrow({where:{id_producto:product,id_almacen:warehouses[0]}})).cantidad).toBe(5);
    expect(await db.inventarioMovimiento.count({where:{id_producto:product}})).toBe(count);
    expect(await db.stockActual.count({where:{id_producto:product,id_almacen:warehouses[1]}})).toBe(0);
  });
  it('transferencia vincula respuestas y conserva total',async()=>{
    const t=await inventory.createTransferencia(product,warehouses[0],warehouses[1],3,user);
    expect(t.salida.id_referencia).toBe(t.entrada.id_movimiento);
    expect(t.entrada.id_referencia).toBe(t.salida.id_movimiento);
    expect((await db.producto.findUniqueOrThrow({where:{id_producto:product}})).stock_total).toBe(5);
    const result=await inventory.getKardex(product,q(MovementsQueryDto,{tipo:'transferencia'}));
    expect(result.total).toBe(2);
  });
  it('retiros concurrentes no sobre venden',async()=>{
    const attempts=await Promise.allSettled([1,2].map(()=>inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'salida',origen:'venta',cantidad:2},user)));
    expect(attempts.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await db.stockActual.findFirstOrThrow({where:{id_producto:product,id_almacen:warehouses[0]}})).cantidad).toBe(0);
  });
  it('edición sincroniza alertas de todos los almacenes y registra actor',async()=>{
    await products.update(product,{stock_principal:1},user);
    const main=await db.stockActual.findFirstOrThrow({where:{id_producto:product,almacen:{codigo:'ALM-001'}}});
    expect(await db.alertas_stock.count({where:{id_producto:product,id_almacen:main.id_almacen,estado:'activa'}})).toBe(1);
    expect((await db.inventarioMovimiento.findFirstOrThrow({where:{id_producto:product,id_almacen:main.id_almacen}})).id_usuario).toBe(user);
    await products.update(product,{stock_minimo:0,activo:false},user);
    expect((await products.findAllFiltered(q(ProductsQueryDto,{search:tag,activo:true}))).total).toBe(0);
    expect((await products.findAllFiltered(q(ProductsQueryDto,{search:tag,activo:false}))).total).toBe(1);
    expect(await db.alertas_stock.count({where:{id_producto:product,id_almacen:main.id_almacen,estado:'resuelta'}})).toBe(1);
  });
  it('reconocer no resuelve escasez y Todas incluye otros estados',async()=>{
    const a=await db.alertas_stock.findFirstOrThrow({where:{id_producto:product,id_almacen:warehouses[0]}});
    expect((await inventory.reconocerAlerta(a.id_alerta)).estado).toBe('reconocida');
    const all=await inventory.getAlertasStock(q(AlertsQueryDto,{estado:'todas',limit:1000}));
    expect(all.data.find(x=>x.id_alerta===a.id_alerta)?.producto?.codigo).toBe(tag);
    const open=await inventory.getAlertasStock(q(AlertsQueryDto,{estado:'abiertas',limit:1000}));
    expect(open.data.some(x=>x.id_alerta===a.id_alerta)).toBe(true);
  });
  it('intervalo de Lima incluye 23:59 y excluye siguiente 00:00',async()=>{
    const m1=await inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'entrada',origen:'compra',cantidad:1},user);
    const m2=await inventory.createMovimiento({id_producto:product,id_almacen:warehouses[0],tipo:'entrada',origen:'compra',cantidad:1},user);
    await db.inventarioMovimiento.update({where:{id_movimiento:m1.id_movimiento},data:{created_at:new Date('2030-03-02T04:59:59.999Z')}});
    await db.inventarioMovimiento.update({where:{id_movimiento:m2.id_movimiento},data:{created_at:new Date('2030-03-02T05:00:00Z')}});
    const result=await inventory.getKardex(product,q(MovementsQueryDto,{fecha_inicio:'2030-03-01',fecha_fin:'2030-03-01'}));
    expect(result.data.map(m=>m.id_movimiento)).toEqual([m1.id_movimiento]);
  });
  it('CHECK rechaza negativos aunque se omita la API',async()=>{
    await expect(db.$executeRaw(Prisma.sql`UPDATE stock_actual SET cantidad=-1 WHERE id_producto=${product}`)).rejects.toThrow();
    await expect(db.$executeRaw(Prisma.sql`UPDATE precios_actuales SET costo_normal=-1 WHERE id_producto=${product}`)).rejects.toThrow();
    await expect(db.$executeRaw(Prisma.sql`UPDATE alertas_stock SET stock_actual=-1 WHERE id_producto=${product}`)).rejects.toThrow();
  });
  it('CSV recorre más de 10.000 movimientos sin truncamiento',async()=>{
    const p=await db.producto.create({data:{codigo:tag+'-csv',descripcion:tag}});ids.push(p.id_producto);
    await db.$executeRaw(Prisma.sql`INSERT INTO inventario_movimientos(id_producto,id_almacen,tipo,origen,cantidad,stock_anterior,stock_posterior,observaciones)
      SELECT ${p.id_producto},${warehouses[0]},'entrada'::"TipoMovimiento",'compra'::"OrigenMovimiento",1,g-1,g,
        CASE WHEN g=10001 THEN 'FIN_CSV_10001' ELSE 'QA' END FROM generate_series(1,10001) g`);
    let text='';for await(const chunk of inventory.exportKardex(p.id_producto,{}))text+=chunk;
    expect(text).toContain('FIN_CSV_10001');expect(text.trim().split('\r\n')).toHaveLength(10002);
  },30000);
  it('orden por stock respeta asc/desc antes de paginar',async()=>{
    const p=await db.producto.create({data:{codigo:tag+'-sort',descripcion:tag,stock_total:100,
      stock_actual:{create:{id_almacen:warehouses[0],cantidad:100}},
      movimientos:{create:{id_almacen:warehouses[0],tipo:'entrada',origen:'compra',cantidad:100,stock_anterior:0,stock_posterior:100,id_usuario:user}}}});
    const asc=await products.findAllFiltered(q(ProductsQueryDto,{search:tag,id_almacen:warehouses[0],sortBy:'stock_estado',sortOrder:'asc'}));
    const desc=await products.findAllFiltered(q(ProductsQueryDto,{search:tag,id_almacen:warehouses[0],sortBy:'stock_estado',sortOrder:'desc'}));
    expect(asc.data[0].id_producto).toBe(product);expect(desc.data[0].id_producto).toBe(p.id_producto);
  });
  it('producto inexistente y eliminado retornan error de dominio',async()=>{
    await expect(products.findById(2147483647)).rejects.toThrow('Producto no encontrado');
    await products.delete(product);
    await expect(products.update(product,{stock_principal:1},user)).rejects.toThrow('Producto no encontrado');
  });
});

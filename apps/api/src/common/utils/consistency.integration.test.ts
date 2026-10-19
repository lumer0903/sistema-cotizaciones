import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { registrarPagoSeguro } from './pagos.util';
import { InventarioService } from '../../modules/inventario/inventario.service';
import { ProductosService } from '../../modules/productos/productos.service';
import { NotificacionesService } from '../../modules/notificaciones/notificaciones.service';
import { ReportesService } from '../../modules/reportes/reportes.service';
import { CotizacionesService } from '../../modules/cotizaciones/cotizaciones.service';
const db = new PrismaClient();
const tag='regression-'+randomUUID();
let user:number, other:number, client:number, cot:number, product:number, warehouse:number;
beforeAll(async()=>{
 if(!new URL(process.env.DATABASE_URL!).pathname.startsWith('/pricing_qa_')) throw new Error('Use auditoria-precios/run-regression.cjs: estas pruebas requieren una base QA efímera');
 user=(await db.usuario.create({data:{nombre:tag,email:tag+'@test.invalid',password_hash:'test-only'}})).id_usuario;
 other=(await db.usuario.create({data:{nombre:tag,email:tag+'-other@test.invalid',password_hash:'test-only'}})).id_usuario;
 client=(await db.cliente.create({data:{nombre:tag}})).id_cliente;
 cot=(await db.cotizacion.create({data:{numero:tag,id_usuario:user,id_cliente:client,estado:'enviada',subtotal:100,total:100,incluye_carreta:false,costo_carreta:0}})).id_cotizacion;
 product=(await db.producto.create({data:{codigo:tag,descripcion:tag,stock_minimo:0}})).id_producto;
 warehouse=(await db.almacen.create({data:{codigo:tag,nombre:tag}})).id_almacen;
},20000);
afterAll(async()=>{await db.$disconnect();});

describe('integridad con PostgreSQL real y registros temporales',()=>{
 it('dos pagos simultáneos no superan el saldo',async()=>{
  const results=await Promise.allSettled([1,2].map(i=>registrarPagoSeguro(db as any,cot,{monto:70,metodo_pago:'efectivo',clave_idempotencia:tag+i},user,user)));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const sum=await db.cotizacionPago.aggregate({where:{id_cotizacion:cot},_sum:{monto:true}});expect(Number(sum._sum.monto)).toBe(70);
 });
 it('reintentar el mismo abono no lo duplica ni acepta otros datos',async()=>{
  const data={monto:30,metodo_pago:'efectivo',clave_idempotencia:tag+'retry'};
  await Promise.all([registrarPagoSeguro(db as any,cot,data,user,user),registrarPagoSeguro(db as any,cot,data,user,user)]);
  expect(await db.cotizacionPago.count({where:{id_cotizacion:cot}})).toBe(2);
  await expect(registrarPagoSeguro(db as any,cot,{...data,monto:20},user,user)).rejects.toThrow('otros datos');
 });
 it('movimientos paralelos conservan cantidades y agregados',async()=>{
  const inventory=new InventarioService(db as any);
  await Promise.all([1,2,3].map(()=>inventory.createMovimiento({id_producto:product,id_almacen:warehouse,tipo:'entrada',origen:'compra',cantidad:10} as any,user)));
  expect((await db.stockActual.findUniqueOrThrow({where:{id_producto_id_almacen:{id_producto:product,id_almacen:warehouse}}})).cantidad).toBe(30);
  expect((await db.producto.findUniqueOrThrow({where:{id_producto:product}})).stock_total).toBe(30);
 });
 it('editar precios deja auditoría y conserva stock de otros almacenes',async()=>{
  const products=new ProductosService(db as any,{} as any,{refreshCache:()=>{}} as any);
  await products.update(product,{precio_tienda_unidad:12},user);
  expect(await db.historialPrecios.count({where:{id_producto:product,id_usuario:user}})).toBe(8);
  expect((await db.producto.findUniqueOrThrow({where:{id_producto:product}})).stock_total).toBe(30);
 });
 it('las lecturas pertenecen a cada usuario y rechazan cotizaciones ajenas',async()=>{
  const notifications=new NotificacionesService(db as any);
  await notifications.marcarLeida('COBRANZA_PENDIENTE',cot,{id_usuario:user,rol:'vendedor',email:'x',permisos:{cobranza:'lectura'}} as any);
  expect(await db.notificacionLectura.count({where:{id_usuario:other}})).toBe(0);
  await expect(notifications.marcarLeida('COBRANZA_PENDIENTE',cot,{id_usuario:other,rol:'vendedor',email:'x',permisos:{cobranza:'lectura'}} as any)).rejects.toThrow();
 });
 it('el reporte incluye deuda parcial y aplica límites de fecha independientes',async()=>{
  const debt=await db.cotizacion.create({data:{numero:tag+'-debt',id_usuario:user,id_cliente:client,estado:'parcialmente_pagada',subtotal:100,total:100,incluye_carreta:false,costo_carreta:0,fecha_vencimiento:new Date(Date.now()-30.5*86400000)}});
  await db.cotizacionPago.create({data:{id_cotizacion:debt.id_cotizacion,id_usuario:user,monto:20,metodo_pago:'efectivo'}});
  const reports=new ReportesService(db as any);
  const result=await reports.getAntiguedadDeuda({idVendedor:user});
  expect(result.total).toBe(1);expect(result.data[0].totalPendiente).toBe(80);expect(result.data[0].d31_60).toBe(80);
  expect((await reports.getAntiguedadDeuda({idVendedor:other})).total).toBe(0);
  expect((await reports.getAntiguedadDeuda({idVendedor:user,fechaInicio:'2099-01-01'})).total).toBe(0);
  expect((await reports.getAntiguedadDeuda({idVendedor:user,fechaFin:'2000-01-01'})).total).toBe(0);
 });
 it('la numeración se reserva al crear, aunque dos clientes envíen la misma vista previa',async()=>{
  const quotes=new CotizacionesService(db as any);
  const payload={id_cliente:client,numero:'COT-999',incluye_carreta:false,detalle:[{id_producto:product,tipo_venta:'unidad',cantidad:1,precio_unitario:12}]};
  const created=await Promise.all([quotes.crear(payload as any,user),quotes.crear(payload as any,user)]);
  expect(created[0].numero).not.toBe(created[1].numero);
 });
});

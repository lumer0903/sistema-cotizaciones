require('/app/apps/api/node_modules/reflect-metadata');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('/app/apps/api/node_modules/@prisma/client');
const {Test}=require('/app/apps/api/node_modules/@nestjs/testing');
const {ValidationPipe}=require('/app/apps/api/node_modules/@nestjs/common');
const {Reflector}=require('/app/apps/api/node_modules/@nestjs/core');
const jwt=require('/app/apps/api/node_modules/jsonwebtoken');
const load=p=>require('/app/apps/api/dist/'+p);
const {ProductosController}=load('modules/productos/productos.controller');
const {ProductosService}=load('modules/productos/productos.service');
const {PricingController}=load('modules/precios/pricing.controller');
const {PricingService}=load('modules/precios/pricing.service');
const {HistorialPreciosController}=load('modules/historial-precios/historial-precios.controller');
const {HistorialPreciosService}=load('modules/historial-precios/historial-precios.service');
const {JwtAuthGuard}=load('modules/auth/infrastructure/jwt-auth.guard');
const {JwtStrategy}=load('modules/auth/infrastructure/jwt.strategy');
const {MinioService}=load('common/storage/minio.service');
const {setPriceActor}=load('common/utils/precios.util');
const {InventarioService}=load('modules/inventario/inventario.service');
if(!/^pricing_qa_\d+$/.test(process.env.PRICING_QA_DATABASE||''))throw new Error('Base QA aislada requerida');
const db=new PrismaClient({log:[{emit:'event',level:'query'}]});
let queryCount=0;db.$on('query',()=>queryCount++);
let app,base,token,seller,id,actor,category;
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function req(path,method='GET',body,bearer=token){
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},
 body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,data:await r.json()};
}
async function main(){
 for(const codigo of ['admin','vendedor'])await db.rol.create({data:{codigo,nombre:codigo}});
 actor=(await db.usuario.create({data:{nombre:'QA Admin',email:'qa-admin@test.invalid',password_hash:'fixture',rol:'admin'}})).id_usuario;
 const sellerId=(await db.usuario.create({data:{nombre:'QA Consulta',email:'qa-consulta@test.invalid',password_hash:'fixture',rol:'vendedor'}})).id_usuario;
 await db.usuarioPermiso.createMany({data:[{id_usuario:sellerId,modulo:'consulta_precios',nivel:'lectura'},{id_usuario:sellerId,modulo:'productos',nivel:'sin_acceso'}]});
 token=jwt.sign({id_usuario:actor,session_version:0},process.env.JWT_SECRET,{expiresIn:'10m'});
 seller=jwt.sign({id_usuario:sellerId,session_version:0},process.env.JWT_SECRET,{expiresIn:'10m'});
 category=(await db.categoria.create({data:{nombre_categoria:'QA Precios'}})).id_categoria;
 const wh=(await db.almacen.create({data:{codigo:'ALM-001',nombre:'QA'}})).id_almacen;
 const products=new ProductosService(db,{}, {refreshCache(){}});
 const pricing=new PricingService(db),history=new HistorialPreciosService(db);
 const module=await Test.createTestingModule({controllers:[ProductosController,PricingController,HistorialPreciosController],
 providers:[{provide:ProductosService,useValue:products},{provide:PricingService,useValue:pricing},{provide:HistorialPreciosService,useValue:history},
 {provide:MinioService,useValue:{}},{provide:JwtStrategy,useFactory:()=>new JwtStrategy(db)},
 {provide:JwtAuthGuard,inject:[Reflector],useFactory:r=>new JwtAuthGuard(r)}]}).compile();
 app=module.createNestApplication();
 app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true}));
 await app.listen(0,'127.0.0.1');base=await app.getUrl();
 const payload={codigo:'QA-PRECIO',descripcion:'QA PRECIOS',id_categoria:category,id_almacen:wh,tipo_flor:'QA',material:'QA',composicion:'QA',
 presentacion:'QA',numero_cabezas:1,tamano:'QA',unidades_por_caja:12,stock_principal:10,stock_minimo:5,colores_surtido:['QA'],
 costo_normal:6,costo_distribuidor:5,precio_tienda_unidad:10,precio_tienda_docena:9,precio_tienda_caja:8,
 precio_distribuidor_unidad:9,precio_distribuidor_docena:8,precio_distribuidor_caja:7};
 await check('creación registra los ocho importes con actor',async()=>{
  const r=await req('/productos','POST',payload);assert.equal(r.status,201,JSON.stringify(r.data));id=r.data.data.id_producto;
  assert.equal(await db.historialPrecios.count({where:{id_producto:id,evento:'CREACION',id_usuario:actor}}),8);
 });
 await check('PATCH parcial conserva omitidos y registra un cambio',async()=>{
  const r=await req('/productos/'+id+'/precios','PATCH',{precio_unidad_normal:12});assert.equal(r.status,200,JSON.stringify(r.data));
  const prices=await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}});
  assert.equal(prices.precio_unidad_normal.toFixed(2),'12.00');assert.equal(prices.costo_normal.toFixed(2),'6.00');
  assert.equal(await db.historialPrecios.count({where:{id_producto:id,evento:'CAMBIO'}}),1);
 });
 await check('no-op no produce eventos',async()=>{
  await req('/productos/'+id+'/precios','PATCH',{precio_unidad_normal:12});
  assert.equal(await db.historialPrecios.count({where:{id_producto:id}}),9);
 });
 await check('payloads monetarios inválidos son 400',async()=>{
  for(const value of [null,' ',true,'abc',-1,1.234,100000000]){
   const r=await req('/productos/'+id+'/precios','PATCH',{precio_unidad_normal:value});assert.equal(r.status,400,JSON.stringify({value,...r}));
  }
  assert.equal((await req('/productos/'+id+'/precios','PATCH',{})).status,400);
 });
 await check('jerarquía fusionada se valida y bajo costo se permite',async()=>{
  assert.equal((await req('/productos/'+id+'/precios','PATCH',{precio_docena_normal:100})).status,400);
  assert.equal((await req('/productos/'+id+'/precios','PATCH',{costo_normal:100})).status,200);
 });
 await check('editar producto conserva costos omitidos y rechaza null',async()=>{
  assert.equal((await req('/productos/'+id,'PATCH',{descripcion:'QA EDITADO'})).status,200);
  assert.equal((await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).costo_normal.toFixed(2),'100.00');
  assert.equal((await req('/productos/'+id,'PATCH',{costo_normal:null})).status,400);
 });
 await check('actor inválido revierte precio e historial',async()=>{
  const count=await db.historialPrecios.count({where:{id_producto:id}});
  await assert.rejects(()=>products.updatePrecios(id,{precio_unidad_normal:13},2147483647));
  assert.equal((await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal.toFixed(2),'12.00');
  assert.equal(await db.historialPrecios.count({where:{id_producto:id}}),count);
 });
 await check('concurrencia mantiene continuidad del historial',async()=>{
  await Promise.all([13,14].map(v=>products.updatePrecios(id,{precio_unidad_normal:v},actor)));
  const rows=await db.historialPrecios.findMany({where:{id_producto:id,campo_modificado:'precio_unidad_normal'},orderBy:{id_historial:'asc'}});
  for(let i=1;i<rows.length;i++)assert.equal(rows[i].valor_anterior.toFixed(2),rows[i-1].valor_nuevo.toFixed(2));
 });
 await check('escritor directo requiere actor y registra auditoría',async()=>{
  await assert.rejects(()=>db.preciosActuales.update({where:{id_producto:id},data:{precio_unidad_normal:15}}));
  await db.$transaction(async tx=>{await setPriceActor(tx,actor,'Importación de prueba');await tx.preciosActuales.update({where:{id_producto:id},data:{precio_unidad_normal:15}});});
  assert.equal(await db.historialPrecios.count({where:{id_producto:id,motivo:'Importación de prueba'}}),1);
 });
 await check('ledger no permite insertar, alterar, borrar o truncar',async()=>{
  const row=await db.historialPrecios.findFirstOrThrow({where:{id_producto:id}});
  await assert.rejects(()=>db.historialPrecios.update({where:{id_historial:row.id_historial},data:{valor_nuevo:999}}));
  await assert.rejects(()=>db.historialPrecios.delete({where:{id_historial:row.id_historial}}));
  await assert.rejects(()=>db.historialPrecios.create({data:{id_producto:id,campo_modificado:'costo_normal',valor_anterior:1,valor_nuevo:2}}));
  await assert.rejects(()=>db.$executeRawUnsafe('TRUNCATE historial_precios'));
 });
 await check('DB rechaza NaN y precios negativos',async()=>{
  for(const value of ['NaN','-1'])await assert.rejects(()=>db.$transaction(async tx=>{
   await setPriceActor(tx,actor);await tx.$executeRawUnsafe("UPDATE precios_actuales SET costo_normal='"+value+"' WHERE id_producto="+id);
  }));
 });
 await check('consulta tiene permisos independientes y no expone costos',async()=>{
  const r=await req('/precios?limit=1','GET',undefined,seller);assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.data.length,1);assert.equal(r.data.data[0].precios.costo_normal,undefined);
  assert.equal((await req('/historial-precios','GET',undefined,seller)).status,403);
 });
 await check('filtros y validación de consultas exactos',async()=>{
  const r=await req('/precios?tipo_precio=precio_unidad_normal&precio_min=15&precio_max=15&id_categoria='+category+'&search=QA-PRECIO&activo=true');
  assert.equal(r.status,200);assert.equal(r.data.total,1);
  assert.equal((await req('/precios?tipo_precio=precio_unidad_dist&precio_min=15')).data.total,0);
  for(const q of ['id_producto=NaN','limit=1.5','take=1','fecha_inicio=2030-02-30','fecha_inicio=incorrecta','cursor=9999999999999999999999'])
   assert.equal((await req('/historial-precios?'+q)).status,400,q);
  assert.equal((await req('/historial-precios/2147483647')).status,404);
 });
 await check('búsqueda trata porcentajes y guiones bajos como texto literal',async()=>{
  await db.producto.create({data:{codigo:'QA%_LITERAL',descripcion:'SKU literal'}});
  const r=await req('/precios?search='+encodeURIComponent('QA%_'));
  assert.equal(r.status,200);assert.equal(r.data.total,1);assert.equal(r.data.data[0].codigo,'QA%_LITERAL');
 });
 await check('historial navega más de 100 eventos sin duplicarlos',async()=>{
  for(let i=0;i<110;i++)await products.updatePrecios(id,{precio_unidad_normal:20+i},actor);
  const first=await req('/historial-precios?id_producto='+id+'&limit=20');
  assert.ok(first.data.total>100);let cursor=null,seen=new Set();
  do{
   const r=await req('/historial-precios?id_producto='+id+'&limit=20&incluir_total=false'+(cursor?'&cursor='+cursor:''));
   assert.equal(r.status,200,JSON.stringify(r.data));
   for(const row of r.data.data){assert.ok(!seen.has(row.id_historial));seen.add(row.id_historial);}
   cursor=r.data.next_cursor;
  }while(cursor);
  assert.equal(seen.size,first.data.total);
 });
 await check('rango de hoy Lima incluye el día completo y rechaza inversión',async()=>{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const all=await req('/historial-precios?id_producto='+id);
  const ranged=await req('/historial-precios?id_producto='+id+'&fecha_inicio='+today+'&fecha_fin='+today);
  assert.equal(ranged.status,200);assert.equal(ranged.data.total,all.data.total);
  assert.equal((await req('/historial-precios?fecha_inicio=2030-04-02&fecha_fin=2030-04-01')).status,400);
 });
 await check('ajuste masivo atómico, Decimal e idempotente',async()=>{
  const before=(await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal;
  const body={clave:randomUUID(),id_categoria:category,campos:['precio_unidad_normal'],porcentaje:10,motivo:'QA ajuste'};
  const r=await req('/precios/ajustes-masivos','POST',body);assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.actualizados,1);
  assert.equal((await req('/precios/ajustes-masivos','POST',body)).status,201);
  const after=(await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal;
  assert.equal(after.toFixed(2),before.mul('1.1').toDecimalPlaces(2).toFixed(2));
  assert.equal((await req('/precios/ajustes-masivos','POST',{...body,porcentaje:20})).status,409);
  assert.equal((await req('/precios/ajustes-masivos','POST',body,seller)).status,403);
  const noop=await req('/precios/ajustes-masivos','POST',{...body,clave:randomUUID(),porcentaje:0});assert.equal(noop.status,201);assert.equal(noop.data.actualizados,0);
 });
 await check('ajustes concurrentes con la misma clave se aplican una sola vez',async()=>{
  const before=(await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal;
  const body={clave:randomUUID(),id_categoria:category,campos:['precio_unidad_normal'],porcentaje:1,motivo:'QA reintento concurrente'};
  const results=await Promise.all([req('/precios/ajustes-masivos','POST',body),req('/precios/ajustes-masivos','POST',body)]);
  assert.ok(results.every(r=>r.status===201),JSON.stringify(results));
  assert.equal((await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal.toFixed(2),before.mul('1.01').toDecimalPlaces(2).toFixed(2));
  for(const percentage of [-100,1001,'10',null])assert.equal((await req('/precios/ajustes-masivos','POST',{...body,clave:randomUUID(),porcentaje:percentage})).status,400);
 });
 await check('ajuste que rompe jerarquía revierte todo el lote',async()=>{
  const before=await db.historialPrecios.count();
  const r=await req('/precios/ajustes-masivos','POST',{clave:randomUUID(),id_categoria:category,campos:['precio_mayor_normal'],porcentaje:1000,motivo:'QA inválido'});
  assert.equal(r.status,400,JSON.stringify(r.data));assert.equal(await db.historialPrecios.count(),before);
 });
 await check('fila inexistente se inicializa aun con ocho ceros',async()=>{
  const p=await db.producto.create({data:{codigo:'QA-ZERO',descripcion:'QA ZERO'}});
  const zero={costo_normal:0,costo_distribuidor:0,precio_unidad_normal:0,precio_docena_normal:0,precio_mayor_normal:0,precio_unidad_dist:0,precio_docena_dist:0,precio_mayor_dist:0};
  assert.equal((await req('/productos/'+p.id_producto+'/precios','PATCH',zero)).status,200);
  assert.equal(await db.historialPrecios.count({where:{id_producto:p.id_producto,evento:'CREACION'}}),8);
 });
 if(!process.env.PRICING_QA_FAST) await check('escala real: 10000 productos, 100000+ eventos y lote completo',async()=>{
  const cat=(await db.categoria.create({data:{nombre_categoria:'QA ESCALA'}})).id_categoria;
  await db.$transaction(async tx=>{
   await setPriceActor(tx,actor,'QA escala');
   await tx.$executeRaw`INSERT INTO productos(codigo,descripcion,id_categoria,created_at,updated_at)
    SELECT 'QA-SCALE-'||g,'QA SCALE FLOR '||g,${cat},now(),now() FROM generate_series(1,10000) g`;
   await tx.$executeRaw`INSERT INTO precios_actuales(id_producto,costo_normal,precio_unidad_normal,precio_docena_normal,precio_mayor_normal,costo_distribuidor,precio_unidad_dist,precio_docena_dist,precio_mayor_dist,updated_at)
    SELECT id_producto,6,20+(id_producto%1000)/100.0,18+(id_producto%1000)/100.0,16+(id_producto%1000)/100.0,
     5,18+(id_producto%1000)/100.0,16+(id_producto%1000)/100.0,14+(id_producto%1000)/100.0,now()
    FROM productos WHERE id_categoria=${cat}`;
   await tx.$executeRaw`UPDATE precios_actuales a SET precio_unidad_normal=precio_unidad_normal+0.50,precio_unidad_dist=precio_unidad_dist+0.50
    FROM productos p WHERE p.id_producto=a.id_producto AND p.id_categoria=${cat}`;
  },{timeout:120000});
  assert.ok(await db.historialPrecios.count()>=100000);
  const times=[],historyTimes=[];
  for(let wave=0;wave<4;wave++)await Promise.all(Array.from({length:5},async()=>{
   let started=performance.now();const r=await req('/precios?limit=50&id_categoria='+cat+'&tipo_precio=precio_unidad_normal&precio_min=22&precio_max=23');
   times.push(performance.now()-started);assert.equal(r.status,200);assert.ok(r.data.data.length<=50);assert.ok(r.data.total>50);
   started=performance.now();const h=await req('/historial-precios?limit=50&incluir_total=false');
   historyTimes.push(performance.now()-started);assert.equal(h.status,200);assert.equal(h.data.data.length,50);
  }));
  const started=performance.now();
  const pending=req('/precios/ajustes-masivos','POST',{clave:randomUUID(),id_categoria:cat,campos:['precio_unidad_normal','precio_docena_normal','precio_mayor_normal','precio_unidad_dist','precio_docena_dist','precio_mayor_dist'],porcentaje:1,motivo:'QA escala masiva'});
  let overlapping=false;
  for(let i=0;i<30;i++){
   const activity=await db.$queryRaw`SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active' AND query LIKE 'WITH changed AS%'`;
   if(activity[0].total){overlapping=true;break;}
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  const target=await db.producto.findFirstOrThrow({where:{id_categoria:cat},orderBy:{id_producto:'asc'},select:{id_producto:true}});
  const stockStart=performance.now();
  await new InventarioService(db).createMovimiento({id_producto:target.id_producto,id_almacen:wh,tipo:'entrada',origen:'compra',cantidad:1},actor);
  const stockDuringBulkMs=performance.now()-stockStart;
  const r=await pending;
  assert.ok(overlapping,'Se debe medir stock mientras el ajuste está activo');
  assert.ok(stockDuringBulkMs<2000,'Stock no debe esperar al ajuste completo');
  assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.actualizados,10000);
  const p=(a,q)=>+a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*q)-1].toFixed(2);
  console.log(JSON.stringify({scale:{products:10000,history:await db.historialPrecios.count(),concurrency:5,samples:20,
   pricing:{p50:p(times,.5),p95:p(times,.95),max:Math.max(...times)},
   historyPage:{p50:p(historyTimes,.5),p95:p(historyTimes,.95)},stockDuringBulkMs:+stockDuringBulkMs.toFixed(2),bulkMs:+(performance.now()-started).toFixed(2)}}));
 });
 if(!process.env.PRICING_QA_FAST) await check('consultas relacionales permanecen constantes al aumentar la página',async()=>{
  queryCount=0;await pricing.list({page:1,limit:1});const small=queryCount;
  queryCount=0;await pricing.list({page:1,limit:50});const large=queryCount;
  assert.equal(small,large);
  queryCount=0;await history.findAll(1,1,{});const hs=queryCount;
  queryCount=0;await history.findAll(1,50,{});const hl=queryCount;
  assert.equal(hs,hl);console.log(JSON.stringify({queryCounts:{catalog:[small,large],history:[hs,hl]}}));
 });
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();await db.$disconnect();});

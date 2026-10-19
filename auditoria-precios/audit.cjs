const {PrismaClient,Prisma}=require('/app/apps/api/node_modules/@prisma/client');
const jwt=require('/app/apps/api/node_modules/jsonwebtoken');
const {ProductosService}=require('/app/apps/api/dist/modules/productos/productos.service.js');
const {HistorialPreciosService}=require('/app/apps/api/dist/modules/historial-precios/historial-precios.service.js');
let queries=0;const db=new PrismaClient({log:[{emit:'event',level:'query'}]});db.$on('query',()=>queries++);
const tag='QA-PRICE-'+Date.now();const out={checks:[],http:[],queryCounts:[]};let vendor;
const check=(name,actual,expected)=>out.checks.push({name,actual,expected,passed:JSON.stringify(actual)===JSON.stringify(expected)});
async function main(){
const actor=await db.usuario.findFirstOrThrow({where:{rol:'admin',activo:true,deleted_at:null},select:{id_usuario:true,session_version:true,rol:true}});
const token=jwt.sign(actor,process.env.JWT_SECRET,{expiresIn:'10m'});
const products=new ProductosService(db,{}, {refreshCache(){}});const history=new HistorialPreciosService(db);
async function req(path,method='GET',body,bearer=token){const start=performance.now();const r=await fetch('http://127.0.0.1:3001/api'+path,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const data=await r.json();out.http.push({path,method,status:r.status,rows:Array.isArray(data.data)?data.data.length:undefined,total:data.total,ms:+(performance.now()-start).toFixed(2)});return{status:r.status,data};}
const wh=await db.almacen.findFirstOrThrow({where:{codigo:'ALM-001'}}),cat=await db.categoria.findFirstOrThrow();
const payload={codigo:tag,descripcion:tag,id_categoria:cat.id_categoria,id_almacen:wh.id_almacen,tipo_flor:'QA',material:'QA',composicion:'QA',presentacion:'QA',numero_cabezas:1,tamano:'QA',unidades_por_caja:1,stock_principal:0,stock_minimo:0,colores_surtido:['QA'],costo_normal:5,costo_distribuidor:4,precio_tienda_unidad:10,precio_tienda_docena:8,precio_tienda_caja:7,precio_distribuidor_unidad:9,precio_distribuidor_docena:7,precio_distribuidor_caja:6};
const created=await req('/productos','POST',payload);if(created.status!==201)throw Error('Fixture create failed');const id=created.data.data.id_producto;
check('Initial price snapshot exists',await db.historialPrecios.count({where:{id_producto:id}})>0,true);
const full={costo_normal:5,costo_distribuidor:4,precio_unidad_normal:12,precio_docena_normal:8,precio_mayor_normal:7,precio_unidad_dist:9,precio_docena_dist:7,precio_mayor_dist:6};
check('Full eight-field endpoint works',(await req('/productos/'+id+'/precios','PATCH',full)).status,200);
check('Partial endpoint works',(await req('/productos/'+id+'/precios','PATCH',{precio_unidad_normal:13})).status,200);
let rows=await db.historialPrecios.findMany({where:{id_producto:id},orderBy:{id_historial:'asc'}});
check('Single price edit logs old/new/actor',[rows.length,Number(rows[0]?.valor_anterior),Number(rows[0]?.valor_nuevo),rows[0]?.id_usuario],[1,10,12,actor.id_usuario]);
await req('/productos/'+id+'/precios','PATCH',full);check('No-op does not create false changes',await db.historialPrecios.count({where:{id_producto:id}}),rows.length);
await req('/productos/'+id,'PATCH',{costo_normal:6});check('Cost edit through product logs actor',await db.historialPrecios.count({where:{id_producto:id,campo_modificado:'costo_normal',id_usuario:actor.id_usuario}}),1);
await Promise.all([13,14].map(n=>products.updatePrecios(id,{precio_unidad_normal:n},actor.id_usuario)));
rows=await db.historialPrecios.findMany({where:{id_producto:id,campo_modificado:'precio_unidad_normal'},orderBy:{id_historial:'asc'}});
check('Concurrent history is a continuous chain',rows.slice(1).every((r,i)=>r.valor_anterior.eq(rows[i].valor_nuevo)),true);
const before=await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}}),count=await db.historialPrecios.count({where:{id_producto:id}});
try{await products.updatePrecios(id,{precio_unidad_normal:99},-1);}catch(e){out.rollbackError=e.constructor.name;}
check('History insert failure rolls price back',Number((await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal),Number(before.precio_unidad_normal));
check('History insert failure leaves no orphan log',await db.historialPrecios.count({where:{id_producto:id}}),count);
for(const value of [-1,'not-a-number',1.234,100000000])check('Invalid money rejected: '+value,(await req('/productos/'+id+'/precios','PATCH',{precio_unidad_normal:value})).status,400);
const nullPrice=await req('/productos/'+id+'/precios','PATCH',{...full,costo_normal:6,precio_unidad_normal:null});check('Null money rejected',nullPrice.status,400);out.nullStored=Number((await db.preciosActuales.findUniqueOrThrow({where:{id_producto:id}})).precio_unidad_normal);
const blank=await req('/productos/'+id+'/precios','PATCH',{...full,costo_normal:6,precio_unidad_normal:' '});check('Blank money rejected',blank.status,400);
await products.updatePrecios(id,{precio_unidad_normal:14},actor.id_usuario);
check('Hierarchy enforced for same-unit rates',(await req('/productos/'+id+'/precios','PATCH',{...full,costo_normal:6,precio_unidad_normal:14,precio_docena_normal:200})).status,400);
check('Below-cost rejected if negative margins forbidden',(await req('/productos/'+id+'/precios','PATCH',{...full,costo_normal:6,precio_unidad_normal:0.01})).status,400);
const existing=await db.historialPrecios.findFirstOrThrow({where:{id_producto:id}});
try{await db.$transaction(async tx=>{await tx.historialPrecios.update({where:{id_historial:existing.id_historial},data:{valor_nuevo:999}});out.historyUpdateAllowed=true;throw Error('ROLLBACK');});}catch(e){if(e.message!=='ROLLBACK')out.historyUpdateAllowed=false;}
check('History immutable at DB',out.historyUpdateAllowed,false);
try{await db.$transaction(async tx=>{await tx.historialPrecios.create({data:{id_producto:id,campo_modificado:'invalid_field',valor_anterior:-1,valor_nuevo:-2}});out.invalidHistoryAllowed=true;throw Error('ROLLBACK');});}catch(e){if(e.message!=='ROLLBACK')out.invalidHistoryAllowed=false;}
check('History constrains negative values and field names',out.invalidHistoryAllowed,false);
try{await db.$transaction(async tx=>{const n=await tx.historialPrecios.count({where:{id_producto:id}});await tx.preciosActuales.update({where:{id_producto:id},data:{precio_unidad_dist:123}});out.directWriteAudited=await tx.historialPrecios.count({where:{id_producto:id}})>n;throw Error('ROLLBACK');});}catch(e){if(e.message!=='ROLLBACK')throw e;}
check('Direct writer cannot bypass history',out.directWriteAudited,true);
try{await db.$transaction(async tx=>{await tx.$executeRawUnsafe("UPDATE precios_actuales SET costo_normal='NaN'::numeric WHERE id_producto=$1",id);out.nanAllowed=true;throw Error('ROLLBACK');});}catch(e){if(e.message!=='ROLLBACK')out.nanAllowed=false;}
check('Database rejects nonfinite money',out.nanAllowed,false);
// 105 additional rows only for this fixture: demonstrate UI truncation and dates.
await db.historialPrecios.createMany({data:Array.from({length:105},(_,i)=>({id_producto:id,id_usuario:actor.id_usuario,campo_modificado:'costo_distribuidor',valor_anterior:i,valor_nuevo:i+1,fecha_cambio:new Date('2030-04-01T18:00:00Z')}))});
const page=await req('/historial-precios?id_producto='+id+'&limit=100');out.uiHistory={visible:page.data.data.length,total:page.data.total};
check('UI history limit covers complete timeline',page.data.data.length,page.data.total);
check('Date-only end retains selected day',(await req('/historial-precios?id_producto='+id+'&fecha_inicio=2030-04-01&fecha_fin=2030-04-01')).data.total,105);
for(const query of ['fecha_inicio=invalid','id_producto=NaN','limit=1.5','take=1'])await req('/historial-precios?'+query);
check('Missing history entry returns 404',(await req('/historial-precios/2147483647')).status,404);
for(const query of ['tipo_precio=distribuidor','precio_min=10&precio_max=20'])await req('/productos?'+query);
check('Bulk adjustment endpoint available',(await req('/productos/precios/bulk','POST',{id_categoria:cat.id_categoria,porcentaje:5})).status!==404,true);
// A user explicitly permitted to consult prices, without inventory permission.
vendor=await db.usuario.create({data:{nombre:tag,email:tag+'@test.invalid',password_hash:'fixture',rol:'vendedor'}});
await db.usuarioPermiso.createMany({data:[{id_usuario:vendor.id_usuario,modulo:'productos',nivel:'sin_acceso'},{id_usuario:vendor.id_usuario,modulo:'consulta_precios',nivel:'lectura'}]});
const vendorToken=jwt.sign({id_usuario:vendor.id_usuario,session_version:vendor.session_version},process.env.JWT_SECRET,{expiresIn:'5m'});
check('Price-only permission can read price catalog',(await req('/productos?include=precios&limit=1','GET',undefined,vendorToken)).status,200);
check('Seller cannot read price history',(await req('/historial-precios?limit=1','GET',undefined,vendorToken)).status,403);
for(const limit of [1,50]){
 queries=0;const start=performance.now();await history.findAll(1,limit,{id_producto:id});out.queryCounts.push({service:'history',limit,queries,ms:+(performance.now()-start).toFixed(2)});
 queries=0;const start2=performance.now();await products.findAllFiltered({page:1,limit,include:'precios,categoria'});out.queryCounts.push({service:'catalog',limit,queries,ms:+(performance.now()-start2).toFixed(2)});
}
const noPrice=await db.producto.create({data:{codigo:tag+'-missing',descripcion:tag}});
check('Zero-value update repairs missing price row',(await req('/productos/'+noPrice.id_producto+'/precios','PATCH',{costo_normal:0,costo_distribuidor:0,precio_unidad_normal:0,precio_docena_normal:0,precio_mayor_normal:0,precio_unidad_dist:0,precio_docena_dist:0,precio_mayor_dist:0})).status,200);
}
main().catch(e=>{out.fatal=e.message;process.exitCode=1}).finally(async()=>{try{await db.producto.deleteMany({where:{codigo:{startsWith:tag}}});if(vendor)await db.usuario.delete({where:{id_usuario:vendor.id_usuario}});out.cleanup={products:await db.producto.count({where:{codigo:{startsWith:tag}}}),users:await db.usuario.count({where:{email:tag+'@test.invalid'}})};}catch(e){out.cleanupError=e.message;process.exitCode=1;}await db.$disconnect();console.log(JSON.stringify(out,null,2));});

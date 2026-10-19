const {PrismaClient}=require('/app/apps/api/node_modules/@prisma/client');
const jwt=require('/app/apps/api/node_modules/jsonwebtoken');
const {InventarioService}=require('/app/apps/api/dist/modules/inventario/inventario.service.js');
const {ProductosService}=require('/app/apps/api/dist/modules/productos/productos.service.js');
const db=new PrismaClient({log:[{emit:'event',level:'query'}]});
let queries=0; db.$on('query',()=>queries++);
const out={date:new Date().toISOString(),http:[],checks:[],performance:[]};
const tag='AUDIT-INV-'+Date.now(); const ids=[];const wh=[];
const check=(name,pass,detail)=>out.checks.push({name,pass,detail});
async function main(){
const user=await db.usuario.findFirst({where:{rol:'admin',activo:true,deleted_at:null},select:{id_usuario:true,session_version:true}});
if(!user)throw Error('No active admin fixture for read-only HTTP probes');
const token=jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'10m'});
async function req(path,method='GET',body){const start=performance.now();const r=await fetch('http://127.0.0.1:3001/api'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={text:text.slice(0,200)}};out.http.push({path,method,status:r.status,ms:+(performance.now()-start).toFixed(2),total:data.total,rows:Array.isArray(data.data)?data.data.length:undefined,message:data.message});return {status:r.status,data};}
const base=await req('/productos?limit=8&include=precios,categoria,stock');if(base.status!==200)throw Error('HTTP auth failed');
const noCategory=await req('/productos?limit=8&id_categoria=2147483647');
check('category filter honored',noCategory.data.total===0,{base:base.data.total,filtered:noCategory.data.total});
const noWarehouse=await req('/productos?limit=8&id_almacen=2147483647');
check('warehouse filter honored',noWarehouse.data.total===0,{filtered:noWarehouse.data.total});
const lowUI=await req('/productos?limit=8&stock_estado=bajo'); const lowAPI=await req('/productos?limit=8&stock_status=bajo');
check('UI low stock filter matches API',lowUI.data.total===lowAPI.data.total,{ui:lowUI.data.total,api:lowAPI.data.total});
await req('/productos?limit=1.5');await req('/productos?page=1.5');await req('/productos/2147483647');
await req('/inventario/movimientos');
const stocks=await req('/inventario/stock?limit=1&page=1');check('stock pagination enforced',stocks.data.data?.length<=1,{rows:stocks.data.data?.length,total:stocks.data.total});
const alerts=await req('/inventario/alertas');check('alert response matches frontend keys',!alerts.data.data?.length||!!alerts.data.data[0].producto,{keys:Object.keys(alerts.data.data?.[0]||{})});
const id=base.data.data[0].id_producto;
await req('/inventario/kardex/'+id+'?fecha_inicio=invalid');await req('/inventario/kardex/'+id+'?tipo=invalid');await req('/inventario/kardex/'+id+'?id_almacen=NaN');await req('/inventario/kardex/2147483647');
const first=await db.inventarioMovimiento.findFirst({where:{id_producto:id},orderBy:{created_at:'desc'}});
if(first){const day=first.created_at.toISOString().slice(0,10);const exact=await req('/inventario/kardex/'+id+'?fecha_inicio='+day+'&fecha_fin='+day);check('inclusive end date retains same-day records',exact.data.total>0,{day,total:exact.data.total});}
for(let i=0;i<2;i++)wh.push((await db.almacen.create({data:{codigo:tag+'-'+i,nombre:tag}})).id_almacen);
const cat=await db.categoria.findFirst();
const payload={codigo:tag,descripcion:tag,id_categoria:cat.id_categoria,tipo_flor:'QA',material:'QA',composicion:'QA',presentacion:'QA',numero_cabezas:1,tamano:'QA',id_almacen:wh[0],unidades_por_caja:1,stock_principal:5,stock_minimo:10,colores_surtido:['QA'],precio_tienda_unidad:1,precio_tienda_docena:12,precio_tienda_caja:12,precio_distribuidor_unidad:1,precio_distribuidor_docena:12,precio_distribuidor_caja:12};
const created=await req('/productos','POST',payload);if(created.status!==201)throw Error('Fixture creation failed');const pid=created.data.data.id_producto;ids.push(pid);
const s=await db.stockActual.findFirst({where:{id_producto:pid}});
check('create respects requested warehouse',s.id_almacen===wh[0],{requested:wh[0],actual:s.id_almacen});
check('create initializes low stock alert',await db.alertas_stock.count({where:{id_producto:pid,estado:'activa'}})>0);
const inv=new InventarioService(db);const products=new ProductosService(db,{}, {refreshCache(){}});
await inv.createMovimiento({id_producto:pid,id_almacen:wh[0],tipo:'entrada',origen:'compra',cantidad:20},user.id_usuario);
const moveCount=await db.inventarioMovimiento.count({where:{id_producto:pid}});
try{await inv.createTransferencia(pid,wh[0],wh[1],5,-1);}catch(e){check('mid-transfer FK failure rolls back both stock and movement', (await db.stockActual.findUnique({where:{id_producto_id_almacen:{id_producto:pid,id_almacen:wh[0]}}})).cantidad===20 && await db.inventarioMovimiento.count({where:{id_producto:pid}})===moveCount,{error:e.code});}
const transfer=await inv.createTransferencia(pid,wh[0],wh[1],5,user.id_usuario);
const after=await db.producto.findUnique({where:{id_producto:pid}});check('transfer conserves aggregate stock',after.stock_total===25);
check('transfer response includes persisted outgoing reference',transfer.salida.id_referencia===transfer.entrada.id_movimiento,{returned:transfer.salida.id_referencia,persisted:(await db.inventarioMovimiento.findUnique({where:{id_movimiento:transfer.salida.id_movimiento}})).id_referencia});
const before=await db.stockActual.findUnique({where:{id_producto_id_almacen:{id_producto:pid,id_almacen:wh[0]}}});
await products.update(pid,{stock_principal:1},user.id_usuario);
const main=await db.stockActual.findFirst({where:{id_producto:pid,almacen:{codigo:'ALM-001'}}});
check('product edit refreshes stock alert',await db.alertas_stock.count({where:{id_producto:pid,id_almacen:main.id_almacen,estado:'activa'}})>0);
const parallel=await Promise.allSettled([1,2].map(()=>inv.createMovimiento({id_producto:pid,id_almacen:wh[0],tipo:'salida',origen:'venta',cantidad:10},user.id_usuario)));
check('concurrent withdrawals cannot oversell',parallel.filter(x=>x.status==='fulfilled').length===1 && (await db.stockActual.findUnique({where:{id_producto_id_almacen:{id_producto:pid,id_almacen:wh[0]}}})).cantidad===before.cantidad-10,parallel.map(x=>x.status));
await req('/inventario/movimientos','POST',{id_producto:pid,id_almacen:wh[0],tipo:'ajuste',origen:'ajuste_fisico',cantidad:-1});
const mainAlert=await db.alertas_stock.findFirst({where:{id_producto:pid,id_almacen:wh[0],estado:'activa'}});
if(mainAlert){await inv.reconocerAlerta(mainAlert.id_alerta);check('acknowledgement preserves unresolved low-stock visibility',(await db.alertas_stock.findUnique({where:{id_alerta:mainAlert.id_alerta}})).estado!=='resuelta');}
for(const n of [1,50]){queries=0;const start=performance.now();await products.findAll(1,n,undefined,undefined,true,true,true);out.performance.push({scenario:'relation query count',take:n,queries,ms:+(performance.now()-start).toFixed(2)});}
for(const n of [100,10000]){
try{await db.$transaction(async tx=>{
await tx.$executeRawUnsafe('INSERT INTO productos(codigo,descripcion,updated_at) SELECT $1 || g::text, CASE WHEN g % 100 = 0 THEN \'QA_ROSA_SELECTIVA\' ELSE \'QA_OTHER_CATALOG\' END,now() FROM generate_series(1,$2::int) g',tag+'-SCALE-',n);
for(const [name,sql,args] of [
['selective_search','SELECT id_producto FROM productos WHERE deleted_at IS NULL AND (codigo ILIKE $1 OR descripcion ILIKE $1) ORDER BY created_at DESC LIMIT 50',['%ROSA_SELECTIVA%']],
['short_search','SELECT id_producto FROM productos WHERE deleted_at IS NULL AND (codigo ILIKE $1 OR descripcion ILIKE $1) ORDER BY created_at DESC LIMIT 50',['%QA%']],
['deep_page','SELECT id_producto FROM productos WHERE deleted_at IS NULL ORDER BY created_at DESC OFFSET 9000 LIMIT 50',[]],
['count','SELECT count(*) FROM productos WHERE deleted_at IS NULL',[]]]){
const plan=await tx.$queryRawUnsafe('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,...args);out.performance.push({scenario:name,syntheticProducts:n,plan:plan[0]['QUERY PLAN']});}
throw Error('ROLLBACK_SCALE');},{timeout:60000});}catch(e){if(e.message!=='ROLLBACK_SCALE')throw e;}
}
}
main().catch(e=>{out.fatal={message:e.message,code:e.code};process.exitCode=1}).finally(async()=>{try{await db.$transaction(async tx=>{await tx.producto.deleteMany({where:{codigo:{startsWith:tag}}});await tx.almacen.deleteMany({where:{id_almacen:{in:wh},codigo:{startsWith:tag}}});});out.cleanup={productsRemaining:await db.producto.count({where:{codigo:{startsWith:tag}}}),warehousesRemaining:await db.almacen.count({where:{codigo:{startsWith:tag}}})};}catch(e){out.cleanupError=e.message;process.exitCode=1;}await db.$disconnect();console.log(JSON.stringify(out,null,2));});

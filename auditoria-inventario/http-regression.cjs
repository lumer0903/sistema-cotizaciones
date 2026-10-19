const {PrismaClient}=require('/app/apps/api/node_modules/@prisma/client');
const jwt=require('/app/apps/api/node_modules/jsonwebtoken');
const db=new PrismaClient();const tag='QA-INV-'+Date.now();const warehouses=[];
const result={checks:[],requests:[]};
function check(name,pass,detail){result.checks.push({name,pass,detail});if(!pass)throw Error(name);}
async function main(){
  const user=await db.usuario.findFirstOrThrow({where:{rol:'admin',activo:true,deleted_at:null},select:{id_usuario:true,session_version:true}});
  const token=jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'10m'});
  async function req(path,method='GET',body){const start=performance.now();const r=await fetch('http://127.0.0.1:3001/api'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={text}}result.requests.push({path,method,status:r.status,ms:Math.round((performance.now()-start)*100)/100,total:data.total,rows:Array.isArray(data.data)?data.data.length:undefined});return{status:r.status,data};}
  for(const path of ['/productos?limit=1.5','/productos?page=1.5','/productos?stock_estado=bajo','/productos?activo=bad','/inventario/kardex/1?fecha_inicio=invalid','/inventario/kardex/1?tipo=invalid','/inventario/kardex/1?id_almacen=NaN'])check('invalid query -> 400: '+path,(await req(path)).status===400);
  check('unknown category returns zero',(await req('/productos?id_categoria=2147483647')).data.total===0);
  check('unknown warehouse returns zero',(await req('/productos?id_almacen=2147483647')).data.total===0);
  check('unknown product -> 404',(await req('/productos/2147483647')).status===404);
  check('global movements endpoint exists',(await req('/inventario/movimientos?limit=1')).status===200);
  check('stock paginates',(await req('/inventario/stock?limit=1')).data.data.length===1);
  const allAlerts=await req('/inventario/alertas?estado=todas&limit=1');check('alerts paginate and map identity',allAlerts.data.data.length<=1&&!!allAlerts.data.data[0]?.producto?.codigo);
  for(let i=0;i<2;i++)warehouses.push((await db.almacen.create({data:{codigo:tag+'-'+i,nombre:tag}})).id_almacen);
  const category=await db.categoria.findFirstOrThrow();
  const payload={codigo:tag,descripcion:tag,id_categoria:category.id_categoria,id_almacen:warehouses[0],tipo_flor:'QA',material:'QA',composicion:'QA',presentacion:'QA',numero_cabezas:1,tamano:'QA',unidades_por_caja:1,stock_principal:5,stock_minimo:10,colores_surtido:['QA'],precio_tienda_unidad:1,precio_tienda_docena:12,precio_tienda_caja:12,precio_distribuidor_unidad:1,precio_distribuidor_docena:12,precio_distribuidor_caja:12};
  const created=await req('/productos','POST',payload);check('create succeeds',created.status===201);const id=created.data.data.id_producto;
  check('null active rejected',(await req('/productos/'+id,'PATCH',{activo:null})).status===400);
  check('null stock rejected',(await req('/productos/'+id,'PATCH',{stock_principal:null})).status===400);
  const detail=await req('/productos/'+id+'?include=stock');check('create honors selected warehouse',detail.data.data.stock_actual[0].id_almacen===warehouses[0]);
  check('create initializes alert',await db.alertas_stock.count({where:{id_producto:id,estado:'activa'}})===1);
  check('create records actor',(await db.inventarioMovimiento.findFirstOrThrow({where:{id_producto:id}})).id_usuario===user.id_usuario);
  const m=await req('/inventario/movimientos','POST',{id_producto:id,id_almacen:warehouses[0],tipo:'ajuste',origen:'ajuste_fisico',cantidad:-1,costo_unitario:0});
  check('negative adjustment and zero cost',m.status===201&&m.data.data.stock_posterior===4&&m.data.data.costo_unitario===0);
  const transfer=await req('/inventario/transferencia','POST',{id_producto:id,id_almacen_origen:warehouses[0],id_almacen_destino:warehouses[1],cantidad:2});
  check('transfer responds with cross references',transfer.status===201&&transfer.data.data.salida.id_referencia===transfer.data.data.entrada.id_movimiento);
  const filtered=await req('/productos?search='+tag+'&id_almacen='+warehouses[1]+'&stock_status=bajo&include=stock');
  check('combined warehouse low filter correct',filtered.data.total===1&&filtered.data.data[0].stock_filtrado===2&&filtered.data.data[0].stock_total===4);
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const kardex=await req('/inventario/kardex/'+id+'?fecha_inicio='+day+'&fecha_fin='+day);check('same Lima day includes movements',kardex.status===200&&kardex.data.total===4);
  const alert=await db.alertas_stock.findFirstOrThrow({where:{id_producto:id,id_almacen:warehouses[0]}});
  const acknowledged=await req('/inventario/alertas/'+alert.id_alerta+'/reconocer','PATCH');check('acknowledged stays open',acknowledged.data.data.estado==='reconocida');
  check('inactive update accepted',(await req('/productos/'+id,'PATCH',{activo:false,stock_minimo:0})).status===200);
  check('active filter excludes inactive',(await req('/productos?search='+tag+'&activo=true')).data.total===0);
  const csv=await req('/inventario/kardex/'+id+'/export');check('CSV route complete without pagination parameters',csv.status===200&&csv.data.text.includes('Stock Posterior'));
  const proxy=await fetch('http://web:3000/api/inventario/stock?limit=1',{headers:{Cookie:'accessToken='+token}});check('Next proxy reaches updated API',proxy.status===200);
}
main().catch(e=>{result.error=e.message;process.exitCode=1}).finally(async()=>{try{await db.producto.deleteMany({where:{codigo:{startsWith:tag}}});await db.almacen.deleteMany({where:{codigo:{startsWith:tag}}});result.cleanup={products:await db.producto.count({where:{codigo:{startsWith:tag}}}),warehouses:await db.almacen.count({where:{codigo:{startsWith:tag}}})};}finally{await db.$disconnect();console.log(JSON.stringify(result,null,2));}});

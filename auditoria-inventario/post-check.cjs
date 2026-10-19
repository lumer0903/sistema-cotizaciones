const {PrismaClient}=require('/app/apps/api/node_modules/@prisma/client');
const {ProductosService}=require('/app/apps/api/dist/modules/productos/productos.service.js');
let queries=0;const db=new PrismaClient({log:[{emit:'event',level:'query'}]});db.$on('query',()=>queries++);
(async()=>{
const summary=await db.$queryRawUnsafe(`SELECT
(SELECT count(*)::int FROM productos) productos,
(SELECT count(*)::int FROM stock_actual) stocks,
(SELECT count(*)::int FROM inventario_movimientos) movimientos,
(SELECT count(*)::int FROM productos p WHERE p.stock_total<>COALESCE((SELECT sum(s.cantidad) FROM stock_actual s WHERE s.id_producto=p.id_producto),0)) agregados_incorrectos,
(SELECT count(*)::int FROM stock_actual s WHERE s.cantidad<>COALESCE((SELECT sum(m.stock_posterior-m.stock_anterior) FROM inventario_movimientos m WHERE m.id_producto=s.id_producto AND m.id_almacen=s.id_almacen),0)) kardex_incorrecto,
(SELECT count(*)::int FROM stock_actual s JOIN productos p USING(id_producto) WHERE p.deleted_at IS NULL AND s.cantidad<=p.stock_minimo AND NOT EXISTS(SELECT 1 FROM alertas_stock a WHERE a.id_producto=s.id_producto AND a.id_almacen=s.id_almacen AND a.estado IN ('activa','reconocida'))) escasez_sin_alerta_abierta,
(SELECT count(*)::int FROM productos WHERE codigo LIKE 'QA-INV-%' OR codigo LIKE 'inventory-regression-%' OR codigo LIKE 'AUDIT-INV-%') fixtures_restantes,
(SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND conname IN ('stock_actual_no_negativo','productos_stock_valido','precios_no_negativos','movimientos_saldos_validos','alertas_stock_no_negativo') AND convalidated) checks_validados`);
const alerts=await db.$queryRawUnsafe('SELECT estado,count(*)::int FROM alertas_stock GROUP BY estado ORDER BY estado');
const products=new ProductosService(db,{}, {refreshCache(){}});const performanceResults=[];
for(const limit of [1,50]){queries=0;const start=performance.now();await products.findAllFiltered({page:1,limit,include:'precios,categoria,stock'});performanceResults.push({limit,queries,ms:+(performance.now()-start).toFixed(2)});}
console.log(JSON.stringify({summary,alerts,performance:performanceResults},null,2));await db.$disconnect();
})().catch(e=>{console.error(e.message);process.exitCode=1;});

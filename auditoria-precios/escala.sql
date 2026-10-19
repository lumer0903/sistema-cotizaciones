\pset pager off
BEGIN;
CREATE TEMP TABLE qa_products (LIKE productos INCLUDING ALL) ON COMMIT DROP;
CREATE TEMP TABLE qa_prices (LIKE precios_actuales INCLUDING ALL) ON COMMIT DROP;
CREATE TEMP TABLE qa_history (LIKE historial_precios INCLUDING ALL) ON COMMIT DROP;
INSERT INTO qa_products(id_producto,codigo,descripcion,created_at,updated_at) SELECT g,'BENCH-'||g,'ROSA QA '||g,now()-(g||' seconds')::interval,now() FROM generate_series(1,100)g;
INSERT INTO qa_prices(id_producto,costo_normal,precio_unidad_normal,precio_docena_normal,precio_mayor_normal,updated_at) SELECT g,5,10+(g%20),9+(g%20),8+(g%20),now() FROM generate_series(1,100)g;
INSERT INTO qa_history(id_historial,id_producto,campo_modificado,valor_anterior,valor_nuevo,fecha_cambio) SELECT g,CASE WHEN g<=500 THEN 1 ELSE 1+g%100 END,'precio_unidad_normal',g%100,1+g%100,now()-(g||' seconds')::interval FROM generate_series(1,1000)g;
ANALYZE qa_products; ANALYZE qa_prices; ANALYZE qa_history;
\echo SMALL_CATALOG_100
EXPLAIN(ANALYZE,BUFFERS) SELECT p.id_producto,a.precio_unidad_normal FROM qa_products p JOIN qa_prices a USING(id_producto) WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC,p.id_producto DESC LIMIT 50;
\echo SMALL_HISTORY_1000
EXPLAIN(ANALYZE,BUFFERS) SELECT * FROM qa_history WHERE id_producto=1 AND fecha_cambio>=now()-interval '30 days' ORDER BY fecha_cambio DESC LIMIT 50;
INSERT INTO qa_products(id_producto,codigo,descripcion,created_at,updated_at) SELECT g,'BENCH-'||g,'ROSA QA '||g,now()-(g||' seconds')::interval,now() FROM generate_series(101,10000)g;
INSERT INTO qa_prices(id_producto,costo_normal,precio_unidad_normal,precio_docena_normal,precio_mayor_normal,updated_at) SELECT g,5,10+(g%20),9+(g%20),8+(g%20),now() FROM generate_series(101,10000)g;
INSERT INTO qa_history(id_historial,id_producto,campo_modificado,valor_anterior,valor_nuevo,fecha_cambio) SELECT g,CASE WHEN g<=50000 THEN 1 ELSE 1+g%10000 END,'precio_unidad_normal',g%100,1+g%100,now()-(g||' seconds')::interval FROM generate_series(1001,100000)g;
ANALYZE qa_products; ANALYZE qa_prices; ANALYZE qa_history;
\echo LARGE_CATALOG_10000
EXPLAIN(ANALYZE,BUFFERS) SELECT p.id_producto,a.precio_unidad_normal FROM qa_products p JOIN qa_prices a USING(id_producto) WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC,p.id_producto DESC LIMIT 50;
\echo LARGE_PRICE_RANGE_10000
EXPLAIN(ANALYZE,BUFFERS) SELECT p.id_producto,a.precio_unidad_normal FROM qa_products p JOIN qa_prices a USING(id_producto) WHERE p.deleted_at IS NULL AND a.precio_unidad_normal BETWEEN 15 AND 17 ORDER BY p.created_at DESC LIMIT 50;
\echo LARGE_HISTORY_100000
EXPLAIN(ANALYZE,BUFFERS) SELECT * FROM qa_history WHERE id_producto=1 AND fecha_cambio>=now()-interval '30 days' ORDER BY fecha_cambio DESC LIMIT 50;
\echo LARGE_HISTORY_COUNT_100000
EXPLAIN(ANALYZE,BUFFERS) SELECT count(*) FROM qa_history WHERE id_producto=1 AND fecha_cambio>=now()-interval '30 days';
\echo LARGE_HISTORY_OFFSET_40000
EXPLAIN(ANALYZE,BUFFERS) SELECT * FROM qa_history WHERE id_producto=1 ORDER BY fecha_cambio DESC OFFSET 40000 LIMIT 50;
ROLLBACK;

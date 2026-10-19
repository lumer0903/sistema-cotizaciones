\pset pager off
SELECT version();
SELECT (SELECT count(*) FROM productos) productos,(SELECT count(*) FROM precios_actuales) precios,(SELECT count(*) FROM historial_precios) historial;
SELECT table_name,column_name,data_type,numeric_precision,numeric_scale,is_nullable FROM information_schema.columns WHERE table_name IN ('precios_actuales','historial_precios') ORDER BY table_name,ordinal_position;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE tablename IN ('productos','precios_actuales','historial_precios') ORDER BY tablename,indexname;
SELECT conrelid::regclass tabla,conname,pg_get_constraintdef(oid) definicion FROM pg_constraint WHERE conrelid IN ('precios_actuales'::regclass,'historial_precios'::regclass) ORDER BY 1,2;
SELECT event_object_table,trigger_name,event_manipulation,action_statement FROM information_schema.triggers WHERE event_object_table IN ('precios_actuales','historial_precios');
SELECT 'integridad' seccion,
(SELECT count(*) FROM productos p WHERE p.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM precios_actuales a WHERE a.id_producto=p.id_producto)) productos_sin_precio,
(SELECT count(*) FROM precios_actuales WHERE LEAST(costo_normal,precio_unidad_normal,precio_docena_normal,precio_mayor_normal,costo_distribuidor,precio_unidad_dist,precio_docena_dist,precio_mayor_dist)<0) negativos,
(SELECT count(*) FROM historial_precios WHERE id_usuario IS NULL) historial_sin_actor,
(SELECT count(*) FROM historial_precios WHERE valor_anterior<0 OR valor_nuevo<0) historial_negativo,
(SELECT count(*) FROM precios_actuales WHERE precio_unidad_normal<precio_docena_normal OR precio_docena_normal<precio_mayor_normal) jerarquia_normal_invertida,
(SELECT count(*) FROM precios_actuales WHERE precio_unidad_dist<precio_docena_dist OR precio_docena_dist<precio_mayor_dist) jerarquia_dist_invertida,
(SELECT count(*) FROM precios_actuales WHERE costo_normal>LEAST(precio_unidad_normal,precio_docena_normal,precio_mayor_normal)) normal_algun_precio_bajo_costo,
(SELECT count(*) FROM precios_actuales WHERE costo_distribuidor>LEAST(precio_unidad_dist,precio_docena_dist,precio_mayor_dist)) dist_algun_precio_bajo_costo;
WITH chain AS (SELECT *,lag(valor_nuevo) OVER(PARTITION BY id_producto,campo_modificado ORDER BY fecha_cambio,id_historial) previo FROM historial_precios)
SELECT 'continuidad_historial' seccion,count(*) discontinuidades FROM chain WHERE previo IS NOT NULL AND previo<>valor_anterior;
WITH last AS (SELECT DISTINCT ON(id_producto,campo_modificado) * FROM historial_precios ORDER BY id_producto,campo_modificado,fecha_cambio DESC,id_historial DESC)
SELECT 'ultimo_vs_actual' seccion,count(*) inconsistencias FROM last h JOIN precios_actuales p USING(id_producto)
WHERE h.valor_nuevo<>(to_jsonb(p)->>h.campo_modificado)::numeric;
SELECT current_user,has_table_privilege(current_user,'historial_precios','UPDATE') puede_actualizar_historial,has_table_privilege(current_user,'historial_precios','DELETE') puede_borrar_historial;

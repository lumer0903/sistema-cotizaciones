SELECT (SELECT count(*) FROM productos) productos,(SELECT count(*) FROM precios_actuales) precios,(SELECT count(*) FROM historial_precios) historial;
SELECT evento,count(*) FROM historial_precios GROUP BY evento;
SELECT count(*) importes_distintos_a_linea_base FROM precios_actuales p CROSS JOIN LATERAL jsonb_each_text(to_jsonb(p)) k
WHERE k.key IN ('costo_normal','precio_unidad_normal','precio_docena_normal','precio_mayor_normal','costo_distribuidor','precio_unidad_dist','precio_docena_dist','precio_mayor_dist')
AND NOT EXISTS(SELECT 1 FROM historial_precios h WHERE h.id_producto=p.id_producto AND h.campo_modificado=k.key AND h.evento='BASELINE' AND h.valor_nuevo=k.value::numeric);
SELECT count(*) bases_qa_restantes FROM pg_database WHERE datname LIKE 'pricing_qa_%';

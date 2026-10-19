CREATE OR REPLACE FUNCTION auditar_precios_actuales() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor integer; nombre_actor text; actuales jsonb; anteriores jsonb;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Los precios se conservan; desactive el producto'; END IF;
 actuales := to_jsonb(NEW);
 IF TG_OP='UPDATE' THEN
  IF NEW.id_producto<>OLD.id_producto THEN RAISE EXCEPTION 'No se puede reasignar la fila de precios'; END IF;
  anteriores := to_jsonb(OLD);
  IF actuales-'updated_at'=anteriores-'updated_at' THEN RETURN NEW; END IF;
 END IF;
 actor := NULLIF(current_setting('app.actor_id',true),'')::integer;
 SELECT nombre INTO nombre_actor FROM usuarios WHERE id_usuario=actor AND activo=true AND deleted_at IS NULL;
 IF nombre_actor IS NULL THEN RAISE EXCEPTION 'Actor válido requerido para modificar precios'; END IF;
 INSERT INTO historial_precios(id_producto,id_usuario,campo_modificado,valor_anterior,valor_nuevo,fecha_cambio,evento,actor_nombre,motivo)
 SELECT NEW.id_producto,actor,campo,
   CASE WHEN TG_OP='INSERT' THEN 0 ELSE (anteriores->>campo)::numeric END,
   (actuales->>campo)::numeric,date_trunc('milliseconds',clock_timestamp()),
   CASE WHEN TG_OP='INSERT' THEN 'CREACION' ELSE 'CAMBIO' END,nombre_actor,
   COALESCE(NULLIF(current_setting('app.price_reason',true),''),'Edición de precios')
 FROM unnest(ARRAY['costo_normal','precio_unidad_normal','precio_docena_normal','precio_mayor_normal','costo_distribuidor','precio_unidad_dist','precio_docena_dist','precio_mayor_dist']) AS campos(campo)
 WHERE TG_OP='INSERT' OR (anteriores->>campo)::numeric IS DISTINCT FROM (actuales->>campo)::numeric;
 RETURN NEW;
END $$;

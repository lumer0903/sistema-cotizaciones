-- Preserve known current prices as a baseline; never invent past changes.
ALTER TABLE historial_precios ADD COLUMN IF NOT EXISTS evento text NOT NULL DEFAULT 'CAMBIO',
 ADD COLUMN IF NOT EXISTS actor_nombre text NOT NULL DEFAULT 'Usuario heredado',
 ADD COLUMN IF NOT EXISTS motivo text NOT NULL DEFAULT 'Edición de precios';
ALTER TABLE historial_precios DROP CONSTRAINT IF EXISTS historial_precios_id_producto_fkey;
ALTER TABLE historial_precios ADD CONSTRAINT historial_precios_id_producto_fkey FOREIGN KEY(id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE historial_precios DROP CONSTRAINT IF EXISTS historial_precios_id_usuario_fkey;
ALTER TABLE historial_precios ADD CONSTRAINT historial_precios_id_usuario_fkey FOREIGN KEY(id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE historial_precios h SET actor_nombre=u.nombre FROM usuarios u WHERE u.id_usuario=h.id_usuario;
ALTER TABLE precios_actuales ADD CONSTRAINT costo_normal_finito CHECK (costo_normal BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT precio_unidad_normal_finito CHECK (precio_unidad_normal BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT precio_docena_normal_finito CHECK (precio_docena_normal BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT precio_mayor_normal_finito CHECK (precio_mayor_normal BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT costo_distribuidor_finito CHECK (costo_distribuidor BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT precio_unidad_dist_finito CHECK (precio_unidad_dist BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT precio_docena_dist_finito CHECK (precio_docena_dist BETWEEN 0 AND 99999999.99);
ALTER TABLE precios_actuales ADD CONSTRAINT precio_mayor_dist_finito CHECK (precio_mayor_dist BETWEEN 0 AND 99999999.99);
ALTER TABLE historial_precios ADD CONSTRAINT historial_importes_validos CHECK(valor_anterior BETWEEN 0 AND 99999999.99 AND valor_nuevo BETWEEN 0 AND 99999999.99);
ALTER TABLE historial_precios ADD CONSTRAINT historial_campo_valido CHECK(campo_modificado IN ('costo_normal','precio_unidad_normal','precio_docena_normal','precio_mayor_normal','costo_distribuidor','precio_unidad_dist','precio_docena_dist','precio_mayor_dist'));
ALTER TABLE historial_precios ADD CONSTRAINT historial_evento_valido CHECK(evento IN ('CREACION','CAMBIO','BASELINE','IMPORTACION'));
INSERT INTO historial_precios(id_producto,id_usuario,campo_modificado,valor_anterior,valor_nuevo,fecha_cambio,evento,actor_nombre,motivo)
SELECT p.id_producto,NULL,k.key,k.value::numeric,k.value::numeric,date_trunc('milliseconds',clock_timestamp()),'BASELINE','Migración de precios','Estado conocido al habilitar auditoría'
FROM precios_actuales p CROSS JOIN LATERAL jsonb_each_text(to_jsonb(p)) k
WHERE k.key IN ('costo_normal','precio_unidad_normal','precio_docena_normal','precio_mayor_normal','costo_distribuidor','precio_unidad_dist','precio_docena_dist','precio_mayor_dist')
AND NOT EXISTS(SELECT 1 FROM historial_precios h WHERE h.id_producto=p.id_producto AND h.campo_modificado=k.key);
UPDATE historial_precios SET fecha_cambio=date_trunc('milliseconds',fecha_cambio);
CREATE INDEX IF NOT EXISTS historial_producto_cursor_idx ON historial_precios(id_producto,fecha_cambio DESC,id_historial DESC);
CREATE TABLE IF NOT EXISTS precio_ajustes_lotes (
 clave uuid PRIMARY KEY, id_usuario integer NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
 solicitud jsonb NOT NULL, resultado jsonb NOT NULL, created_at timestamp NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION proteger_historial_precios() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' OR pg_trigger_depth()<2 THEN
  RAISE EXCEPTION 'Historial de precios inmutable; escritura únicamente mediante precios actuales';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_historial ON historial_precios;
CREATE TRIGGER proteger_historial BEFORE INSERT OR UPDATE OR DELETE ON historial_precios
FOR EACH ROW EXECUTE FUNCTION proteger_historial_precios();
CREATE OR REPLACE FUNCTION impedir_truncate_historial() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'No se puede truncar el historial de precios'; END $$;
DROP TRIGGER IF EXISTS proteger_historial_truncate ON historial_precios;
CREATE TRIGGER proteger_historial_truncate BEFORE TRUNCATE ON historial_precios
FOR EACH STATEMENT EXECUTE FUNCTION impedir_truncate_historial();
CREATE OR REPLACE FUNCTION auditar_precios_actuales() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor integer; nombre_actor text; campo text; anterior numeric; nuevo numeric;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Los precios se conservan; desactive el producto'; END IF;
 IF TG_OP='UPDATE' AND to_jsonb(NEW)-'updated_at'=to_jsonb(OLD)-'updated_at' THEN RETURN NEW; END IF;
 actor := NULLIF(current_setting('app.actor_id',true),'')::integer;
 SELECT nombre INTO nombre_actor FROM usuarios WHERE id_usuario=actor AND activo=true AND deleted_at IS NULL;
 IF nombre_actor IS NULL THEN RAISE EXCEPTION 'Actor válido requerido para modificar precios'; END IF;
 FOREACH campo IN ARRAY ARRAY['costo_normal','precio_unidad_normal','precio_docena_normal','precio_mayor_normal','costo_distribuidor','precio_unidad_dist','precio_docena_dist','precio_mayor_dist'] LOOP
  nuevo := (to_jsonb(NEW)->>campo)::numeric;
  anterior := CASE WHEN TG_OP='INSERT' THEN 0 ELSE (to_jsonb(OLD)->>campo)::numeric END;
  IF TG_OP='INSERT' OR anterior IS DISTINCT FROM nuevo THEN
   INSERT INTO historial_precios(id_producto,id_usuario,campo_modificado,valor_anterior,valor_nuevo,fecha_cambio,evento,actor_nombre,motivo)
   VALUES(NEW.id_producto,actor,campo,anterior,nuevo,date_trunc('milliseconds',clock_timestamp()),
     CASE WHEN TG_OP='INSERT' THEN 'CREACION' ELSE 'CAMBIO' END,nombre_actor,
     COALESCE(NULLIF(current_setting('app.price_reason',true),''),'Edición de precios'));
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS precios_auditados ON precios_actuales;
CREATE TRIGGER precios_auditados AFTER INSERT OR UPDATE OR DELETE ON precios_actuales
FOR EACH ROW EXECUTE FUNCTION auditar_precios_actuales();

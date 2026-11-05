CREATE INDEX IF NOT EXISTS historial_cursor_global_idx ON historial_precios(fecha_cambio DESC,id_historial DESC);
CREATE INDEX IF NOT EXISTS precios_unidad_normal_idx ON precios_actuales(precio_unidad_normal,id_producto);
CREATE INDEX IF NOT EXISTS precios_unidad_dist_idx ON precios_actuales(precio_unidad_dist,id_producto);
-- IMPORTACION son filas de importación histórica sin actor de usuario;
-- CREACION/CAMBIO (ediciones) siempre las escribe el trigger con id_usuario.
ALTER TABLE historial_precios ADD CONSTRAINT historial_actor_requerido CHECK(evento='BASELINE' OR evento='IMPORTACION' OR id_usuario IS NOT NULL);

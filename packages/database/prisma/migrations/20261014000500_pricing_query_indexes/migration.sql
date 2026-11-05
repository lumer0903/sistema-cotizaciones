CREATE INDEX historial_cursor_global_idx ON historial_precios(fecha_cambio DESC,id_historial DESC);
CREATE INDEX precios_unidad_normal_idx ON precios_actuales(precio_unidad_normal,id_producto);
CREATE INDEX precios_unidad_dist_idx ON precios_actuales(precio_unidad_dist,id_producto);
ALTER TABLE historial_precios ADD CONSTRAINT historial_actor_requerido CHECK(evento='BASELINE' OR id_usuario IS NOT NULL);

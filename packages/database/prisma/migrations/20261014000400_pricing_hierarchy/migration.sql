ALTER TABLE precios_actuales ADD CONSTRAINT jerarquia_tarifas CHECK (
precio_unidad_normal>=precio_docena_normal AND precio_docena_normal>=precio_mayor_normal AND
precio_unidad_dist>=precio_docena_dist AND precio_docena_dist>=precio_mayor_dist
);

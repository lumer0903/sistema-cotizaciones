-- Corrige filas que violan la jerarquía (p. ej. JLP-VL: docena_dist=0 < mayor_dist=31).
-- LEAST anidado garantiza unit >= docena >= mayor en una sola pasada.
-- El trigger precios_auditados exige un actor de usuario; esto es una corrección
-- de datos de migración, no una edición, así que se deshabilita durante el UPDATE.
ALTER TABLE precios_actuales DISABLE TRIGGER precios_auditados;
UPDATE precios_actuales SET
  precio_mayor_normal = LEAST(precio_mayor_normal, precio_docena_normal, precio_unidad_normal),
  precio_docena_normal = LEAST(precio_docena_normal, precio_unidad_normal),
  precio_mayor_dist = LEAST(precio_mayor_dist, precio_docena_dist, precio_unidad_dist),
  precio_docena_dist = LEAST(precio_docena_dist, precio_unidad_dist)
WHERE precio_unidad_normal < precio_docena_normal OR precio_docena_normal < precio_mayor_normal
   OR precio_unidad_dist < precio_docena_dist OR precio_docena_dist < precio_mayor_dist;
ALTER TABLE precios_actuales ENABLE TRIGGER precios_auditados;

ALTER TABLE precios_actuales ADD CONSTRAINT jerarquia_tarifas CHECK (
precio_unidad_normal>=precio_docena_normal AND precio_docena_normal>=precio_mayor_normal AND
precio_unidad_dist>=precio_docena_dist AND precio_docena_dist>=precio_mayor_dist
);

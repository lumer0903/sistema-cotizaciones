-- Una alerta de estado mutable por producto/almacén. No se deduplican datos silenciosamente.
CREATE UNIQUE INDEX IF NOT EXISTS "alertas_stock_id_producto_id_almacen_key" ON "alertas_stock"("id_producto","id_almacen");
CREATE INDEX IF NOT EXISTS "inventario_movimientos_producto_almacen_fecha_id_idx" ON "inventario_movimientos"("id_producto","id_almacen","created_at","id_movimiento");
ALTER TABLE stock_actual ADD CONSTRAINT stock_actual_no_negativo CHECK(cantidad>=0) NOT VALID;
ALTER TABLE productos ADD CONSTRAINT productos_stock_valido CHECK(stock_principal>=0 AND stock_total>=0 AND stock_minimo>=0 AND unidades_por_caja>0) NOT VALID;
ALTER TABLE precios_actuales ADD CONSTRAINT precios_no_negativos CHECK(
  costo_normal>=0 AND precio_unidad_normal>=0 AND precio_docena_normal>=0 AND precio_mayor_normal>=0
  AND costo_distribuidor>=0 AND precio_unidad_dist>=0 AND precio_docena_dist>=0 AND precio_mayor_dist>=0) NOT VALID;
ALTER TABLE inventario_movimientos ADD CONSTRAINT movimientos_saldos_validos CHECK(
  stock_anterior>=0 AND stock_posterior>=0 AND (costo_unitario IS NULL OR costo_unitario>=0)
  AND ((tipo='entrada' AND cantidad>=0 AND stock_posterior=stock_anterior+cantidad)
    OR (tipo='salida' AND cantidad>0 AND stock_posterior=stock_anterior-cantidad)
    OR (tipo='ajuste' AND cantidad<>0 AND stock_posterior=stock_anterior+cantidad))) NOT VALID;
ALTER TABLE stock_actual VALIDATE CONSTRAINT stock_actual_no_negativo;
ALTER TABLE productos VALIDATE CONSTRAINT productos_stock_valido;
ALTER TABLE precios_actuales VALIDATE CONSTRAINT precios_no_negativos;
ALTER TABLE inventario_movimientos VALIDATE CONSTRAINT movimientos_saldos_validos;
-- Recuperar alertas omitidas sin modificar saldos ni movimientos históricos.
UPDATE alertas_stock a SET stock_actual=s.cantidad,stock_minimo=p.stock_minimo,
  estado=CASE WHEN p.deleted_at IS NOT NULL OR s.cantidad>p.stock_minimo THEN 'resuelta'::"AlertaEstado"
    WHEN a.reconocida_at IS NOT NULL THEN 'reconocida'::"AlertaEstado" ELSE 'activa'::"AlertaEstado" END
FROM stock_actual s JOIN productos p USING(id_producto)
WHERE a.id_producto=s.id_producto AND a.id_almacen=s.id_almacen;
INSERT INTO alertas_stock(id_producto,id_almacen,stock_actual,stock_minimo,estado)
SELECT s.id_producto,s.id_almacen,s.cantidad,p.stock_minimo,'activa'::"AlertaEstado"
FROM stock_actual s JOIN productos p USING(id_producto)
WHERE p.deleted_at IS NULL AND s.cantidad<=p.stock_minimo
ON CONFLICT(id_producto,id_almacen) DO NOTHING;

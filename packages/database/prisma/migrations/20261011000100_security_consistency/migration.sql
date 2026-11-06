ALTER TABLE "usuarios" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "notificaciones_lecturas" (
  "id_usuario" INTEGER NOT NULL REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE,
  "tipo" TEXT NOT NULL,
  "id_referencia" INTEGER NOT NULL,
  "leida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id_usuario", "tipo", "id_referencia")
);
CREATE INDEX "notificaciones_lecturas_id_usuario_tipo_leida_en_idx" ON "notificaciones_lecturas"("id_usuario", "tipo", "leida_en");
-- stock_actual es la fuente de verdad; corregir agregados históricos sin alterar movimientos.
UPDATE "productos" p SET
  "stock_total" = COALESCE((SELECT SUM(s.cantidad) FROM stock_actual s WHERE s.id_producto=p.id_producto),0),
  "stock_principal" = COALESCE((SELECT SUM(s.cantidad) FROM stock_actual s JOIN almacenes a ON a.id_almacen=s.id_almacen WHERE s.id_producto=p.id_producto AND a.codigo='ALM-001'),0);
ALTER TABLE "cotizacion_pagos" ADD COLUMN "clave_idempotencia" TEXT;
CREATE UNIQUE INDEX "cotizacion_pagos_id_cotizacion_clave_idempotencia_key" ON "cotizacion_pagos"("id_cotizacion", "clave_idempotencia");

CREATE INDEX IF NOT EXISTS "alertas_stock_id_almacen_stock_actual_stock_minimo_idx" ON "alertas_stock"("id_almacen", "stock_actual", "stock_minimo");
CREATE INDEX IF NOT EXISTS "cotizaciones_created_at_id_usuario_estado_idx" ON "cotizaciones"("created_at", "id_usuario", "estado");

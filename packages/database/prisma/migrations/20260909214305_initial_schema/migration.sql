-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'gerente', 'vendedor');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada');

-- CreateEnum
CREATE TYPE "TipoPrecio" AS ENUM ('normal', 'distribuidor');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('unidad', 'docena', 'mayor');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('borrador', 'emitida', 'parcial', 'pagada', 'anulada', 'devuelta');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('contado', 'credito');

-- CreateEnum
CREATE TYPE "OrigenMovimiento" AS ENUM ('compra', 'venta', 'devolucion_cliente', 'ajuste_fisico', 'merma', 'transferencia', 'cotizacion_aprobada');

-- CreateEnum
CREATE TYPE "AlertaEstado" AS ENUM ('activa', 'reconocida', 'resuelta');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida', 'castigada');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'yape_plin', 'mixto', 'credito');

-- CreateEnum
CREATE TYPE "TipoDocumentoVenta" AS ENUM ('factura', 'boleta', 'nota_venta', 'nota_credito', 'nota_debito', 'guia_remision');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('entrada', 'salida', 'ajuste', 'transferencia');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'vendedor',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id_categoria" SERIAL NOT NULL,
    "nombre_categoria" TEXT NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "productos" (
    "id_producto" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "foto_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stock_principal" INTEGER NOT NULL DEFAULT 0,
    "stock_tacna" INTEGER NOT NULL DEFAULT 0,
    "stock_total" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 10,
    "unidades_por_caja" INTEGER NOT NULL DEFAULT 1,
    "id_categoria" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "precios_actuales" (
    "id_producto" INTEGER NOT NULL,
    "costo_normal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "precio_unidad_normal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "precio_docena_normal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "precio_mayor_normal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "costo_distribuidor" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "precio_unidad_dist" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "precio_docena_dist" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "precio_mayor_dist" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precios_actuales_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "historial_precios" (
    "id_historial" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_usuario" INTEGER,
    "campo_modificado" TEXT NOT NULL,
    "valor_anterior" DECIMAL(10,2) NOT NULL,
    "valor_nuevo" DECIMAL(10,2) NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_precios_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "ruc_dni" TEXT,
    "tipo" "TipoPrecio" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diasCreditoDefecto" INTEGER,
    "diasGracia" INTEGER DEFAULT 0,
    "limiteCredito" DECIMAL(12,2) DEFAULT 0,
    "tasaMora" DECIMAL(5,2) DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id_cotizacion" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "id_cliente" INTEGER,
    "id_usuario" INTEGER,
    "tipo_precio" "TipoPrecio" NOT NULL DEFAULT 'normal',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "igv" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "observaciones" TEXT,
    "incluye_carreta" BOOLEAN NOT NULL DEFAULT true,
    "costo_carreta" DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'borrador',
    "tiempo_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tiempo_fin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id_cotizacion")
);

-- CreateTable
CREATE TABLE "cotizacion_detalle" (
    "id_detalle" SERIAL NOT NULL,
    "id_cotizacion" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "tipo_venta" "TipoVenta" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "color_notas" TEXT,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "es_sugerido_ia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cotizacion_detalle_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "almacenes" (
    "id_almacen" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id_almacen")
);

-- CreateTable
CREATE TABLE "stock_actual" (
    "id_stock" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_almacen" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_actual_pkey" PRIMARY KEY ("id_stock")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id_venta" SERIAL NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "numero_completo" VARCHAR(20) NOT NULL,
    "tipo_documento" "TipoDocumentoVenta" NOT NULL DEFAULT 'boleta',
    "estado" "EstadoVenta" NOT NULL DEFAULT 'emitida',
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "id_cotizacion" INTEGER,
    "id_cliente" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_almacen" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "igv" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "descuento_global" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tipoPago" "TipoPago" NOT NULL DEFAULT 'contado',
    "diasPlazo" INTEGER,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoPendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "autorizadoPor" INTEGER,
    "autorizadoAt" TIMESTAMP(3),
    "hash_cpe" TEXT,
    "qr_code" TEXT,
    "xml_enviado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id_venta")
);

-- CreateTable
CREATE TABLE "venta_detalle" (
    "id_detalle" SERIAL NOT NULL,
    "id_venta" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "tipo_venta" "TipoVenta" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "descuento_item" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "igv_item" DECIMAL(12,2) NOT NULL,
    "total_item" DECIMAL(12,2) NOT NULL,
    "es_sugerido_ia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "venta_detalle_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "venta_pagos" (
    "id_pago" SERIAL NOT NULL,
    "id_venta" INTEGER NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "id_usuario" INTEGER,
    "esMora" BOOLEAN NOT NULL DEFAULT false,
    "moraMonto" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "venta_pagos_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "cuentas_cobrar" (
    "id_cuenta" SERIAL NOT NULL,
    "id_venta" INTEGER NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "montoOriginal" DECIMAL(12,2) NOT NULL,
    "montoPendiente" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'pendiente',
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "diasAtraso" INTEGER NOT NULL DEFAULT 0,
    "moraAcumulada" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_cobrar_pkey" PRIMARY KEY ("id_cuenta")
);

-- CreateTable
CREATE TABLE "inventario_movimientos" (
    "id_movimiento" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_almacen" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "origen" "OrigenMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_anterior" INTEGER NOT NULL,
    "stock_posterior" INTEGER NOT NULL,
    "costo_unitario" DECIMAL(10,2),
    "id_referencia" INTEGER,
    "tipo_referencia" TEXT,
    "observaciones" TEXT,
    "id_usuario" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_movimientos_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "ia_interacciones" (
    "id_interaccion" SERIAL NOT NULL,
    "id_producto" INTEGER,
    "prompt" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_interacciones_pkey" PRIMARY KEY ("id_interaccion")
);

-- CreateTable
CREATE TABLE "alertas_stock" (
    "id_alerta" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_almacen" INTEGER NOT NULL,
    "stock_actual" INTEGER NOT NULL,
    "stock_minimo" INTEGER NOT NULL,
    "estado" "AlertaEstado" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconocida_at" TIMESTAMP(3),

    CONSTRAINT "alertas_stock_pkey" PRIMARY KEY ("id_alerta")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_nombre_idx" ON "usuarios" USING GIN ("nombre" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE INDEX "productos_descripcion_idx" ON "productos" USING GIN ("descripcion" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "productos_codigo_idx" ON "productos" USING GIN ("codigo" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "clientes" USING GIN ("nombre" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clientes_ruc_dni_idx" ON "clientes" USING GIN ("ruc_dni" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_numero_key" ON "cotizaciones"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_codigo_key" ON "almacenes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actual_id_producto_id_almacen_key" ON "stock_actual"("id_producto", "id_almacen");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_numero_completo_key" ON "ventas"("numero_completo");

-- CreateIndex
CREATE INDEX "ventas_estado_idx" ON "ventas"("estado");

-- CreateIndex
CREATE INDEX "ventas_fecha_emision_idx" ON "ventas"("fecha_emision");

-- CreateIndex
CREATE INDEX "ventas_id_cliente_fecha_emision_idx" ON "ventas"("id_cliente", "fecha_emision");

-- CreateIndex
CREATE INDEX "ventas_id_cotizacion_idx" ON "ventas"("id_cotizacion");

-- CreateIndex
CREATE INDEX "ventas_tipoPago_estado_idx" ON "ventas"("tipoPago", "estado");

-- CreateIndex
CREATE INDEX "venta_detalle_id_producto_idx" ON "venta_detalle"("id_producto");

-- CreateIndex
CREATE INDEX "venta_detalle_id_venta_idx" ON "venta_detalle"("id_venta");

-- CreateIndex
CREATE INDEX "venta_pagos_id_venta_idx" ON "venta_pagos"("id_venta");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_cobrar_id_venta_key" ON "cuentas_cobrar"("id_venta");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_fechaVencimiento_estado_idx" ON "cuentas_cobrar"("fechaVencimiento", "estado");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_id_cliente_estado_idx" ON "cuentas_cobrar"("id_cliente", "estado");

-- CreateIndex
CREATE INDEX "inventario_movimientos_id_almacen_created_at_idx" ON "inventario_movimientos"("id_almacen", "created_at");

-- CreateIndex
CREATE INDEX "inventario_movimientos_id_producto_created_at_idx" ON "inventario_movimientos"("id_producto", "created_at");

-- CreateIndex
CREATE INDEX "inventario_movimientos_tipo_referencia_id_referencia_idx" ON "inventario_movimientos"("tipo_referencia", "id_referencia");

-- CreateIndex
CREATE INDEX "alertas_stock_estado_idx" ON "alertas_stock"("estado");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_actuales" ADD CONSTRAINT "precios_actuales_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_detalle" ADD CONSTRAINT "cotizacion_detalle_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_detalle" ADD CONSTRAINT "cotizacion_detalle_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_actual" ADD CONSTRAINT "stock_actual_id_almacen_fkey" FOREIGN KEY ("id_almacen") REFERENCES "almacenes"("id_almacen") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_actual" ADD CONSTRAINT "stock_actual_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_almacen_fkey" FOREIGN KEY ("id_almacen") REFERENCES "almacenes"("id_almacen") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_pagos" ADD CONSTRAINT "venta_pagos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_pagos" ADD CONSTRAINT "venta_pagos_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimientos" ADD CONSTRAINT "inventario_movimientos_id_almacen_fkey" FOREIGN KEY ("id_almacen") REFERENCES "almacenes"("id_almacen") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimientos" ADD CONSTRAINT "inventario_movimientos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimientos" ADD CONSTRAINT "inventario_movimientos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "alertas_stock_id_almacen_fkey" FOREIGN KEY ("id_almacen") REFERENCES "almacenes"("id_almacen") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "alertas_stock_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

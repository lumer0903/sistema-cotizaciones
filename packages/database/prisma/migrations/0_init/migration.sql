-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "PermisoModulo" AS ENUM ('dashboard', 'productos', 'importacion', 'consulta_precios', 'cotizaciones', 'recomendaciones', 'pdf', 'usuarios', 'cobranza', 'ventas', 'reportes', 'configuracion');

-- CreateEnum
CREATE TYPE "NivelPermiso" AS ENUM ('sin_acceso', 'lectura', 'edicion');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('borrador', 'enviada', 'parcialmente_pagada', 'aprobada', 'rechazada');

-- CreateEnum
CREATE TYPE "TipoPrecio" AS ENUM ('normal', 'distribuidor');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('unidad', 'docena', 'mayor');

-- CreateEnum
CREATE TYPE "OrigenMovimiento" AS ENUM ('compra', 'venta', 'devolucion_cliente', 'ajuste_fisico', 'merma', 'transferencia', 'cotizacion_aprobada');

-- CreateEnum
CREATE TYPE "AlertaEstado" AS ENUM ('activa', 'reconocida', 'resuelta');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'yape_plin', 'mixto', 'credito');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('entrada', 'salida', 'ajuste', 'transferencia');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'vendedor',
    "avatar_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "usuario_permisos" (
    "id_usuario" INTEGER NOT NULL,
    "modulo" "PermisoModulo" NOT NULL,
    "nivel" "NivelPermiso" NOT NULL,

    CONSTRAINT "usuario_permisos_pkey" PRIMARY KEY ("id_usuario","modulo")
);

-- CreateTable
CREATE TABLE "roles" (
    "id_rol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "rol_permisos" (
    "id_rol" INTEGER NOT NULL,
    "modulo" "PermisoModulo" NOT NULL,
    "nivel" "NivelPermiso" NOT NULL,

    CONSTRAINT "rol_permisos_pkey" PRIMARY KEY ("id_rol","modulo")
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
    "tipo_flor" TEXT,
    "material" TEXT,
    "composicion" TEXT,
    "presentacion" TEXT,
    "follaje" TEXT,
    "numero_cabezas" INTEGER,
    "tamano" TEXT,
    "colores_surtido" JSONB,
    "foto_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stock_principal" INTEGER NOT NULL DEFAULT 0,
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
    "pdf_key" TEXT,
    "pdf_hash" TEXT,
    "pdf_generado_en" TIMESTAMP(3),

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
CREATE TABLE "cotizacion_pagos" (
    "id_pago" SERIAL NOT NULL,
    "id_cotizacion" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "id_usuario" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotizacion_pagos_pkey" PRIMARY KEY ("id_pago")
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
    "id_producto_sugerido" INTEGER,
    "tipo_sugerencia" TEXT,
    "accion_usuario" TEXT,
    "id_cotizacion" INTEGER,
    "id_usuario" INTEGER,
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

-- CreateTable
CREATE TABLE "configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_nombre_idx" ON "usuarios" USING GIN ("nombre" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "usuarios_deleted_at_created_at_idx" ON "usuarios"("deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE INDEX "productos_descripcion_idx" ON "productos" USING GIN ("descripcion" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "productos_codigo_idx" ON "productos" USING GIN ("codigo" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "productos_deleted_at_created_at_idx" ON "productos"("deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "productos_id_categoria_idx" ON "productos"("id_categoria");

-- CreateIndex
CREATE INDEX "historial_precios_id_producto_fecha_cambio_idx" ON "historial_precios"("id_producto", "fecha_cambio");

-- CreateIndex
CREATE INDEX "historial_precios_fecha_cambio_idx" ON "historial_precios"("fecha_cambio");

-- CreateIndex
CREATE INDEX "historial_precios_id_usuario_idx" ON "historial_precios"("id_usuario");

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "clientes" USING GIN ("nombre" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clientes_ruc_dni_idx" ON "clientes" USING GIN ("ruc_dni" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clientes_deleted_at_created_at_idx" ON "clientes"("deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_numero_key" ON "cotizaciones"("numero");

-- CreateIndex
CREATE INDEX "cotizaciones_created_at_idx" ON "cotizaciones"("created_at");

-- CreateIndex
CREATE INDEX "cotizaciones_estado_created_at_idx" ON "cotizaciones"("estado", "created_at");

-- CreateIndex
CREATE INDEX "cotizaciones_id_cliente_created_at_idx" ON "cotizaciones"("id_cliente", "created_at");

-- CreateIndex
CREATE INDEX "cotizaciones_id_usuario_idx" ON "cotizaciones"("id_usuario");

-- CreateIndex
CREATE INDEX "cotizaciones_fecha_vencimiento_estado_idx" ON "cotizaciones"("fecha_vencimiento", "estado");

-- CreateIndex
CREATE INDEX "cotizacion_detalle_id_cotizacion_idx" ON "cotizacion_detalle"("id_cotizacion");

-- CreateIndex
CREATE INDEX "cotizacion_detalle_id_producto_idx" ON "cotizacion_detalle"("id_producto");

-- CreateIndex
CREATE INDEX "cotizacion_pagos_id_cotizacion_idx" ON "cotizacion_pagos"("id_cotizacion");

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_codigo_key" ON "almacenes"("codigo");

-- CreateIndex
CREATE INDEX "stock_actual_id_almacen_idx" ON "stock_actual"("id_almacen");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actual_id_producto_id_almacen_key" ON "stock_actual"("id_producto", "id_almacen");

-- CreateIndex
CREATE INDEX "inventario_movimientos_id_almacen_created_at_idx" ON "inventario_movimientos"("id_almacen", "created_at");

-- CreateIndex
CREATE INDEX "inventario_movimientos_id_producto_created_at_idx" ON "inventario_movimientos"("id_producto", "created_at");

-- CreateIndex
CREATE INDEX "inventario_movimientos_tipo_referencia_id_referencia_idx" ON "inventario_movimientos"("tipo_referencia", "id_referencia");

-- CreateIndex
CREATE INDEX "inventario_movimientos_created_at_idx" ON "inventario_movimientos"("created_at");

-- CreateIndex
CREATE INDEX "inventario_movimientos_id_usuario_idx" ON "inventario_movimientos"("id_usuario");

-- CreateIndex
CREATE INDEX "ia_interacciones_created_at_idx" ON "ia_interacciones"("created_at");

-- CreateIndex
CREATE INDEX "ia_interacciones_id_producto_idx" ON "ia_interacciones"("id_producto");

-- CreateIndex
CREATE INDEX "alertas_stock_estado_idx" ON "alertas_stock"("estado");

-- CreateIndex
CREATE INDEX "alertas_stock_id_producto_id_almacen_estado_idx" ON "alertas_stock"("id_producto", "id_almacen", "estado");

-- CreateIndex
CREATE INDEX "alertas_stock_estado_created_at_idx" ON "alertas_stock"("estado", "created_at");

-- AddForeignKey
ALTER TABLE "usuario_permisos" ADD CONSTRAINT "usuario_permisos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "cotizacion_pagos" ADD CONSTRAINT "cotizacion_pagos_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_pagos" ADD CONSTRAINT "cotizacion_pagos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_actual" ADD CONSTRAINT "stock_actual_id_almacen_fkey" FOREIGN KEY ("id_almacen") REFERENCES "almacenes"("id_almacen") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_actual" ADD CONSTRAINT "stock_actual_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

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


# Apartado 3 — Base de Datos y Cambios en el Esquema

**Proyecto:** Sistema de Información Web para Incrementar la Eficiencia de la Gestión de Cotizaciones en Importaciones y Exportaciones Gold Continent EIRL

**Archivos de referencia:** `packages/database/prisma/schema.prisma` (461 líneas), `packages/database/prisma/migrations/*`, `apps/api/scripts/import-products/clean-db.sql`

---

## 3.1 Motor de base de datos (aclaración importante)

> **El sistema NO utiliza MySQL.** El motor es **PostgreSQL**, gestionado con **Prisma ORM**.

```prisma
// packages/database/prisma/schema.prisma:1-11
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pg_trgm]
}
```

- Extensión **`pg_trgm`** + índices **GIN** para búsquedas difusas por nombre/código/descripción.
- Cadena de conexión (`.env.example:2`):
  `postgresql://goldcontinent:goldcontinent_dev@localhost:5432/goldcontinent?schema=public`
- Los "scripts SQL" del proyecto son las **migraciones de Prisma** (más un script auxiliar de limpieza).

### Inventario de migraciones SQL (`packages/database/prisma/migrations/`)

| Carpeta | Contenido |
|---|---|
| `20261009190731_baseline/` | Esquema completo inicial (21 tablas + enums + índices) |
| `20261010_add_notificaciones_leidas/` | Tabla `notificaciones_leidas` |
| `20261011000100_security_consistency/` | Coherencia de seguridad (JWT/session_version, permisos) |
| `20261014000100_inventory_integrity/` | CHECKs: `unidades_por_caja > 0`, precios ≥ 0 |
| `20261014000200_inventory_alert_checks/` | CHECKs de `alertas_stock` |
| `20261014000300_pricing_audit/` | `historial_precios.campo_modificado` restringido a los 8 campos de precio |
| `20261014000400_pricing_hierarchy/` | **Jerarquía obligatoria:** `precio_unidad ≥ precio_docena ≥ precio_mayor` (por régimen) |
| `20261014000500_pricing_query_indexes/` | Índices de consulta de precios |
| `20261014000600_pricing_audit_batch/` | Tabla `precio_ajustes_lotes` (ajuste masivo) |
| `20240000000_add_costo_unidad.migration/` *(sin commitear)* | `ALTER TABLE producto ADD COLUMN costo_unidad_tienda / costo_unidad_distribuidor` |

⚠️ **Problema detectado en la última migración:** usa `ALTER TABLE producto` (la tabla real es **`productos`**) y un nombre de carpeta fuera del formato Prisma `YYYYMMDDHHMMSS_nombre`; por lo tanto **no es aplicable con `prisma migrate`** sin corrección previa.

**Script SQL auxiliar:** `apps/api/scripts/import-products/clean-db.sql`

```sql
BEGIN;
DELETE FROM inventario_movimientos;
DELETE FROM stock_actual;
DELETE FROM precios_actuales;
DELETE FROM historial_precios;
DELETE FROM alertas_stock;
DELETE FROM cotizacion_detalle;
DELETE FROM cotizacion_pagos;
DELETE FROM cotizaciones;
DELETE FROM clientes;
DELETE FROM productos;
COMMIT;
```

---

## 3.2 Tablas actuales y campos clave

**Verificadas en vivo:** 21 tablas de negocio + `_prisma_migrations`.

### Identidad y acceso
| Tabla | Campos clave |
|---|---|
| `usuarios` | `id_usuario`, `nombre`, `email` (unique), `password_hash`, `session_version`, `refresh_token_hash`, `rol` (default `vendedor`), `avatar_url`, `activo`, `created_at`, `updated_at`, `deleted_at` |
| `usuario_permisos` | PK compuesta `(id_usuario, modulo)` + `nivel` |
| `roles` | `nombre`, `codigo`, `es_sistema`, `orden`, `activo` |
| `rol_permisos` | PK compuesta `(id_rol, modulo)` + `nivel` |

### Catálogo
| Tabla | Campos clave |
|---|---|
| `categorias` | `id_categoria`, `nombre_categoria` |
| `productos` | `codigo` (unique), `descripcion`, `tipo_flor`, `material`, `composicion`, `presentacion`, `follaje`, `numero_cabezas`, `tamano`, `colores_surtido` (JSON), `foto_url`, `activo`, `stock_principal`, `stock_total`, `stock_minimo`, **`unidades_por_caja`**, `id_categoria`, `deleted_at` · *(en trabajo)* `costo_unidad_tienda`, `costo_unidad_distribuidor` |
| `precios_actuales` | `costo_normal`, `precio_unidad_normal`, `precio_docena_normal`, `precio_mayor_normal`, `costo_distribuidor`, `precio_unidad_dist`, `precio_docena_dist`, `precio_mayor_dist` (**8 columnas**) |
| `historial_precios` | `id_producto`, `id_usuario`, `evento`, `actor_nombre`, `motivo`, `campo_modificado`, `valor_anterior`, `valor_nuevo`, `fecha_cambio` |

### Clientes y cotizaciones
| Tabla | Campos clave |
|---|---|
| `clientes` | `nombre`, `telefono`, `email`, `ruc_dni`, **`tipo`** (`normal`/`distribuidor`), `diasCreditoDefecto`, `diasGracia`, `limiteCredito`, `tasaMora`, `deleted_at` |
| `cotizaciones` | `numero` (unique), `id_cliente`, `id_usuario`, **`tipo_precio`**, `subtotal`, `igv`, `total`, `observaciones`, **`incluye_carreta`** (default `true`), **`costo_carreta`** (default `15.00`), **`estado`**, `tiempo_inicio`, `tiempo_fin`, `convertida_en`, `created_at`, `fecha_vencimiento`, `pdf_key`, `pdf_hash`, `pdf_generado_en` |
| `cotizacion_detalle` | `id_producto`, **`tipo_venta`**, `cantidad`, `color_notas`, `precio_unitario`, `subtotal`, **`es_sugerido_ia`** |
| `cotizacion_pagos` | `monto`, `metodo_pago`, `clave_idempotencia`, `referencia`, `id_usuario`; unique `(id_cotizacion, clave_idempotencia)` |

### Inventario
| Tabla | Campos clave |
|---|---|
| `almacenes` | `codigo` (unique), `nombre`, `ubicacion`, `activo` |
| `stock_actual` | `id_producto`, `id_almacen`, `cantidad`; **unique** `(id_producto, id_almacen)` |
| `inventario_movimientos` | `tipo`, `origen`, `cantidad`, `stock_anterior`, `stock_posterior`, `costo_unitario`, `id_referencia`, `tipo_referencia`, `observaciones`, `id_usuario` |
| `alertas_stock` | `stock_actual`, `stock_minimo`, `estado`, `reconocida_at`; unique `(id_producto, id_almacen)` |

### IA, notificaciones y configuración
| Tabla | Campos clave |
|---|---|
| **`ia_interacciones`** | `id_producto`, `id_producto_sugerido`, `tipo_sugerencia`, `accion_usuario`, `id_cotizacion`, `id_usuario`, `prompt`, `respuesta`, `created_at` |
| `notificaciones_lecturas` | PK `(id_usuario, tipo, id_referencia)` + `leida_en` |
| `notificaciones_leidas` | `tipo`, `id_referencia`, `leida_en` |
| `precio_ajustes_lotes` | `clave` (UUID), `id_usuario`, `solicitud` (JSON), `resultado` (JSON), `created_at` |
| `configuracion` | `clave` (PK), `valor`, `descripcion`, `updated_at` |

---

## 3.3 ENUM del estado de las cotizaciones

```prisma
// packages/database/prisma/schema.prisma:365-373
enum EstadoCotizacion {
  borrador
  enviada
  parcialmente_pagada
  aprobada
  rechazada
  expirada
  convertida_a_venta
}
```

> **El conjunto de estados CAMBIÓ** respecto de la configuración histórica `BORRADOR / ENVIADO / ACEPTADO / RECHAZADO / PAGADO`. Hoy son **7 estados**: `borrador`, `enviada`, `parcialmente_pagada`, `aprobada`, `rechazada`, `expirada`, `convertida_a_venta`. El concepto de "pagado" se modela ahora con la tabla `cotizacion_pagos` + el estado `parcialmente_pagada`.

**Distribución real en BD (consulta directa):** 22 cotizaciones `aprobada` · 18 `enviada`.

### Otros enums del modelo

```prisma
enum PermisoModulo { dashboard, productos, importacion, consulta_precios, cotizaciones,
                     recomendaciones, pdf, usuarios, cobranza, reportes, configuracion, ventas }
enum NivelPermiso  { sin_acceso, lectura, edicion }
enum TipoPrecio    { normal, distribuidor }              // Tienda vs Distribuidor
enum TipoVenta     { unidad, docena, mayor }             // SIN 'caja'
enum OrigenMovimiento { compra, venta, devolucion_cliente, ajuste_fisico,
                        merma, transferencia, cotizacion_aprobada }
enum AlertaEstado  { activa, reconocida, resuelta }
enum MetodoPago    { efectivo, transferencia, tarjeta_credito, tarjeta_debito,
                     yape_plin, mixto, credito }
enum TipoMovimiento{ entrada, salida, ajuste, transferencia }
```

---

## 3.4 Tablas/campos de auditoría, métricas de IA e historial de precios

### 3.4.1 Auditoría de IA — **`ia_interacciones` SÍ existe**

```prisma
// schema.prisma:307-322
model IaInteracciones {
  id_interaccion      Int      @id @default(autoincrement())
  id_producto         Int?
  id_producto_sugerido Int?
  tipo_sugerencia     String?   // valor usado: 'SIMILITUD_COSENO_TFIDF'
  accion_usuario      String?   // 'ACEPTADO' | 'RECHAZADO'
  id_cotizacion       Int?
  id_usuario          Int?
  prompt              String    // contexto de la solicitud
  respuesta           String    // JSON con los scores devueltos
  created_at          DateTime  @default(now())
  @@index([created_at])
  @@index([id_producto])
  @@map("ia_interacciones")
}
```

- **No existe ninguna tabla `ia_log`** ni tablas de métricas agregadas de IA (no hay precisión, tasa de aceptación ni KPIs del motor): solo el log crudo de interacciones.
- **Estado actual:** 40 registros; ninguno con `accion_usuario` completado.

### 3.4.2 Historial de precios — **SÍ existe (2 tablas)**

```prisma
// schema.prisma:137-157
model HistorialPrecios {
  id_historial, id_producto, id_usuario,
  evento          String @default("CAMBIO"),
  actor_nombre    String @default("Usuario heredado"),
  motivo          String @default("Edición de precios"),
  campo_modificado String,           // restringido por CHECK a los 8 campos
  valor_anterior  Decimal @db.Decimal(10, 2),
  valor_nuevo     Decimal @db.Decimal(10, 2),
  fecha_cambio    DateTime @default(now())
}
```
- **11.179 registros** en la BD actual.
- Índices: `(id_producto, fecha_cambio)`, cursor por producto, cursor global, `fecha_cambio`.
- `precio_ajustes_lotes` complementa con los **ajustes masivos** (solicitud/resultado en JSON).

### 3.4.3 Auditoría de inventario
- `inventario_movimientos` con `stock_anterior` / `stock_posterior`, `origen` y referencia al documento (`tipo_referencia`, `id_referencia`).

---

## 3.5 ¿Existen campos/tablas para la venta por cajas / mayorista?

| Elemento | ¿Existe? | Detalle |
|---|---|---|
| Campo de unidades por caja | **Sí** | `productos.unidades_por_caja Int @default(1)` (`schema.prisma:97`) con CHECK `>0` (migración `20261014000100`) |
| Campo/columna `precio_caja` | **No** | `precios_actuales` solo tiene `precio_mayor_*`; el historial solo admite los 8 campos existentes |
| Tabla de cajas / pedidos mayoristas | **No** | No hay tabla ni relación |
| Campos de cajas en el detalle de cotización | **No** | `cotizacion_detalle` solo tiene `tipo_venta`, `cantidad`, `precio_unitario`, `subtotal` |
| Valor `caja` en `TipoVenta` | **No** | `TipoVenta { unidad, docena, mayor }` |
| *(En trabajo, sin commitear)* Costos por unidad | Parcial | `producto.costo_unidad_tienda`, `producto.costo_unidad_distribuidor` (migración mal nombrada, ver §3.1) |

**Conclusión:** la venta por cajas **no está modelada en el esquema**; `unidades_por_caja` es un metadato de empaque. Un modelo real de cajas exigiría, como mínimo, un valor `caja` en `TipoVenta` (o columnas `cajas` / `unidades_totales` en `cotizacion_detalle`) y su reflejo en `inventario_movimientos`.

---

## 3.6 Índices y restricciones relevantes

| Elemento | Ubicación |
|---|---|
| Búsqueda difusa GIN (`gin_trgm_ops`) | `usuarios.nombre`, `productos.descripcion`, `productos.codigo`, `clientes.nombre`, `clientes.ruc_dni` |
| Índices de cotizaciones | `(created_at)`, `(estado, created_at)`, `(id_cliente, created_at)`, `(id_usuario)`, `(fecha_vencimiento, estado)`, `cotizacion_usuario_estado_fecha_idx`, `cotizacion_usuario_vencimiento_estado_idx` |
| Jerarquía de precios | `20261014000400_pricing_hierarchy` → `unidad ≥ docena ≥ mayor` (ambos regímenes) |
| Precios ≥ 0 y `unidades_por_caja > 0` | `20261014000100_inventory_integrity` |
| `campo_modificado` restringido | `20261014000300_pricing_audit` (solo los 8 campos de precio) |
| Idempotencia de pagos | `@@unique([id_cotizacion, clave_idempotencia])` |

---

## 3.7 Estado de los datos (consulta directa a PostgreSQL, oct-2026)

```sql
SELECT count(*) total,
       count(*) FILTER (WHERE activo AND deleted_at IS NULL) activos
FROM productos;                 -- 1695 / 1664

SELECT estado, count(*) FROM cotizaciones GROUP BY 1;
-- aprobada: 22 · enviada: 18

SELECT count(*) FROM ia_interacciones;      -- 40
SELECT count(*) FROM historial_precios;     -- 11179
SELECT tipo, count(*) FROM clientes;        -- normal: 18 · distribuidor: 14
```

# Módulos — Gold Continent

> Qué hace cada módulo del backend (`apps/api/src/modules`) y cada feature del frontend (`apps/web/src/features`).

---

## Backend (NestJS)

### auth
Autenticación JWT con access token (15 min) y refresh token (7 días) en cookies httpOnly + Bearer. Login, refresh con rotación y hash bcrypt en BD, logout, perfil y cambio de contraseña. Exporta `JwtAuthGuard` usado por todos los demás controllers.

- **Arquitectura:** hexagonal parcial (`domain/`, `application/`, `adapters/`, `infrastructure/`) — pero el login real llama a la función plana de `auth.service.ts`; el `LoginUseCase` está inyectado sin usarse (deuda de migración).
- **Código muerto:** `auth.controller.ts` (handlers Express sin registrar).

### usuarios
CRUD de usuarios del equipo con roles (`admin`, `gerente`, `vendedor`), activar/desactivar y soft delete.

- DTOs inline en el controller; `findAll` **no filtra** `deleted_at` (inconsistencia con clientes/productos).
- Sin control de roles server-side.

### clientes
Maestro de clientes con datos comerciales: tipo de precio (`normal`/`distribuidor`) y condiciones de crédito (`diasCreditoDefecto`, `diasGracia`, `limiteCredito`, `tasaMora`).

- Los campos de crédito se almacenan pero **ningún módulo backend los consume** (no se calcula mora ni fecha de vencimiento).

### productos
Catálogo de flores/artículos de floristería con precios duales (normal/distribuidor × unidad/docena/mayor), fotos en MinIO, stock inicial y vínculo categoría+almacén.

- `PATCH /:id/precios` registra auditoría en `historial_precios`.
- `create()` autocrea almacén `ALM-001` si no existe; hardcodea almacén principal.
- Umbral "bajo stock" hardcodeado a `<= 20` (ignora `stock_minimo` del producto).

### cotizaciones
**Núcleo del negocio.** Ciclo de vida: `borrador → enviada → aprobada / parcialmente_pagada / rechazada`. Numeración correlativa `COT-001`, detalle de ítems, carreta (envío), pagos/abonos y exportación PDF (pdfkit).

- Sin DTOs (`body: any`) → sin validación.
- `registrarPago` está **duplicado** en `cobranza.service.ts`.
- `cambiarEstado` no valida máquina de transiciones ni escribe `tiempo_fin`.
- `fecha_vencimiento` nunca se escribe → cobranza no puede marcar "vencida".
- Submódulo `recomendaciones/` anidado (importado 2 veces en `app.module`).

### cotizaciones/recomendaciones (submódulo)
`POST /cotizaciones/recomendar-item`: recibe producto base, llama a la IA, enriquece con stock real por almacén y precios vigentes, audita en `ia_interacciones`. Es el endpoint de IA **sí usado por el frontend**.

- Fallback a mock silencioso si la IA no está configurada.

### inventario
Movimientos de stock por almacén (entrada/salida/ajuste/transferencia), kardex con export CSV, stock actual y alertas de mínimo.

- `getMovimientos()` existe sin endpoint.
- No sincroniza `producto.stock_total` al mover stock → dos fuentes de verdad.

### almacenes
Maestro de almacenes/sedes (código, nombre, ubicación, activo). Hard delete bloqueado si tiene stock o movimientos.

- `findByCodigo()` sin uso (productos consulta Prisma directo).

### categorias
Catálogo simple de categorías (`nombre_categoria`). CRUD completo con hard delete sin verificar productos asociados.

### cobranza
Cartera de cobro sobre cotizaciones: estado (`pendiente|parcial|pagada|vencida`), días de atraso, historial y registro de abonos.

- `registrarPago` duplicado respecto a cotizaciones.
- Paginación **en memoria** (carga todo y `.slice()`).
- Estado "vencida" muerto (nadie escribe `fecha_vencimiento`); no calcula mora (`tasaMora` sin usar).

### dashboard
KPIs de administración/tesis: tasa de conversión, efectividad de IA, tiempo promedio de cotización, alertas de stock + gráficos.

- `tiempoPromedioCotizacion` lee `tiempo_fin` que nadie escribe → siempre 0.
- `getDetalleKpis` duplica queries de `getKpis`.

### configuracion
Almacén clave-valor (`clave`, `valor`, `descripcion`) con endpoints REST:

- `GET /api/configuracion` — mapa completo clave→valor
- `PUT /api/configuracion` — upsert (solo `admin`)

El frontend `/admin/configuracion` carga y guarda contra esta API.

### historial-precios
Solo lectura: auditoría de cambios de precio (quién, qué campo, valor anterior/nuevo, cuándo). Los datos se escriben desde `productos.updatePrecios`.

### ai
Adaptador DDD del microservicio FastAPI (`AI_SERVICE_URL`): `POST /ai/suggest-quote` → `/suggest`.

- Mock/fallback si no hay URL o en errores fuera de producción.
- El frontend no usa este endpoint (usa `recomendar-item`).

### template
Scaffold DDD vacío (domain/application/adapters/infrastructure con `.gitkeep`). No registrado en `app.module.ts`.

---

## Frontend (features)

### auth
`api/login.ts` — llamada a `POST /auth/login`. El login real de la UI usa `AuthProvider` (`lib/authProvider`).

### cotizaciones
Feature principal: listar con filtros, crear/editar borradores (store Zustand persist), cambiar estado, detalle, export PDF, autocomplete de cliente, creación rápida de clientes y **panel de recomendaciones IA** (Similar/Upsell/Equilibrio). También integra la API de cobranza (listado, detalle, pagos).

- Components: `CotizacionesTable`, `AgregarProductoModal`, `ClienteAutocomplete`, `RecomendacionesPanel`.

### inventario
✅ **Frontend al 100%.** CRUD productos (RHF+zod), movimientos, transferencias entre almacenes, kardex + export CSV, stock/alertas, configuración de colores por producto.

- Components: `InventarioTable/Filters`, `ProductoModal`, `MovimientoModal`, `TransferenciaModal`, `KardexModal`, `DetalleProductoModal` (Ficha Técnica), `AlertasStockTable`, `ColorTags`, `ColorConfigModal`.
- `ColorConfigModal`: chips con color real vía `resolveColorHex` (mapa + aliases del seed, ej. `FUSCIA`); lista vacía en producto nuevo; botón Guardar dinámico (deshabilitado/gris sin colores → amarillo `#F8B602` con ≥1).
- `ColorTags` (Ficha Técnica): círculo HEX junto al nombre, `border-gray-200` para blancos.
- Hooks: *(eliminados sin uso: `useInventario`, `useInventarioModals`)*. La page orquesta con `useState` + `apiClient` y recibe `categorias`/`almacenes` como props de los modales.

### precio-historial
✅ **Frontend al 100%.** Consulta de precios reales (`GET /api/productos?include=precios,stock`) e historial de cambios (`/historial-precios`).

- Los 6 precios por producto se leen de `precios_actuales` del backend (sin mocks).
- `HistorialPrecioModal` usa las primitivas `Table*` unificadas.

### Features activas

`configuracion` (api de config), `usuarios` (api de usuarios), `cotizaciones`, `inventario`, `precio-historial`.

### Features eliminadas / sin scaffold

- `auth` — eliminada (la UI usa `AuthProvider`).
- `ventas` — eliminada (módulo legacy sin UI).
- `dashboard` — sin feature; la página usa `apiClient` directo.

---

## Relación entre módulos

```
auth ──exporta──► JwtAuthGuard ──► todos los controllers
productos ◄──► categorias, almacenes, historial-precios (auditoría precios)
productos ◄──► inventario (stock_actual, movimientos)
cotizaciones ◄──► clientes, productos, recomendaciones ──► ai ──► FastAPI
cotizaciones ◄──► cobranza (pagos/abonos sobre las mismas cotizaciones)
dashboard ──lee──► cotizaciones + inventario + ia_interacciones
configuracion ──(sin consumidores)──
```

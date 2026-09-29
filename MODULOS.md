# Módulos — Gold Continent

> Qué hace cada módulo del backend (`apps/api/src/modules`) y cada feature del frontend (`apps/web/src/features`).

---

## Backend (NestJS)

### auth
Autenticación JWT con access token (15 min) y refresh token (7 días) en cookies httpOnly + Bearer. Login, refresh con rotación y hash bcrypt en BD, logout, perfil, cambio de contraseña, nombre/email (`PATCH /auth/profile`) y foto de perfil (`PATCH|DELETE /auth/avatar`). Exporta `JwtAuthGuard` usado por todos los demás controllers.

- **Arquitectura:** hexagonal parcial (`domain/`, `application/`, `adapters/`, `infrastructure/`) — pero el login real llama a la función plana de `auth.service.ts`; el `LoginUseCase` está inyectado sin usarse (deuda de migración).
- **Código muerto:** `auth.controller.ts` (handlers Express sin registrar).

### usuarios
✅ **Frontend al 100%.** CRUD de usuarios del equipo: nombre, correo, contraseña, **rol dinámico** (código string en JWT; catálogo en tabla `roles`), **foto de perfil** (`avatar_url`), activar/desactivar. **No se eliminan** (sin endpoint DELETE; solo desactivar).

- Backend: `POST` crea; `PATCH /:id` edita datos (+password opcional + `avatar_url` data URL o `null`); `PATCH /:id/activo` estado; `GET|PUT /:id/permisos` overrides (inerte en UI actual).
- Guardrails: no desactivar la propia cuenta; no desactivar el único admin activo; `findAll`/login filtran `deleted_at`; `rol` validado contra tabla `roles`.
- `auth/me` y login devuelven `avatar_url` + `permisos` (overrides); el FE (`usePermissions`/`puede`) los aplica sobre la matriz del rol (BD o defaults). Foto de perfil: `PATCH/DELETE /auth/avatar` + `PerfilModal` en el navbar (**solo foto editable**; nombre/correo solo lectura).
- UI: tabs **[Usuarios] | [Roles y Permisos]**; lista con `FilterCard`+`Input` lupa; dropdown acciones en portal (solo Editar + estado); `UsuarioModal` (crear/editar/cambiar contraseña/foto); `ConfirmModal`.

### roles
✅ **Frontend al 100%.** Módulo Nest `roles` + vista `RolesYPermisosView`.

- Endpoints: CRUD roles + `GET|PUT /:id/permisos`. Roles sistema (`admin`/`gerente`/`vendedor`) no se borran.
- Matriz admin **bloqueada** (siempre `edicion` en los 12 módulos por seguridad).
- Sub-pestañas de módulos: **Sistema administrativo** (dashboard, usuarios, reportes, configuracion, cobranza, importacion) / **Sistema operativo** (productos, consulta_precios, cotizaciones, recomendaciones, pdf, ventas).
- UI: lista izquierda + “Agregar Rol” `bg-brand-primary`; matriz derecha con checkboxes por nivel (amarillo `#F8B602`) y “Guardar Cambios”.

### clientes
Maestro de clientes con datos comerciales: tipo de precio (`normal`/`distribuidor`) y condiciones de crédito (`diasCreditoDefecto`, `diasGracia`, `limiteCredito`, `tasaMora`).

- Los campos de crédito se almacenan pero **ningún módulo backend los consume** (no se calcula mora ni fecha de vencimiento).

### productos
Catálogo de flores/artículos de floristería con precios duales (normal/distribuidor × unidad/docena/mayor), fotos en MinIO, stock inicial y vínculo categoría+almacén.

- `PATCH /:id/precios` registra auditoría en `historial_precios`.
- `create()` autocrea almacén `ALM-001` si no existe; hardcodea almacén principal.
- Umbral "bajo stock" hardcodeado a `<= 20` (ignora `stock_minimo` del producto).

### cotizaciones
**Núcleo del negocio.** Ciclo de vida con **máquina de transiciones validada en backend** (400 en saltos): `borrador → enviada → aprobada / parcialmente_pagada / rechazada` (`aprobada` terminal; `rechazada → borrador` reabre; los pagos cambian estado por su vía en `registrarPago`). Numeración correlativa `COT-001`, detalle de ítems, carreta (envío), pagos/abonos y exportación PDF **cacheada + en cola BullMQ** (ver submódulo `pdf/`).

- **DTOs class-validator** en `dto/` (6): `create-cotizacion`, `create-cotizacion-detalle`, `update-cotizacion`, `cambiar-estado`, `registrar-pago`, `listar-cotizaciones.query` — el `ValidationPipe` global rechaza campos/query desconocidos (`400`); el service sigue validando lo referencial (detalle, máquina de estados, carreta).
- **93 tests unitarios/integración** (vitest): `cotizaciones.service.test.ts` (44) + `pdf/pdf-hash.test.ts` (6) + `pdf/pdf-export.service.test.ts` (8) + `pdf/pdf-role.test.ts` (6) + `cobranza.service.integration.test.ts` (5) + `dashboard.service.integration.test.ts` (3) + `auth/rbac.test.ts` (16) + `auth/jwt-secrets.test.ts` (5).
- `registrarPago` está **duplicado** en `cobranza.service.ts`.
- `cambiarEstado` **escribe `tiempo_fin`** al pasar a `enviada` (indicador de tesis: tiempo de generación termina en el envío).
- `fecha_vencimiento` se llena desde el DTO de crear/editar (la fija el asesor de ventas) → habilita la cobranza "vencida".
- Submódulo `recomendaciones/` anidado (importado 2 veces en `app.module`).

### cotizaciones/pdf (submódulo)
Generación de PDFs **asíncrona y cacheada** (Puppeteer → A4):

- **Cache:** hash sha256 de los campos del HTML (`pdf-hash.ts`); si `pdf_hash` vigente + objeto legible en MinIO (bucket `cotizacion-pdfs`, key `cotizaciones/<id>-<hash>.pdf`) o en disco (`pdfs/…` cuando MinIO está off) → **200 binario** con `X-PDF-Cache: hit`.
- **Miss:** encola job `generate-pdf` (id determinista `cotizo-pdf:<id>:<hash>`) en la cola `cotizacion-pdfs` (reintentos 2, backoff exponencial) y espera ≤ 15 s → `200` recién generado o **`202`** con `jobId` y `poll: /api/cotizaciones/:id/pdf-status`.
- **Worker `PdfProcessor`** (`@Processor('cotizacion-pdfs')`, concurrency 2): genera el HTML→PDF, lo guarda (`pdf-storage.service.ts`, MinIO con fallback local y guard contra path traversal) y escribe `pdf_key`, `pdf_hash`, `pdf_generado_en` en `cotizaciones`. El registro es **condicional** vía `PdfWorkerModule.forRoot(entrada)` según `PDF_ROLE` (`both` = proceso único · `producer` = sólo encola · `consumer` = proceso dedicado `pdf-worker.ts`, puerto `PDF_WORKER_PORT`, sólo expone `/health`).
- **Endpoints:** `GET /:id/export-pdf` (híbrido) + `GET /:id/pdf-status` → `{estado: pendiente|generando|listo, jobId, pdf_generado_en}`.
- Archivos: `pdf.constants.ts`, `pdf-hash.ts`, `pdf-storage.service.ts`, `pdf.processor.ts`, `pdf-export.service.ts`, `pdf-worker.module.ts` (+ 18 tests); procesos: `worker.module.ts` + `pdf-worker.ts` en la raíz de `src/`.

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
- Estado "vencida" **operativo** cuando el asesor fija `fecha_vencimiento`; no calcula mora (`tasaMora` sin usar).

### dashboard
KPIs de administración/tesis: tasa de conversión, efectividad de IA, tiempo promedio de cotización, alertas de stock + gráficos. **Indicadores de la tesis**: `eficacia` (aprobadas/total×100), `rendimientoMonetario` (Σ aprobadas/Σ total×100) y `tiempoPromedioCotizacion` (min, vivo desde que `cambiarEstado` escribe `tiempo_fin`).

- `getDetalleKpis` hace las mismas queries base que `getKpis` más gráficos (paralelo, no duplica roundtrips).

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
Feature principal: listar con filtros server-side (`buscar`/`fecha`/`estado`, con **debounce 300 ms vía `useDebounce`**), crear/editar con **formulario unificado** (`CotizacionesFormulario` + `CotizacionesEditarLoader`), store Zustand persist con dedup de clientes, cambiar estado **con máquina + `ConfirmModal` en sensibles** (aprobar/rechazar/parcial) en el detalle, detalle, **export PDF con polling** (`exportarPdfCotizacion` → `getCotizacionPdfBlob`: ante 202 sondea `pdf-status` cada 2 s × 10 y solo re-pide `export-pdf` cuando está `listo`; spinner en el botón durante la descarga, toast solo en error/timeout), autocomplete de cliente con debounce/teclado, creación rápida de clientes y **panel de recomendaciones IA** (Similar/Upsell/Equilibrio). También integra la API de cobranza (listado, detalle, pagos).

- Components: `CotizacionesTable`, `CotizacionesFormulario`, `CotizacionesEditarLoader`, `AgregarProductoModal`, `ClienteAutocomplete`, `RecomendacionesPanel`, `ResumenCotizacionCard`.
- Preview `PdfViewerPage` (`/admin|/vendedor/cotizaciones/pdf/[id]`) usa `getCotizacionPdfObjectUrl` (mismo flujo de polling).

### inventario
✅ **Frontend al 100%.** CRUD productos (RHF+zod), movimientos, transferencias entre almacenes, kardex + export CSV, stock/alertas, configuración de colores por producto.

- Components: `InventarioTable/Filters`, `ProductoModal`, `MovimientoModal`, `TransferenciaModal`, `KardexModal`, `DetalleProductoModal` (Ficha Técnica), `AlertasStockTable`, `ColorTags`, `ColorConfigModal`.
- `ColorConfigModal`: chips con color real vía `resolveColorHex` (mapa + aliases del seed, ej. `FUSCIA`); lista vacía en producto nuevo; botón Guardar dinámico (deshabilitado/gris sin colores → amarillo `#F8B602` con ≥1).
- `ColorTags` (Ficha Técnica): círculo HEX junto al nombre, `border-gray-200` para blancos.
- **Búsqueda con debounce 300 ms** (`useDebounce`): vive en el padre `app/admin/inventario/page.tsx` (el componente `InventarioFilters` solo recibe props).
- Hooks: *(eliminados sin uso: `useInventario`, `useInventarioModals`)*. La page orquesta con `useState` + `apiClient` y recibe `categorias`/`almacenes` como props de los modales.

### precio-historial
✅ **Frontend al 100%.** Consulta de precios reales (`GET /api/productos?include=precios,stock`) e historial de cambios (`/historial-precios`).

- Los 6 precios por producto se leen de `precios_actuales` del backend (sin mocks).
- `HistorialPrecioModal` usa las primitivas `Table*` unificadas.

### Features activas

`configuracion` (api de config), `usuarios` (api de usuarios + roles), `cotizaciones`, `inventario`, `precio-historial`.

### Features eliminadas / sin scaffold

- `auth` — eliminada (la UI usa `AuthProvider`).
- `ventas` — eliminada (módulo legacy sin UI).
- `dashboard` — sin feature; la página usa `apiClient` directo.

### Páginas sin feature propia (usan `apiClient` directo)

`admin/dashboard`, `admin/reportes`, `admin/precios`, `admin/configuracion`, `admin/cobranza`, `vendedor/catalogo`. Las búsquedas de **cotizaciones** (admin/vendedor), **cobranza**, **inventario** y **catálogo** están debounced con `useDebounce` (300 ms) — ver `COMPONENTES.md` / `hooks/useDebounce.ts`. En `vendedor/cotizaciones` el filtro local lee el valor crudo (respuesta inmediata) y la API el debounced.

---

## Relación entre módulos

```
auth ──exporta──► JwtAuthGuard ──► todos los controllers
productos ◄──► categorias, almacenes, historial-precios (auditoría precios)
productos ◄──► inventario (stock_actual, movimientos)
cotizaciones ◄──► clientes, productos, recomendaciones ──► ai ──► FastAPI
cotizaciones/pdf ──► redis (BullMQ `cotizacion-pdfs`) + minio (`cotizacion-pdfs`) / disco local
cotizaciones ◄──► cobranza (pagos/abonos sobre las mismas cotizaciones)
dashboard ──lee──► cotizaciones + inventario + ia_interacciones
configuracion ──(sin consumidores)──
```

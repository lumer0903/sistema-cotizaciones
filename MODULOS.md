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
**Núcleo del negocio.** Ciclo de vida con **máquina de transiciones validada en backend** (400 en saltos): `borrador → enviada → aprobada / parcialmente_pagada / rechazada` (`aprobada` terminal; `rechazada → borrador` reabre; los pagos cambian estado por su vía en `registrarPago`). Numeración correlativa `COT-001`, detalle de ítems, carreta (envío), pagos/abonos y exportación PDF (**Puppeteer/Chromium**: HTML → A4; preview del OJO = mismo archivo descargado).

- Sin DTOs (`body: any`), pero validación imperativa en el service: detalle (`id_producto>0`, `cantidad>0`, `precio>=0`), catálogo/máquina de estados y coherencia de carreta.
- **41 tests unitarios** (`cotizaciones.service.test.ts`, vitest): máquina de transiciones, validación de detalle, carreta y guardrails de pagos.
- `registrarPago` está **duplicado** en `cobranza.service.ts`.
- `cambiarEstado` no escribe `tiempo_fin` (KPI tiempo muerto sigue en 0).
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
Feature principal: listar con filtros server-side (`buscar`/`fecha`/`estado`, con debounce), crear/editar con **formulario unificado** (`CotizacionesFormulario` + `CotizacionesEditarLoader`), store Zustand persist con dedup de clientes, cambiar estado **con máquina + `ConfirmModal` en sensibles** (aprobar/rechazar/parcial) en el detalle, detalle, export PDF, autocomplete de cliente con debounce/teclado, creación rápida de clientes y **panel de recomendaciones IA** (Similar/Upsell/Equilibrio). También integra la API de cobranza (listado, detalle, pagos).

- Components: `CotizacionesTable`, `CotizacionesFormulario`, `CotizacionesEditarLoader`, `AgregarProductoModal`, `ClienteAutocomplete`, `RecomendacionesPanel`, `ResumenCotizacionCard`.

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

`configuracion` (api de config), `usuarios` (api de usuarios + roles), `cotizaciones`, `inventario`, `precio-historial`.

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

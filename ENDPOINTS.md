# Endpoints — Gold Continent API

> **Base URL:** `http://localhost:3001` · **Prefijo global:** `/api` · **Total:** 70 endpoints en 15 controllers
> **Documentación interactiva (Scalar):** `GET http://localhost:3001/reference`
> **Autenticación:** JWT en cookie httpOnly (`accessToken`) o header `Authorization: Bearer <token>`

Todos los controllers aplican `JwtAuthGuard` a nivel de clase salvo los endpoints públicos de login/refresh. **`RolesGuard`** solo se registra en controllers con `@Roles(...)`, **después** de `JwtAuthGuard` (para leer `user.rol` del JWT).

**Endpoints con roles (`@Roles`):**

| Endpoint | Roles permitidos |
|----------|------------------|
| `/api/usuarios` (todos) | `admin` |
| `/api/roles` (todos) | `admin` |
| `/api/configuracion` PUT | `admin` |
| `/api/categorias` (todos) | `admin`, `gerente` |
| `/api/almacenes` (todos) | `admin`, `gerente` |
| `/api/dashboard` (todos) | `admin`, `gerente` |

---

## Auth — `/api/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Público | Login con `{email, password}`. Setea cookies httpOnly `accessToken` (15 min) y `refreshToken` (7 días). Devuelve `usuario` + `access_token` |
| POST | `/api/auth/refresh` | Público | Renueva tokens desde cookie `refreshToken` (o body). Rota ambos tokens |
| POST | `/api/auth/logout` | JWT | Invalida `refresh_token_hash` y limpia cookies |
| GET | `/api/auth/me` | JWT | Perfil del usuario autenticado (incluye `avatar_url` y `permisos` overrides) |
| PATCH | `/api/auth/password` | JWT | Cambia contraseña: `{currentPassword, newPassword}` (6–50 chars) |
| PATCH | `/api/auth/profile` | JWT | Actualiza nombre y/o email del usuario actual: `{nombre?, email?}` |
| PATCH | `/api/auth/avatar` | JWT | Actualiza foto de perfil: `{avatar_url}` data URL PNG/JPEG/WebP, máx ~512 KB |
| DELETE | `/api/auth/avatar` | JWT | Elimina foto de perfil |

---

## Usuarios — `/api/usuarios`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/usuarios` | JWT | Lista paginada. Query: `page`, `limit` (def. 50), `search` (nombre/email). Excluye `deleted_at` |
| GET | `/api/usuarios/:id` | JWT | Detalle de usuario |
| GET | `/api/usuarios/:id/permisos` | JWT | Overrides de permisos del usuario (mapa módulo→nivel) |
| PUT | `/api/usuarios/:id/permisos` | JWT | Reemplaza overrides: `{permisos: {modulo: nivel, ...}}` |
| POST | `/api/usuarios` | JWT | Crea: `{nombre, email, password, rol?}` — `rol` = código dinámico (default `vendedor`); debe existir en `/roles` |
| PATCH | `/api/usuarios/:id` | JWT | Edita datos: `{nombre?, email?, password?, rol?, avatar_url?, activo?}` — `avatar_url` data URL o `null` para quitar |
| PATCH | `/api/usuarios/:id/activo` | JWT | Activa/desactiva: `{activo}` — no desactivar self ni el único admin |

**No existe DELETE** — los usuarios no se eliminan (solo se desactivan).

---

## Roles — `/api/roles`

Catálogo dinámico de roles (`admin`/`gerente`/`vendedor` son de sistema, seed) + matriz de permisos por rol.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/roles` | JWT | Lista roles (nombre, código, es_sistema, activo, total_usuarios, total_permisos) |
| GET | `/api/roles/:id` | JWT | Detalle de rol |
| GET | `/api/roles/:id/permisos` | JWT | Matriz 12 módulos → nivel. Admin: siempre `edicion` en todo |
| PUT | `/api/roles/:id/permisos` | JWT | Reemplaza matriz completa `{permisos: {...12 módulos}}`. Admin bloqueado (400) |
| POST | `/api/roles` | JWT | Crea rol custom: `{nombre, codigo}` (slug minúsculas/números/_). Copia defaults vendedor |
| PATCH | `/api/roles/:id` | JWT | Actualiza `{nombre?, activo?, orden?}`. No desactivar admin sistema |
| DELETE | `/api/roles/:id` | JWT | Elimina solo roles no-sistema sin usuarios (400 en caso contrario) |

---

## Productos — `/api/productos`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/productos` | JWT | Lista paginada. Query: `page`, `limit` (def. 50), `search`, `stock_status` (disponible/bajo/agotado), `include` (csv: `precios,categoria,stock`) |
| GET | `/api/productos/:id` | JWT | Detalle con mismos `include` |
| POST | `/api/productos` | JWT | Crea producto: código, categoría, atributos flor, stock, 6 precios (normal/distribuidor × unidad/docena/mayor), `colores_surtido[]` |
| PATCH | `/api/productos/:id` | JWT | Actualiza producto |
| PATCH | `/api/productos/:id/precios` | JWT | Actualiza precios **con auditoría** en `historial_precios` |
| DELETE | `/api/productos/:id` | JWT | Soft delete |
| POST | `/api/productos/upload` | JWT | Sube imagen a MinIO (`multipart/file`, máx 5 MB, JPEG/PNG/WebP) → `{url}` |

---

## Clientes — `/api/clientes`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/clientes` | JWT | Lista paginada. Query: `page`, `limit` (def. 50), `search` |
| GET | `/api/clientes/:id` | JWT | Detalle |
| POST | `/api/clientes` | JWT | Crea: `{nombre, telefono?, email?, ruc_dni?, tipo?, diasCreditoDefecto?, diasGracia?, limiteCredito?, tasaMora?}` |
| PATCH | `/api/clientes/:id` | JWT | Actualiza |
| DELETE | `/api/clientes/:id` | JWT | Soft delete |

---

## Categorías — `/api/categorias`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/categorias` | JWT | Lista paginada (`limit` def. 100) |
| GET | `/api/categorias/:id` | JWT | Detalle |
| POST | `/api/categorias` | JWT | Crea: `{nombre_categoria}` |
| PATCH | `/api/categorias/:id` | JWT | Actualiza nombre |
| DELETE | `/api/categorias/:id` | JWT | Elimina (hard delete) |

---

## Almacenes — `/api/almacenes`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/almacenes` | JWT | Lista. Query: `page`, `limit`, `search`, `activo` |
| GET | `/api/almacenes/:id` | JWT | Detalle |
| POST | `/api/almacenes` | JWT | Crea: `{codigo, nombre, ubicacion?}` |
| PATCH | `/api/almacenes/:id` | JWT | Actualiza |
| DELETE | `/api/almacenes/:id` | JWT | Elimina solo si no tiene stock ni movimientos |

---

## Inventario — `/api/inventario`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/inventario/movimientos` | JWT | Registra movimiento: `{id_producto, id_almacen, tipo, origen, cantidad, costo_unitario?, id_referencia?, tipo_referencia?, observaciones?}` |
| POST | `/api/inventario/transferencia` | JWT | Transferencia entre almacenes: `{id_producto, id_almacen_origen, id_almacen_destino, cantidad}` → `{salida, entrada}` |
| GET | `/api/inventario/kardex/:id_producto` | JWT | Kardex paginado. Query: `id_almacen`, `tipo`, `origen`, `fecha_inicio`, `fecha_fin`, `page`, `limit` |
| GET | `/api/inventario/kardex/:id_producto/export` | JWT | Exporta kardex a CSV (máx 10 000 filas) |
| GET | `/api/inventario/stock` | JWT | Stock actual. Query: `id_producto`, `id_almacen`, `soloBajoMinimo` |
| GET | `/api/inventario/alertas` | JWT | Alertas de stock. Query: `estado` (activa/resuelta) |
| PATCH | `/api/inventario/alertas/:id_alerta/reconocer` | JWT | Marca alerta como reconocida |

---

## Cotizaciones — `/api/cotizaciones`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/cotizaciones` | JWT | Crea con detalle: `{id_cliente, tipo_precio?, observaciones?, incluye_carreta?, costo_carreta?, detalle[], numero?}` — estado inicial `borrador` · valida cada línea (`id_producto>0`, `cantidad>0`, `precio_unitario>=0`) · `incluye_carreta:false` ignora `costo_carreta` |
| GET | `/api/cotizaciones` | JWT | Lista paginada. Query: `page`, `limit` (def. 10, máx. 1000), `estado`, `id_cliente`, `buscar` (número o cliente, case-insensitive), `fecha` (`YYYY-MM-DD`, día local) |
| GET | `/api/cotizaciones/proximo-numero` | JWT | Siguiente correlativo `COT-001` |
| GET | `/api/cotizaciones/:id` | JWT | Detalle con líneas, cliente, usuario y pagos |
| GET | `/api/cotizaciones/:id/export-pdf` | JWT | Exporta PDF (Puppeteer/Chromium, HTML→A4) como attachment · misma vista que la preview del OJO |
| PATCH | `/api/cotizaciones/:id` | JWT | Actualiza solo si estado = `borrador` · si envía `detalle`, valida líneas y recalcula `subtotal`/`total` · `incluye_carreta:true` sin `costo_carreta` conserva el actual |
| PATCH | `/api/cotizaciones/:id/estado` | JWT | Cambia estado con **máquina de transiciones** (400 en saltos inválidos): `borrador→enviada`; `enviada→{borrador, aprobada, parcialmente_pagada, rechazada}`; `parcialmente_pagada→{aprobada, rechazada}`; `aprobada` terminal; `rechazada→borrador`. Pagos cambian estado por su vía (`registrarPago`) |
| POST | `/api/cotizaciones/:id/pagos` | JWT | Registra abono: `{monto, metodo_pago, referencia?}` — valida saldo |
| POST | `/api/cotizaciones/recomendar-item` | JWT | Recomendaciones IA por ítem: `{id_producto_base, id_cliente?, id_almacen?, tipo_precio?}` → Similar/Upsell/Equilibrio |

---

## Cobranza — `/api/cobranza`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/cobranza` | JWT | Lista cotizaciones por cobrar. Query: `page`, `limit`, `estado`, `estado_cobranza` (pendiente/parcial/pagada/vencida), `id_cliente`, `q`, `fecha_vencimiento_inicio/fin`, `solo_vencidas` |
| GET | `/api/cobranza/:id` | JWT | Detalle con historial de pagos |
| POST | `/api/cobranza/:id/pagos` | JWT | Registra abono: `{monto, metodo_pago, referencia?}` |

---

## Dashboard — `/api/dashboard`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/dashboard/kpis` | JWT | `tasaConversion`, `efectividadIA`, `tiempoPromedioCotizacion`, `alertasStockActivas` |
| GET | `/api/dashboard/detalle` | JWT | Contadores por estado, items sugeridos IA, alertas, gráficos 6 meses |

---

## Historial de precios — `/api/historial-precios`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/historial-precios` | JWT | Histórico paginado. Query: `page`, `limit`, `id_producto`, `id_usuario`, `campo_modificado`, `fecha_inicio`, `fecha_fin` |
| GET | `/api/historial-precios/:id` | JWT | Entrada por ID |

---

## IA — `/api/ai`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/ai/suggest-quote` | JWT | Sugerencias para cotización: `{prompt, productIds?}` — llama al microservicio FastAPI (no usado por el frontend actual) |

---

## Configuración — `/api/configuracion`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/configuracion` | JWT | Mapa clave→valor de toda la configuración |
| PUT | `/api/configuracion` | JWT + **solo admin** | Upsert: `{clave, valor, descripcion?}` |

---

## Módulos sin endpoints

- **template** — scaffold DDD vacío, no registrado en `app.module.ts`
- **storage / minio / prisma** — servicios de infra en `src/common`

---

## Configuración global del API

| Aspecto | Valor |
|---------|-------|
| Prefijo | `/api` (sin versión `v1`) |
| Puerto | `PORT` o `3001` |
| CORS | `origin: CLIENT_URL` (`http://localhost:3000`), `credentials: true` |
| Cookies | `cookie-parser` global |
| Validación | `ValidationPipe({transform, whitelist, forbidNonWhitelisted})` — solo aplica a DTOs tipados |
| Filtro errores | `AllExceptionsFilter` → `{success:false, message, errors?}` |
| Guards globales | Ninguno. `RolesGuard` se aplica por controller junto a `JwtAuthGuard` (`@UseGuards(JwtAuthGuard, RolesGuard)`) solo donde hay `@Roles` |
| Docs | Swagger builder + **Scalar** en `GET /reference` (fuera del prefijo `/api`) |
| Rate limit / Helmet | Instalados pero **no usados** |

### Notas

- `modules/auth/auth.controller.ts` (funciones Express) está **huérfano**; el registrado es `adapters/auth.controller.ts`.
- `CotizacionesController` y `RecomendacionesController` comparten prefijo `cotizaciones` sin colisión de rutas.
- Endpoints de cotizaciones usan `@Body() body: any` (sin DTOs), pero el service valida imperativamente: detalle (producto/cantidad/precio), catálogo y máquina de estados, y carreta.

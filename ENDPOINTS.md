# Endpoints — Gold Continent API

> **Base URL:** `http://localhost:3001` · **Prefijo global:** `/api` · **Total:** 56 endpoints en 13 controllers
> **Documentación interactiva (Scalar):** `GET http://localhost:3001/reference`
> **Autenticación:** JWT en cookie httpOnly (`accessToken`) o header `Authorization: Bearer <token>`

Todos los controllers aplican `JwtAuthGuard` a nivel de clase salvo los endpoints públicos de login/refresh. **`RolesGuard`** solo se registra en controllers con `@Roles(...)`, **después** de `JwtAuthGuard` (para leer `user.rol` del JWT).

**Endpoints con roles (`@Roles`):**

| Endpoint | Roles permitidos |
|----------|------------------|
| `/api/usuarios` (todos) | `admin` |
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
| GET | `/api/auth/me` | JWT | Perfil del usuario autenticado |
| PATCH | `/api/auth/password` | JWT | Cambia contraseña: `{currentPassword, newPassword}` (6–50 chars) |

---

## Usuarios — `/api/usuarios`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/usuarios` | JWT | Lista paginada. Query: `page`, `limit` (def. 50), `search` (nombre/email) |
| GET | `/api/usuarios/:id` | JWT | Detalle de usuario |
| POST | `/api/usuarios` | JWT | Crea: `{nombre, email, password, rol?}` — rol default `vendedor` |
| PATCH | `/api/usuarios/:id` | JWT | Activa/desactiva: `{activo}` |
| DELETE | `/api/usuarios/:id` | JWT | Soft delete (`deleted_at`) |

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
| POST | `/api/cotizaciones` | JWT | Crea con detalle: `{id_cliente, tipo_precio?, observaciones?, incluye_carreta?, costo_carreta?, detalle[], numero?}` — estado inicial `borrador` |
| GET | `/api/cotizaciones` | JWT | Lista paginada. Query: `page`, `limit` (def. 10), `estado`, `id_cliente` |
| GET | `/api/cotizaciones/proximo-numero` | JWT | Siguiente correlativo `COT-001` |
| GET | `/api/cotizaciones/:id` | JWT | Detalle con líneas, cliente, usuario y pagos |
| GET | `/api/cotizaciones/:id/export-pdf` | JWT | Exporta PDF (pdfkit, A4) como attachment |
| PATCH | `/api/cotizaciones/:id` | JWT | Actualiza solo si estado = `borrador` |
| PATCH | `/api/cotizaciones/:id/estado` | JWT | Cambia estado: `borrador`, `enviada`, `aprobada`, `parcialmente_pagada`, `rechazada` |
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
- Endpoints de cotizaciones usan `@Body() body: any` → sin validación de DTO.
- No hay `RolesGuard`: cualquier rol autenticado accede a todo.

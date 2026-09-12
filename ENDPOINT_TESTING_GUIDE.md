# ENDPOINT_TESTING_GUIDE.md

Guía completa de pruebas para la API GoldContinent. Todos los endpoints están listos para probarse desde Scalar (Swagger UI) en `http://localhost:3001/reference`.

---

## Autenticación

Todos los endpoints protegidos requieren **Bearer Token** en el header:
```
Authorization: Bearer <access_token>
```

Obtener token: `POST /api/auth/login`

---

## 📦 Módulo: Productos

**Base Path:** `/api/productos`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/productos` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`search` (string, opcional)<br>`include` (string: "precios,categoria", opcional) | - | 200 OK |
| GET | `/productos/{id}` | ✅ Sí | `id` (number, **required**)<br>`include` (string: "precios,categoria", opcional) | - | 200 OK |
| POST | `/productos` | ✅ Sí | - | ```json<br>{<br>  "codigo": "PROD001",<br>  "descripcion": "Producto de prueba",<br>  "foto_url": "https://example.com/foto.jpg",<br>  "activo": true,<br>  "stock_principal": 100,<br>  "stock_tacna": 50,<br>  "stock_minimo": 10,<br>  "unidades_por_caja": 12,<br>  "id_categoria": 1<br>}<br>``` | 201 Created |
| PATCH | `/productos/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "descripcion": "Producto actualizado",<br>  "stock_principal": 120,<br>  "activo": true<br>}<br>```<br>*(Usa PartialType: todos los campos son opcionales. El código no se valida para unicidad si no se envía, evitando conflictos.)* | 200 OK |
| PATCH | `/productos/{id}/precios` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "costo_normal": 10.50,<br>  "precio_unidad_normal": 15.00,<br>  "precio_docena_normal": 160.00,<br>  "precio_mayor_normal": 140.00,<br>  "costo_distribuidor": 9.00,<br>  "precio_unidad_dist": 13.00,<br>  "precio_docena_dist": 140.00,<br>  "precio_mayor_dist": 120.00<br>}<br>```<br>*(Al menos un campo requerido)* | 200 OK |
| DELETE | `/productos/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

---

## 🏪 Módulo: Almacenes

**Base Path:** `/api/almacenes`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/almacenes` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`search` (string, opcional) | - | 200 OK |
| GET | `/almacenes/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| POST | `/almacenes` | ✅ Sí | - | ```json<br>{<br>  "codigo": "ALM001",<br>  "nombre": "Almacén Principal",<br>  "ubicacion": "Av. Principal 123"<br>}<br>``` | 201 Created |
| PATCH | `/almacenes/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "nombre": "Almacén Central",<br>  "ubicacion": "Nueva ubicación",<br>  "activo": true<br>}<br>``` | 200 OK |
| DELETE | `/almacenes/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

---

## 📊 Módulo: Inventario

**Base Path:** `/api/inventario`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| POST | `/inventario/movimientos` | ✅ Sí | - | ```json<br>{<br>  "id_producto": 1,<br>  "id_almacen": 1,<br>  "tipo": "entrada",<br>  "origen": "compra",<br>  "cantidad": 100,<br>  "costo_unitario": 15.50,<br>  "id_referencia": 1,<br>  "tipo_referencia": "compra",<br>  "observaciones": "Compra inicial de stock"<br>}<br>``` | 201 Created |
| POST | `/inventario/transferencia` | ✅ Sí | - | ```json<br>{<br>  "id_producto": 1,<br>  "id_almacen_origen": 1,<br>  "id_almacen_destino": 2,<br>  "cantidad": 50,<br>  "observaciones": "Transferencia entre almacenes"<br>}<br>``` | 201 Created |
| GET | `/inventario/kardex/{id_producto}` | ✅ Sí | `id_producto` (number, **required**)<br>`id_almacen` (number, opcional)<br>`tipo` (enum: entrada/salida/transferencia/ajuste, opcional)<br>`origen` (enum: compra/venta/ajuste/transferencia/cotizacion_aprobada/devolucion, opcional)<br>`fecha_inicio` (ISO date, opcional)<br>`fecha_fin` (ISO date, opcional)<br>`page` (number, default: 1)<br>`limit` (number, default: 100) | - | 200 OK |
| GET | `/inventario/stock` | ✅ Sí | `id_producto` (number, opcional)<br>`id_almacen` (number, opcional)<br>`soloBajoMinimo` (boolean, opcional) | - | 200 OK |

---

## 🤖 Módulo: Cotizaciones - Recomendaciones IA

**Base Path:** `/api/cotizaciones`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| POST | `/cotizaciones/recomendar-item` | ✅ Sí | - | ```json<br>{<br>  "id_producto_base": 1,<br>  "id_cliente": 1,<br>  "id_almacen": 1<br>}<br>``` | 200 OK |

---

## 📋 Módulo: Cotizaciones (Quotes)

**Base Path:** `/api/cotizaciones`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| POST | `/cotizaciones` | ✅ Sí | - | ```json<br>{<br>  "id_cliente": 1,<br>  "tipo_precio": "normal",<br>  "observaciones": "Observaciones de la cotización",<br>  "incluye_carreta": true,<br>  "costo_carreta": 15.00,<br>  "detalle": [<br>    {<br>      "id_producto": 1,<br>      "tipo_venta": "unidad",<br>      "cantidad": 10,<br>      "color_notas": "Color rojo",<br>      "precio_unitario": 15.50,<br>      "es_sugerido_ia": false<br>    }<br>  ]<br>}<br>``` | 201 Created |
| GET | `/cotizaciones` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`estado` (string: borrador/enviada/aprobada/rechazada, opcional)<br>`id_cliente` (number, opcional)<br>`id_usuario` (number, opcional)<br>`fecha_inicio` (ISO date, opcional)<br>`fecha_fin` (ISO date, opcional) | - | 200 OK |
| GET | `/cotizaciones/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| PATCH | `/cotizaciones/{id}/estado` | ✅ Sí | `id` (number, **required**) | **Para estado "enviada" o "rechazada":**<br>```json<br>{<br>  "estado": "enviada"<br>}<br>```<br>**Para estado "aprobada":**<br>```json<br>{<br>  "estado": "aprobada",<br>  "id_almacen": 1,<br>  "tipoPago": "contado",<br>  "diasPlazo": 30<br>}<br>``` | 200 OK |
| POST | `/cotizaciones/{id}/registrar-pago` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "monto": 500.00,<br>  "metodo_pago": "efectivo",<br>  "referencia": "OP-123456"<br>}<br>```<br>*(metodo_pago: efectivo \| transferencia \| tarjeta_credito \| tarjeta_debito \| yape_plin \| mixto \| credito)* | 200 OK |

### Detalle: POST /api/cotizaciones/:id/registrar-pago

Este endpoint permite registrar abonos (pagos parciales o totales) a una cotización.

**Reglas de negocio:**

1. **Estados permitidos:** Solo se pueden registrar pagos en cotizaciones con estado `borrador`, `enviada` o `parcialmente_pagada`. Si la cotización está `aprobada` o `rechazada`, se retorna 409 Conflict.

2. **Validación de monto:** El monto no puede exceder el saldo pendiente (`cotizacion.total - suma de pagos previos`). Se permite una tolerancia de 1 centavo.

3. **Primer pago (reserva de stock):** En el **primer abono** (parcial o total), el sistema descuenta automáticamente `stock_principal` de cada producto en el detalle de la cotización para reservar la mercadería. Se registra un movimiento de inventario tipo `salida` con origen `cotizacion_aprobada`. En abonos subsecuentes **no** se descuenta stock nuevamente.

4. **Actualización de estado:**
   - Si `total_pagado >= cotizacion.total` → estado cambia a `aprobada`
   - Si `total_pagado > 0` y `< cotizacion.total` → estado cambia a `parcialmente_pagada`

**Ejemplo de Request Body:**
```json
{
  "monto": 500.00,
  "metodo_pago": "efectivo",
  "referencia": "OP-123456"
}
```

**Valores válidos para metodo_pago:** `efectivo`, `transferencia`, `tarjeta_credito`, `tarjeta_debito`, `yape_plin`, `mixto`, `credito`

**Ejemplo de Response:**
```json
{
  "cotizacion": {
    "id_cotizacion": 1,
    "numero": "COT-1234567890",
    "estado": "parcialmente_pagada",
    "total": 1000.00,
    "detalle": [...],
    "pagos": [
      { "id_pago": 1, "monto": 500.00, "metodo_pago": "efectivo", "referencia": "OP-123456", "created_at": "2026-09-12T10:00:00.000Z" }
    ]
  },
  "saldo_pendiente": 500.00,
  "pagos": [...]
}
```

---

## 💰 Módulo: Ventas

**Base Path:** `/api/ventas`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/ventas` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`estado` (enum: borrador/emitida/pagada/parcial/anulada, opcional)<br>`tipoPago` (enum: contado/credito, opcional)<br>`id_cliente` (number, opcional)<br>`id_usuario` (number, opcional)<br>`fecha_inicio` (ISO date, opcional)<br>`fecha_fin` (ISO date, opcional) | - | 200 OK |
| GET | `/ventas/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| POST | `/ventas` | ✅ Sí | - | ```json<br>{<br>  "serie": "F001",<br>  "correlativo": 1,<br>  "tipo_documento": "factura",<br>  "id_cliente": 1,<br>  "id_usuario": 1,<br>  "id_almacen": 1,<br>  "subtotal": 1000,<br>  "igv": 180,<br>  "total": 1180,<br>  "descuento_global": 0,<br>  "tipoPago": "contado",<br>  "diasPlazo": null,<br>  "id_cotizacion": 1,<br>  "observaciones": "Venta directa",<br>  "detalles": [<br>    {<br>      "id_producto": 1,<br>      "tipo_venta": "unidad",<br>      "cantidad": 10,<br>      "precio_unitario": 100,<br>      "descuento_item": 0<br>    }<br>  ]<br>}<br>``` | 201 Created |
| PATCH | `/ventas/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "estado": "pagada",<br>  "montoPagado": 1180,<br>  "montoPendiente": 0<br>}<br>``` | 200 OK |
| DELETE | `/ventas/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

---

## 👥 Módulo: Clientes

**Base Path:** `/api/clientes`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/clientes` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`search` (string, opcional) | - | 200 OK |
| GET | `/clientes/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| POST | `/clientes` | ✅ Sí | - | ```json<br>{<br>  "nombre": "Cliente Ejemplo",<br>  "telefono": "999888777",<br>  "email": "cliente@ejemplo.com",<br>  "ruc_dni": "12345678901",<br>  "tipo": "normal",<br>  "diasCreditoDefecto": 30,<br>  "diasGracia": 5,<br>  "limiteCredito": 10000,<br>  "tasaMora": 1.5<br>}<br>``` | 201 Created |
| PATCH | `/clientes/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "nombre": "Cliente Actualizado",<br>  "telefono": "999888777",<br>  "limiteCredito": 15000<br>}<br>``` | 200 OK |
| DELETE | `/clientes/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

---

## 🏷️ Módulo: Categorías

**Base Path:** `/api/categorias`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/categorias` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 100) | - | 200 OK |
| GET | `/categorias/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| POST | `/categorias` | ✅ Sí | - | ```json<br>{<br>  "nombre_categoria": "Electrónicos"<br>}<br>``` | 201 Created |
| PATCH | `/categorias/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "nombre_categoria": "Tecnología"<br>}<br>``` | 200 OK |
| DELETE | `/categorias/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

## 💳 Módulo: Cobranza

**Base Path:** `/api/cobranza`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/cobranza` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`estado` (enum: pendiente/parcial/pagada/vencida/anulada, opcional)<br>`id_cliente` (number, opcional)<br>`fecha_vencimiento_inicio` (ISO date, opcional)<br>`fecha_vencimiento_fin` (ISO date, opcional)<br>`solo_vencidas` (boolean, opcional) | - | 200 OK |
| GET | `/cobranza/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| PATCH | `/cobranza/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "estado": "parcial",<br>  "montoPendiente": 500,<br>  "moraAcumulada": 10,<br>  "diasAtraso": 5<br>}<br>``` | 200 OK |

---

## 📈 Módulo: Historial de Precios

**Base Path:** `/api/historial-precios`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/historial-precios` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`id_producto` (number, opcional)<br>`id_usuario` (number, opcional)<br>`campo_modificado` (string, opcional)<br>`fecha_inicio` (ISO date, opcional)<br>`fecha_fin` (ISO date, opcional) | - | 200 OK |
| GET | `/historial-precios/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

---

## 👤 Módulo: Usuarios

**Base Path:** `/api/usuarios`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/usuarios` | ✅ Sí | `page` (number, default: 1)<br>`limit` (number, default: 50)<br>`search` (string, opcional) | - | 200 OK |
| GET | `/usuarios/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |
| PATCH | `/usuarios/{id}` | ✅ Sí | `id` (number, **required**) | ```json<br>{<br>  "activo": false<br>}<br>``` | 200 OK |
| POST | `/usuarios` | ✅ Sí | - | ```json<br>{<br>  "nombre": "Juan Pérez",<br>  "email": "juan@ejemplo.com",<br>  "password": "password123",<br>  "rol": "vendedor"<br>}<br>``` | 201 Created |
| DELETE | `/usuarios/{id}` | ✅ Sí | `id` (number, **required**) | - | 200 OK |

---

## 🔐 Módulo: Autenticación (Auth)

**Base Path:** `/api/auth`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| POST | `/auth/login` | ❌ No | - | ```json<br>{<br>  "email": "admin@goldcontinent.com",<br>  "password": "admin123"<br>}<br>``` | 201 Created |
| POST | `/auth/refresh` | ❌ No | - | ```json<br>{<br>  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."<br>}<br>```<br>*(O se envía via cookie)* | 200 OK |
| POST | `/auth/logout` | ✅ Sí | - | - | 200 OK |
| GET | `/auth/me` | ✅ Sí | - | - | 200 OK |
| PATCH | `/auth/password` | ✅ Sí | - | ```json<br>{<br>  "currentPassword": "currentPassword123",<br>  "newPassword": "newPassword123"<br>}<br>``` | 200 OK |

---

## 🤖 Módulo: AI Service

**Base Path:** `/api/ai`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| POST | `/ai/suggest-quote` | ✅ Sí | - | ```json<br>{<br>  "prompt": "Cliente solicita cotización para 10 docenas de cuadernos y 5 calculadoras científicas",<br>  "productIds": [1, 5, 23]<br>}<br>``` | 200 OK |

---

## 📊 Módulo: Dashboard

**Base Path:** `/api/dashboard`

| Método | Ruta | Auth | Path/Query Params | Request Body | Respuesta |
|--------|------|------|-------------------|--------------|-----------|
| GET | `/dashboard/kpis` | ✅ Sí | - | - | 200 OK |
| GET | `/dashboard/detalle` | ✅ Sí | - | - | 200 OK |

---

## 🔧 Notas Importantes para Pruebas en Scalar

1. **Autenticación:** Primero ejecuta `POST /api/auth/login` para obtener el `access_token`. Luego usa el botón "Authorize" en Scalar e ingresa `Bearer <token>`.

2. **IDs de prueba:** Usa IDs existentes en tu base de datos. Si la BD está vacía, crea primero categorías, almacenes, productos y clientes.

3. **Fechas:** Usa formato ISO 8601: `2026-09-12T00:00:00.000Z`

4. **Enums:**
   - `TipoVenta`: `unidad`, `docena`, `mayor`
   - `TipoPrecio`: `normal`, `distribuidor`
   - `TipoDocumento`: `factura`, `boleta`, `nota_credito`, `nota_debito`
   - `EstadoVenta`: `borrador`, `emitida`, `pagada`, `parcial`, `anulada`
   - `TipoPago`: `contado`, `credito`
   - `MetodoPago`: `efectivo`, `transferencia`, `tarjeta_credito`, `tarjeta_debito`, `yape_plin`, `mixto`, `credito`
   - `TipoMovimientoInventario`: `entrada`, `salida`, `transferencia`, `ajuste`
   - `OrigenMovimiento`: `compra`, `venta`, `ajuste`, `transferencia`, `cotizacion_aprobada`, `devolucion`
   - `EstadoCotizacion`: `borrador`, `enviada`, `parcialmente_pagada`, `aprobada`, `rechazada`
   - `EstadoCuentaCobrar`: `pendiente`, `parcial`, `pagada`, `vencida`, `anulada`
   - `Rol`: `admin`, `vendedor`, `almacenero`

5. **Validaciones automáticas:** Los DTOs tienen validaciones (class-validator) que Scalar respeta. Si envías datos inválidos, recibirás 400 Bad Request con detalles.

6. **Soft Delete:** Los endpoints DELETE marcan registros como eliminados (`deleted_at`) en lugar de borrarlos físicamente.

---

## ✅ Checklist de Pruebas Rápidas

- [ ] Login exitoso y obtención de token
- [ ] CRUD completo de Categorías
- [ ] CRUD completo de Almacenes
- [ ] CRUD completo de Productos (incluyendo actualización de precios con auditoría)
- [ ] CRUD completo de Clientes
- [ ] Registro de movimiento de inventario (entrada/salida)
- [ ] Transferencia entre almacenes
- [ ] Consulta de kardex y stock
- [ ] Crear cotización en borrador
- [ ] Cambiar estado cotización: borrador → enviada → aprobada (con stock)
- [ ] Registrar abono a cotización: borrador → parcialmente_pagada → aprobada (verificar descuento de stock en primer pago)
- [ ] Verificar generación de venta al aprobar cotización
- [ ] Consultar cobranza y actualizar estado
- [ ] Ver historial de precios
- [ ] Obtener recomendaciones IA
- [ ] Consultar KPIs del dashboard
- [ ] Probar refresh token y logout

---
*Generado automáticamente - GoldContinent API v1.0*
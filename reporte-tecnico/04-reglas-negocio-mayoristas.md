# Apartado 4 — Reglas de Negocio y Funcionalidades Mayoristas (Venta por Cajas)

**Proyecto:** Sistema de Información Web para Incrementar la Eficiencia de la Gestión de Cotizaciones en Importaciones y Exportaciones Gold Continent EIRL

**Archivos de referencia:**
- Backend: `apps/api/src/modules/cotizaciones/cotizaciones.service.ts`, `dto/create-cotizacion.dto.ts`, `dto/create-cotizacion-detalle.dto.ts`
- Reglas compartidas: `packages/shared/src/constants/pricing.ts`, `packages/shared/src/constants/descripcion.ts`
- Frontend: `apps/web/src/features/cotizaciones/hooks/useCotizacionForm.ts`, `components/AgregarProductoModal.tsx`, `components/cotizacion-form/CarritoPanel.tsx`, `crear/resumen/page.tsx`
- Inventario: `apps/web/src/features/inventario/components/producto-form/PriceMatrix.tsx`, `ProductoModal.tsx`

---

## 4.1 Modelo de precios: 6 columnas (2 regímenes × 3 modalidades)

Cada producto tiene **seis precios** en `precios_actuales`, con jerarquía obligatoria garantizada por la migración `20261014000400_pricing_hierarchy` (`unidad ≥ docena ≥ mayor`):

| | Unidad | Docena | Mayor (etiquetada "Caja" en inventario) |
|---|---|---|---|
| **Tienda (`normal`)** | `precio_unidad_normal` | `precio_docena_normal` | `precio_mayor_normal` |
| **Distribuidor** | `precio_unidad_dist` | `precio_docena_dist` | `precio_mayor_dist` |

Costos asociados: `costo_normal` y `costo_distribuidor`.

### Mapeo canónico (paquete `shared`)

```ts
// packages/shared/src/constants/pricing.ts:18-27
export function campoPrecio(tipoPrecio: TipoPrecio, tipoVenta: TipoVenta): string {
  const sufijo = tipoPrecio === TipoPrecio.distribuidor ? 'dist' : 'normal';
  switch (tipoVenta) {
    case TipoVenta.docena: return `precio_docena_${sufijo}`;
    case TipoVenta.mayor:  return `precio_mayor_${sufijo}`;
    default:               return `precio_unidad_${sufijo}`;
  }
}
```

```ts
// packages/shared/src/constants/descripcion.ts:84-107
export function resolverEsquemaPrecio(tipoPrecio, tipoVenta): PrecioEsquema {
  if (!precio || !venta) return 'precio_unidad_normal';   // fallback
  const esquema = campoPrecio(..., normalizarTipoVenta(venta));
  return PRECIO_ESQUEMAS.includes(esquema) ? esquema : 'precio_unidad_normal';
}

function normalizarTipoVenta(tipo: string): TipoVenta {
  if (tipo === 'docena') return TipoVenta.docena;
  if (tipo === 'mayor' || tipo === 'caja') return TipoVenta.mayor;  // 'caja' ≡ 'mayor'
  return TipoVenta.unidad;
}
```

---

## 4.2 ¿Cómo se calculan los precios según tipo de cliente y modalidad?

### 4.2.1 El cálculo ocurre en el FRONTEND

**Paso 1 — Régimen del cliente (Tienda/Distribuidor)**
`InformacionGeneral.tsx:63‑67` presenta el selector; el estado se mantiene en `useCotizacionForm.ts:85` con default **`DISTRIBUIDOR`** (`:29`, `:128`) y se envía como:

```ts
// crear/resumen/page.tsx:137  y  api/autosave.ts:144
tipo_precio: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal'
```

**Paso 2 — Selección del producto y modalidad**
`AgregarProductoModal.tsx`:

```ts
// :95-101 — extrae la matriz de 6 precios y selecciona el régimen
const { tienda, distribuidor } = useMemo(() => obtenerPreciosEstandarizados(producto), [producto]);
const esTienda = String(tipoPrecioCliente).toUpperCase() === 'TIENDA';
const preciosPorCliente = esTienda ? tienda : distribuidor;

// :119 — precio inicial = precio "mayor" del régimen elegido
const precioInicial = esTienda ? tienda.mayor : distribuidor.mayor;

// :150-155 — CAMBIAR DE MODALIDAD REEMPLAZA EL PRECIO
const handleTipoVentaChange = (nuevoTipo) => {
  setTipoVenta(nuevoTipo);
  if (nuevoTipo === 'UNIDAD') setPrecioInput(Number(preciosPorCliente.unidad || 0).toFixed(2));
  if (nuevoTipo === 'DOCENA') setPrecioInput(Number(preciosPorCliente.docena || 0).toFixed(2));
  if (nuevoTipo === 'MAYOR')  setPrecioInput(Number(preciosPorCliente.mayor  || 0).toFixed(2));
};
```

Selector de modalidad (`:300‑312`) — **no existe opción "Caja"**:

```tsx
options={[
  { label: 'Seleccionar', value: '' },
  { label: 'Unidad',   value: 'UNIDAD' },
  { label: 'Docena',   value: 'DOCENA' },
  { label: 'Por Mayor', value: 'MAYOR' },
]}
```

- El precio **es editable a mano** por la asesora (sin candado ni validación contra la BD).
- `subtotal ítem = precio × cantidad` (`:130`).
- El modal también muestra una tarjeta "PRECIO TIENDA / PRECIO DISTRIBUIDOR" con las 3 escalas (`:343‑379`).

**Paso 3 — Carrito y totales en UI**

```ts
// types/cotizacion.ts:28-30
export function getItemTotal(item: ProductoCarrito): number {
  return item.precioUnitario * item.cantidad;
}

// useCotizacionForm.ts:396-398
const subtotal = useMemo(() => items.reduce((acc, item) => acc + getItemTotal(item), 0), [items]);
const costoCarreta = incluyeCarreta ? 15.00 : 0.00;
const total = subtotal + costoCarreta;   // ⚠ NO suma IGV
```

**Paso 4 — Persistencia**

```ts
// crear/resumen/page.tsx:100-115 (construirDetalle)
tipo_venta: String(it.tipo_venta || 'MAYOR').toLowerCase(),
precio_unitario: Number(it.precioUnitario),
// payload :135-143 → { tipo_precio, incluye_carreta, costo_carreta, detalle[] }
```

**Paso 5 — Cálculo del servidor** (`cotizaciones.service.ts`)

```ts
// :14
private readonly IGV_RATE = 0.18;

// :19-23
private calcularTotales(subtotal: number, incluyeCarreta: boolean, costoCarreta: number) {
    const igv = Math.round(subtotal * this.IGV_RATE * 100) / 100;
    const total = subtotal + igv + (incluyeCarreta ? costoCarreta : 0);
    return { subtotal, igv, total };
}

// :44-51 — única validación de líneas
const detalleInvalido = !detalle.every((it) =>
    Number(it.id_producto) > 0 && Number(it.cantidad) > 0 && Number(it.precio_unitario) >= 0,
);

// :56-61
const subtotal = detalle.reduce((acc, item) => acc + Number(item.cantidad) * Number(item.precio_unitario), 0);
const carreta = incluye_carreta ? Number(costo_carreta) : 0;
const { igv, total } = this.calcularTotales(subtotal, incluye_carreta, carreta);

// :82-90 — el precio_unitario llega tal cual desde el frontend
create: detalle.map((item) => ({
    id_producto: Number(item.id_producto),
    tipo_venta: item.tipo_venta as any,          // cast al enum Prisma
    cantidad: Number(item.cantidad),
    precio_unitario: Number(item.precio_unitario),
    subtotal: Number(item.cantidad) * Number(item.precio_unitario),
    es_sugerido_ia: Boolean(item.es_sugerido_ia),
}))
```

### 4.2.2 Regla de negocio resumida

1. **Régimen** (`tipo_precio`): lo fija el asesor al crear la cotización y/o el tipo del `cliente` (`normal` = Tienda, `distribuidor`).
2. **Modalidad** (`tipo_venta` por línea): `unidad | docena | mayor` — decide **qué columna de precio** se propone.
3. El servidor **NO recalcula ni valida el precio** contra `precios_actuales`: solo exige `precio_unitario ≥ 0` y calcula `subtotal = Σ cantidad × precio`, `IGV = round(subtotal × 0,18, 2)`, `total = subtotal + IGV + (incluye_carreta ? 15 : 0)`.
4. `tipo_precio` y `tipo_venta` se persisten como **etiquetas de régimen/auditoría**; la única resolución server-side de esquema es para las recomendaciones IA.

### 4.2.3 Inconsistencia detectada: IGV

| Capa | Fórmula |
|---|---|
| UI (`useCotizacionForm.ts:398`, `crear/resumen/page.tsx:266`) | `total = subtotal + carreta` (**sin IGV**) |
| Backend (`cotizaciones.service.ts:19‑23`) | `total = subtotal + IGV 18 % + carreta` |
| PDF (`cotizaciones-pdf.service.ts:764‑781`, `:385`) | Imprime `cot.total` (con IGV), desglosa solo Subtotal + Carreta y declara *"Precios expresados en Soles (PEN) e incluyen IGV"* |

### 4.2.4 Bug de rehidratación al editar

```ts
// CotizacionEditarLoader.tsx:51-52
const tipoPrecio =
  String(cot.tipo_precio || '').toLowerCase() === 'tienda' ? 'TIENDA' : 'DISTRIBUIDOR';
```
La BD guarda `'normal' | 'distribuidor'` (nunca `'tienda'`), por lo que al editar una cotización **Tienda** se rehidrata como **DISTRIBUIDOR** y, al guardar, cambia de régimen de precios.

---

## 4.3 Soporte para la venta por CAJAS con unidades variables

### 4.3.1 Respuesta corta

**No existe soporte real de venta por cajas.** `unidades_por_caja` es únicamente **metadato de empaque**; el sistema cotiza siempre en **unidades físicas**.

### 4.3.2 Evidencia en el código

1. **El enum de cotizaciones no tiene `caja`:**
```prisma
// schema.prisma:380-384
enum TipoVenta { unidad, docena, mayor }
```
   Mismo valor en `packages/shared/src/constants/enums.ts:28` y en `create-cotizacion-detalle.dto.ts:22‑24`.

2. **En inventario, "caja" es sinónimo de "mayor":**
```tsx
// PriceMatrix.tsx:8, 22-25
export type PriceUnit = 'unidad' | 'docena' | 'caja';
const ROWS = [{ unit: 'unidad', label: 'Unidad' },
              { unit: 'docena', label: 'Docena' },
              { unit: 'caja',   label: 'Mayor' }];
```
```ts
// ProductoModal.tsx:191,194
precio_tienda_caja: Number(tienda.mayor),
precio_distribuidor_caja: Number(distribuidor.mayor),
```
```ts
// apps/api/src/modules/productos/productos.service.ts:402-406 y 566-569
precio_mayor_normal: Number(data.precio_tienda_caja),
precio_mayor_dist:   Number(data.precio_distribuidor_caja),
```

3. **Nunca se multiplica `cantidad × unidades_por_caja`.** Los únicos usos del campo en todo `apps/`:
   - texto descriptivo en la descripción generada: `(CAJA X 12 UNID)` (`descripcion.ts:61‑62`);
   - **chip informativo** en la tarjeta de recomendaciones:
     ```ts
     // RecomendacionesPanel.tsx:485
     const empaque = item.unidades_por_caja ?? catalogoItem?.unidades_por_caja
                     ?? catalogoItem?.presentacion ?? null;
     ```
   - arrastre como metadato al carrito (`useCotizacionForm.ts:348`);
   - edición de producto / seed / importación de catálogo.

4. **`cotizacion_detalle` no tiene campos de cajas** y el stock se reserva **en unidades** al aprobar la cotización (`cotizaciones.service.ts:390‑418`).

5. El helper que *podría* implementar la regla **está definido pero nunca se invoca** (huérfano):
```ts
// packages/shared/src/constants/pricing.ts:34-38
export function determinarTipoVenta(cantidad: number, unidadesPorCaja: number): TipoVenta {
  if (cantidad <= 11) return TipoVenta.unidad;
  if (cantidad < unidadesPorCaja) return TipoVenta.docena;
  return TipoVenta.mayor;
}
```

### 4.3.3 Flujo operativo actual para una venta mayorista por cajas

1. La asesora busca el producto y abre `AgregarProductoModal`.
2. Selecciona **"Por Mayor"** → se precarga `precio_mayor_*` del régimen del cliente.
3. Técnea la **cantidad total en unidades** (ej. 120 unidades de un producto con `unidades_por_caja = 12` = 10 cajas, calculado manualmente).
4. El subtotal se obtiene `precio_mayor × cantidad` y el carrito no muestra empaque ni cajas.
5. El PDF solo imprime `precio_unitario`, `cantidad` y `subtotal` (`cotizaciones-pdf.service.ts:330‑364`); **no muestra `tipo_venta` ni cajas**.

### 4.3.4 Qué se requeriría para un modelo real de cajas

| Necesidad | Dónde |
|---|---|
| Añadir `caja` al enum `TipoVenta` (o columna `cajas` + `unidades_totales` en `cotizacion_detalle`) | `schema.prisma` + migración + DTOs |
| Conversión automática `cajas ↔ unidades` usando `productos.unidades_por_caja` | `AgregarProductoModal` / `useCotizacionForm` / backend |
| Activar `determinarTipoVenta(cantidad, unidadesPorCaja)` o eliminarlo | `packages/shared/src/constants/pricing.ts` |
| Reserva de stock en unidades equivalentes (cajas × unidades_por_caja) | `cotizaciones.service.reservarStockCotizacion` |
| Columna de empaque en carrito, resumen y PDF | `CarritoPanel`, `ResumenCotizacionCard`, `cotizaciones-pdf.service.ts` |

---

## 4.4 Otras reglas de negocio relacionadas con cotizaciones

| Regla | Ubicación |
|---|---|
| Numeración secuencial `COT-001` | `cotizaciones.service.ts:217‑227` (`generarNumeroSecuencial`, `proximoNumero`) |
| Edición permitida **solo en `borrador`** | `cotizaciones.service.ts:234` |
| Carreta (flete): `incluye_carreta` default `true`, `costo_carreta` default `15.00` | `schema.prisma:191‑192` |
| Reserva de stock al aprobar / liberación al rechazar | `reservarStockCotizacion` `:390‑418`, `liberarReservasCotizacion` `:432` |
| Conversión a venta (`convertida_a_venta`) y tipos de movimiento | `confirmarVentaCotizacion` `:420` |
| Pagos con idempotencia (`clave_idempotencia`) | `registrarPago` `:460`, `cotizacion_pagos` |
| Permisos por módulo (`cotizaciones`, `pdf`, `recomendaciones`) | `@Permission(...)` en los controladores |
| Alcance de datos por rol (vendedor ve lo suyo) | `alcanceDeDatos(req.user)` en `cotizaciones.controller.ts` |
| Recomendaciones IA marcadas `es_sugerido_ia` | `create-cotizacion-detalle.dto.ts:47` |

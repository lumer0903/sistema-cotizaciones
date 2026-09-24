# Componentes — Frontend (apps/web)

> Inventario de componentes UI, layouts, páginas (App Router), features, hooks y stores.

---

## Paleta de colores (fuente única)

**Archivo:** `apps/web/src/styles/tailwind.css` → bloque `@theme` + `:root`

| Token | Hex | Uso |
|-------|-----|-----|
| `brand-primary` / `primary-500` | `#F8B602` | Principal, botones, acentos |
| `brand-hover` / `primary-600` | `#E0A300` | Hover sólido |
| `brand-soft` / `brand-selection` / `primary-100` | `#FFF2D6` | Selección / highlight / filas activas |
| `brand-subtitle` | `#414141` | Texto secundario / subtítulos |
| `brand-options` | `#8E8E8E` | Neutro, bordes, opciones inactivas |
| `brand-modalFocus` | `#C9A962` | Focus ring en modo modal |
| `tienda` (+ soft/hover) | `#1F41AF` | Badge/chip tipo Tienda |
| `distribuidor` (+ soft/hover) | `#9D3A19` | Badge/chip tipo Distribuidor |
| `estado-borrador` | `#E4E4E4` | Badge Borrador |
| `estado-aprobado` | `#0DC300` | Badge Aprobado |
| `estado-rechazado` | `#7B1C1C` | Badge Rechazado |
| `estado-enviado` | `#1F41AF` | Badge Enviado |
| `danger` / `danger-hover` | `#7B1C1C` / `#5F1515` | Solo acciones destructivas |

Uso en clases: `bg-brand-primary`, `text-brand-subtitle`, `border-tienda`, `bg-estado-aprobado-soft`, etc.  
Uso en JS/inline: `var(--color-brand-primary)` (misma fuente).

**Cambio global:** editar un hex en `@theme`/`:root` de `tailwind.css` propaga a todo el sistema.

Helpers: `ESTADO_BADGE`, `TIPO_CLIENTE_BADGE` exportados desde `@/components/ui` (mapean estado/tipo → variante `Badge`; Admin y Vendedor deben usarlos).

---

## Componentes UI (`src/components/ui/`)

| Componente | Propósito |
|------------|-----------|
| `Button` | Variantes `primary/secondary/outline/ghost/yellowOutline/danger`, tamaños `xs–lg`, estado `loading`; colores vía tokens (`brand-*`, `danger`) |
| `Input` | Input con `label`, `error`, `icon`; variantes `default/modal`; borde/focus por `var(--color-brand-*)`; `forwardRef` RHF |
| `Select` | Dropdown custom con `options`, `label`, `error`, `icon`; tokens en línea; `<select>` oculto para RHF |
| `Textarea` | Textarea con label/error/icon; tokens (sin hexes) |
| `Modal` | Modal accesible (`role=dialog`), overlay, cierre por clic fuera, bloquea scroll, `maxWidth sm–xl`, slot `headerExtra` |
| `ConfirmModal` | Confirmación destructiva sobre `Modal` + `Button danger`; props `message/confirmLabel/loading/onConfirm`; reemplaza `confirm()` nativo |
| `Badge` | Variantes de estado/tipo: `brand/success/warning/danger/neutral/secondary` + `borrador/aprobado/rechazado/enviado` + `tienda/distribuidor`; tamaños `sm/md` |
| `Table` | Primitivas unificadas: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. Wrapper `rounded-xl border border-gray-100 shadow-sm overflow-x-auto bg-white`; `th` `py-3.5 px-4 text-xs font-semibold text-gray-600`; `tr` `hover:bg-brand-soft` (`#FFF2D6`); `td` `py-3 px-4`. **Todas las tablas del sistema** usan este componente |
| `FilterCard` | Contenedor de filtros (`border-l-brand-primary`) |
| `Pagination` | Opciones `[8, 16, 24, 32, 48, 64]`, default `8` (normaliza a `8` si el `limit` no matchea), línea `Mostrar [Select] registros por página`, botón de página activo `bg-brand-primary` |
| `Tooltip` | Tooltip vía `createPortal`, posiciones `top/bottom/left/right`, con delay |
| `Sidebar` | Sidebar admin; **logout real** vía `useAuth().logout()` (accent danger) |
| `index.ts` | Barrel + `ESTADO_BADGE` + `TIPO_CLIENTE_BADGE` |

---

## Componentes compartidos (`src/components/shared/`)

| Componente | Propósito |
|------------|-----------|
| `ProtectedRoute` | Guard client-side: verifica usuario del contexto, `roles[]` y `permission` vía `usePermissions().can`; redirige a `/login` o home del rol; spinner mientras carga |

> `SearchFilterBar` eliminado (sin uso).

---

## Layouts (`src/components/layouts/`)

| Componente | Propósito |
|------------|-----------|
| `AdminLayout` | Shell admin: `Sidebar`, navbar con título por ruta, campana de alertas de stock (polling 60 s → `/inventario/alertas`), `AlertasStockTable`, acceso a configuración |
| `VendedorLayout` | Shell vendedor: sidebar responsive con overlay mobile, nav filtrada por permisos (`Catálogo`, `Mis Cotizaciones`), header con nombre/rol/iniciales, logout |

---

## Páginas (App Router — `src/app/`)

```
app/
├── layout.tsx                  # Root: font DM Sans, metadata "Gold Continent", <Providers>
├── providers.tsx               # AuthProvider + <Toaster> sonner
│
├── (auth)/
│   ├── layout.tsx
│   └── login/page.tsx          # Login (RHF + zod + lucide + sonner)
│
├── admin/                      # Protegido: roles [admin, gerente] + permission dashboard
│   ├── layout.tsx
│   ├── dashboard/page.tsx      # KPIs (iconos Package, Users, FileText…)
│   ├── inventario/page.tsx     # Gestión de inventario (feature)
│   ├── productos/
│   │   ├── page.tsx            # Redirect → /admin/inventario
│   │   └── crear/page.tsx      # Redirect → /admin/inventario
│   ├── precios/page.tsx        # Consulta precios + historial
│   ├── cotizaciones/
│   │   ├── page.tsx            # Listado "Mis Cotizaciones"
│   │   ├── crear/page.tsx      # Flujo crear
│   │   ├── crear/resumen/page.tsx   # Resumen/guardado/PDF
│   │   ├── editar/[id]/page.tsx     # Edición (reutiliza flujo crear)
│   │   └── detalle/[id]/page.tsx    # Detalle
│   ├── cobranza/
│   │   ├── page.tsx            # Listado (filtros, pagos)
│   │   └── [id]/page.tsx       # Detalle cobranza
│   ├── reportes/page.tsx       # Reportes reales: KPIs, estados, cotizado vs vendido, alertas (GET /dashboard/detalle)
│   ├── usuarios/page.tsx       # Gestión usuarios (feature usuarios/api)
│   └── configuracion/page.tsx  # Tabs con carga/guardado real vía /api/configuracion
│
└── vendedor/                   # Protegido: roles [vendedor] + permission cotizaciones
    ├── layout.tsx
    ├── cotizaciones/
    │   ├── page.tsx            # Listado del vendedor
    │   └── crear/page.tsx      # Crear cotización
    └── catalogo/page.tsx       # Catálogo grid/lista con filtros
```

No existe `app/page.tsx` — el middleware redirige `/`.

---

## Features (`src/features/`)

### cotizaciones (activa — principal)

| Pieza | Contenido |
|-------|-----------|
| `api/cotizacionApi.ts` | 415 líneas: CRUD cotizaciones, estados, PDF, clientes, próximo número, cobranza (listado/detalle/pagos), recomendaciones IA |
| `components/` | `CotizacionesTable` (usa `Table*`), `AgregarProductoModal`, `ClienteAutocomplete`, `RecomendacionesPanel`, `index` (`CardRecomendacion` eliminado — sin uso) |
| `store/useCrearCotizacionStore.ts` | Zustand + `persist` (`crear-cotizacion-draft`): cliente, items, tipo precio, carreta, `editandoId`, acciones del carrito |
| `types/cotizacion.ts` | Tipos de la feature |

### inventario (activa — ✅ 100%)

| Pieza | Contenido |
|-------|-----------|
| `api/inventario.api.ts` | Productos, movimientos, transferencias, kardex+CSV, stock, alertas |
| `components/` (10) | `InventarioTable` (usa `Table*`), `InventarioFilters`, `ProductoModal`, `MovimientoModal`, `TransferenciaModal`, `KardexModal`, `DetalleProductoModal` (Ficha Técnica), `AlertasStockTable`, `ColorTags`, `ColorConfigModal`, `index` (eliminados sin uso: `InventarioRow`, `InventarioPagination`, `HomeInventario`) |
| `ColorConfigModal` | Gestión de colores de surtido: `COLOR_MAP` ampliado + `resolveColorHex(name)` (exacto → aliases → fallback); chips con círculo HEX real (borde `gray-200` en blancos); lista vacía en producto nuevo; Guardar dinámico (`secondary`+`disabled` si 0 colores, `primary` `#F8B602` si ≥1); reset de UI al abrir |
| `ColorTags` | Chips de colores con círculo `resolveColorHex` + `border-gray-200` (BLANCO visible); usado en Ficha Técnica (`DetalleProductoModal`) |
| `ProductoModal` | `colores_surtido: []` por defecto (nuevo/reset); editar conserva colores; `initialColorsForModal` usa `resolveColorHex` |
| `hooks/` | *(eliminados sin uso: `useInventario`, `useInventarioModals`; la page usa `useState` + `apiClient`)* |
| `types/inventario.types.ts` | Tipos |

### precio-historial (activa — ✅ 100%)

| Pieza | Contenido |
|-------|-----------|
| `api/precioApi.ts` | Consulta precios reales + `/historial-precios` (sin mocks) |
| `components/` | `PriceCard`, `HistorialPrecioModal` (usa `Table*` con scroll `max-h-96`; `Pagination` local eliminado — se usa `@/components/ui`) |
| `types/precio.ts` | Tipos |

### Features activas

| Feature | Contenido |
|---------|-----------|
| `configuracion/` | `api/configApi.ts` — GET/PUT `/api/configuracion` |
| `usuarios/` | `api/usuariosApi.ts` — listado, crear, toggle activo, delete |

### Placeholders eliminados

`auth/`, `ventas/`, `dashboard/` — carpetas vacías eliminadas o sin scaffold.

---

## Hooks y lib (`src/hooks`, `src/lib`)

| Archivo | Propósito |
|---------|-----------|
| `hooks/usePermissions.ts` | `can(modulo, nivel)`, `isAdmin/isGerente/isVendedor`, `usuario` — usa RBAC de `@goldcontinent/shared` |
| `lib/authProvider.tsx` | Contexto de sesión: mount → `GET /auth/me` si hay cookie `userRole`; `login`, `logout`, `refresh` |
| `lib/apiClient.ts` | **Cliente API único**: token cookie/localStorage, refresh en 401 + reintento, redirect a login si falla; `uploadFile()` |
| `lib/toast.ts` | Wrapper sonner: `success/error/info/warning/promise` |
| `lib/formatters.ts` | Formateadores (fechas, moneda, etc.) |
| `lib/imageUtils.ts` | Utilidades de imagen |

---

## RBAC del frontend (matriz resumida)

| Módulo | admin | gerente | vendedor |
|--------|-------|---------|----------|
| dashboard, productos, consulta_precios, reportes | edicion | edicion* | lectura |
| cotizaciones, ventas, recomendaciones, pdf | edicion | edicion | edicion |
| importacion, usuarios, cobranza | edicion | edicion | sin_acceso |
| configuracion | edicion | **lectura** | sin_acceso |

\* gerente: todo `edicion` salvo `configuracion: lectura`.

---

## Uso confirmado de librerías UI

| Tech | Estado | Uso |
|------|--------|-----|
| Tailwind v4 | ✅ | `@import "tailwindcss"` + `@theme` en `styles/tailwind.css`; clases por todo el código |
| react-hook-form | ✅ | login, `MovimientoModal`, `ProductoModal`, `TransferenciaModal` |
| zod + resolvers | ✅ | `loginSchema`, `MovimientoSchema`, `TransferenciaSchema`, `CrearProductoSchema` |
| sonner | ✅ | `<Toaster>` en providers; wrapper `lib/toast.ts` |
| lucide-react | ✅ | 39 archivos |
| zustand | ✅ | `useCrearCotizacionStore` con persist |

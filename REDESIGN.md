# REDESIGN — Gold Continent ERP

Rediseño integral de UI/UX + refactorización del frontend (`apps/web`: Next.js 16, React 19, Tailwind v4).
Plan ejecutado en 4 fases (A → D). Verificación final: **typecheck ✓ · lint ✓ · tests 22/22 ✓ · build ✓**.

---

## Fase A — Fundamentos de diseño

**`apps/web/src/styles/tailwind.css`** es ahora la fuente única de tokens:

| Grupo | Tokens |
|---|---|
| Marca | `--color-brand-primary #F8B602`, `--color-brand-selection #FFF5D6`, `--color-brand-subtitle #414141`, `--color-brand-options #8E8E8E`, `--color-brand-ink #18181B`, `--color-brand-soft #FFF5D6` (alias unificado) |
| Roles | `--color-role-tienda #1F41AF`, `--color-role-distribuidor #9D3A19` |
| Estados | `status-borrador #E4E4E4`, `status-aprobado #0DC300` (+texto accesible `#048200`), `status-rechazado #7B1C1C`, `status-enviado #1F41AF` |
| Accesibilidad | `--color-on-brand #18181B` → **todo texto sobre `#F8B602` es `text-on-brand`** (10.1:1 WCAG AA; el blanco tenía 1.8:1) |
| Z-index | `--z-header / --z-drawer / --z-select / --z-modal` (sin números mágicos) |
| Sombras | `--shadow-sm/md/lg` uniformes |

- **Tipografía oficial (regla exacta)**: `--font-sans` y `--font-mono` apuntan ambos a **DM Sans**; `font-feature-settings: "tnum"` global en `table` e `input[type=number]` + utilidad `@utility tnum`.
- **Aliases legacy conservados** como `var()` dentro de `@theme` (`estado-*`, `tienda*`, `distribuidor*`) → cero roturas.
- `animate-in/out`, `fade-in`, `zoom-in`, `slide-in` restaurados via **`tw-animate-css`** (importado con `@import`, no `@plugin`: su package.json solo exporta condición `style` y Turbopack lo rechazaba).
- Reglas globales: `:focus-visible` visible, `::selection` en `brand-soft`, `prefers-reduced-motion` desactiva animaciones, `box-sizing: border-box`.
- `tailwind.config.mjs` reducido a lo mínimo (solo `fontFamily`).

## Fase B — Librería de componentes (`components/ui`)

| Componente | Cambios |
|---|---|
| `Button` | `type="button"` por defecto (todos los `<form>` ya declaraban `submit`), `aria-busy` al hacer loading, `IconButton` exportado, sin `text-white` |
| `Input` / `Textarea` | label con `htmlFor`/`useId`, `aria-invalid` + `aria-describedby`; Textarea sin styles inline (tokens compartidos) |
| `Select` | ARIA combobox/listbox completo, teclado ↑↓/Home/End/Escape/Tab, portal en `z-select`, `useId` (puro) |
| `Modal` | Scroll único (`max-h-[90dvh]`), footer propio sticky vía prop `footer`, focus trap, Escape con guard de `listbox`, `aria-labelledby`, prop `closeDisabled`; `ModalFooter` exportado |
| `ConfirmModal` | Usa `closeDisabled={loading}` (botón cerrar no se invierte con el botón de confirmación) |
| `Badge` | Mapas únicos + `StatusBadge`; **API pública intacta** (tests verdes) |
| `Table` | Wrapper con `tabIndex/role/aria-label` (scroll horizontal accesible), `stickyHeader`, `tnum`, slots `TableSkeleton`/`TableEmpty` |
| `Pagination` | `text-on-brand`, `tnum` |
| **`DropdownMenu` (nuevo)** | Menú ARIA `menu`/`menuitem`, Escape, ↑↓, click-outside, portal `z-select` |
| **`fieldStyles.ts` (nuevo)** | Tokens de campo compartidos (Input/Textarea/Select/PriceMatrix) |

Utilidades nuevas: **`lib/cn.ts`** (clsx + tailwind-merge) y **`lib/scrollLock.ts`** (lock con contador + compensación de scrollbar) — reutilizado por `Modal`, `AdminLayout`, `VendedorLayout` y `NotificacionesDrawer`.

## Fase C — Limpieza y módulos

- **C1**: sweep `font-['DM_Sans']` → `font-sans` (18 archivos); sweep `text-white` → `text-on-brand` sobre `bg-brand-primary` (14 líneas/12 archivos). Verificado: **0 restantes**.
- **C3 `ProductoModal`** (~740 → descompuesto): subcomponentes en `features/inventario/components/producto-form/` — `ProductFormSection`, `PriceMatrix`, `ImageUploader`, `SurtidoColorsField`. Scroll único con footer vía prop + `form="producto-form"`; sin `as any` (2 casts localizados tipados); `ProductoPayload` interface estricta; `revokeObjectURL`; límite base64 500KB; "Restablecer" con `ConfirmModal`.
- **C4 `InventarioFilters`**: reescrito con `DropdownMenu` (corrige el bug de `onAlertas` que nunca se renderizaba), tokens en vez de hex.
- **C5 `InventarioTable`**: nuevo **`StockBadge`** (crítico/bajo/minimo/ok — el stock ya no es siempre verde), `TableSkeleton` con `role="status"`, `TableEmpty`, fallbacks `'—'`, props muertas eliminadas; mapper/API extraído a **`features/inventario/mappers.ts`**.
- **C6 Dashboard**: nuevo **`components/shared/StatCard.tsx`** (fondo suave + icono coloreado, sin rellenos saturados con texto blanco), secciones con `role="status"`/`aria-labelledby`, estado de error con `role="alert"` + Reintentar, **sin gráficos** (decisión aprobada), `tnum`.
- **C7**: `scrollLock` compartido en layouts y drawer; z-index con tokens.

## Fase D — Documentación y verificación

- Este documento (`REDESIGN.md`).
- Comandos de verificación (en verde):
  ```bash
  pnpm --filter @goldcontinent/web typecheck   # ✓
  pnpm --filter @goldcontinent/web lint         # ✓
  pnpm --filter @goldcontinent/web test         # ✓ 22/22
  pnpm --filter @goldcontinent/web build        # ✓ 22 rutas
  ```

## Reglas de la casa

1. Texto sobre `#F8B602` → siempre `text-on-brand` (`#18181B`), nunca `text-white`.
2. Fuentes → siempre `font-sans` (DM Sans); números tabulares con `tnum`.
3. Hex sueltos prohibidos en componentes → usar tokens (`bg-brand-primary`, `status-*`, `role-*`).
4. Nuevos modales: usar `Modal` + `footer={<ModalFooter …/>}` (scroll único garantizado).
5. Bloqueo de scroll → `lockBodyScroll()/unlockBodyScroll()` de `lib/scrollLock.ts`.
6. Menús desplegables → `DropdownMenu` (no menús caseros).

## Deuda restante (consciente)

- **`CotizacionFormulario.tsx`** (~713 líneas): candidato a descomposición estilo `producto-form/`.
- Otros modales con footer interno (`MovimientoModal`, `TransferenciaModal`, `UsuarioModal`, `KardexModal`…) usan el footer dentro del contenido (se comportan igual que antes; migrarlos a prop `footer` es mecánico).
- `VendedorLayout`: sin `StatCard`/skeletons (se decidió no tocar vistas vendedor en esta ronda).
- Tests de componentes: solo `Button` y `Badge` tienen tests; `Select`/`Modal`/`DropdownMenu` merecen suite propia.

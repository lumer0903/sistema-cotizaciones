# Apartado 5 — Identidad Visual y Marca

**Proyecto:** Sistema de Información Web para Incrementar la Eficiencia de la Gestión de Cotizaciones en Importaciones y Exportaciones Gold Continent EIRL

**Pregunta a resolver:** ¿la marca mostrada es **Importaciones y Exportaciones Gold Continent EIRL** o aún figura "Artes y Flores"?

---

## 5.1 Veredicto

**La marca activa es "Import & Export Gold Continent". NO queda ningún rastro de "Artes y Flores".**

| Verificación | Resultado |
|---|---|
| Búsqueda en el árbol actual: `Artes y Flores`, `ARTES Y FLORES`, `artesyflores` (case-insensitive) | **0 coincidencias** |
| Búsqueda en **todo el historial de git** (`git log -S` en todos los commits) | **0 commits** |
| Búsqueda de `artes` como palabra exacta | **0 coincidencias** |

Únicos textos que contienen "flores", todos correspondientes a **datos de catálogo** (no a la marca):

| Archivo:línea | Contenido |
|---|---|
| `scripts/importar_polizas.py:57` | Categoría de producto `FLORES Y PLANTAS ARTIFICIALES` |
| `apps/api/scripts/import-products/upload_img.py:46,49` | Ruta legacy de imágenes `/app/IMAGENES-FLORES` |
| `packages/shared/src/constants/descripcion.ts:40` | Ejemplo de texto en comentario |
| `scripts/importar-unificado.js:116` | Comentario de parser |

> En historia de git existieron la carpeta `IMAGENES-FLORES/` y frontends legacy (`frontend/`, `Empleado-front/`, `Gold_back/`), ya eliminados del árbol actual.

---

## 5.2 Inventario de imágenes de marca

| Archivo | Tamaño | Uso |
|---|---|---|
| `apps/web/public/LOGO_GRANDE.svg` | 604.107 B | Logo principal: login y sidebar |
| `apps/web/public/MUNDO.svg` | 441.490 B | Isotipo secundario (esquina de la tarjeta de login) |
| `apps/web/src/app/icon.svg` | 587.755 B | Favicon (convención App Router de Next) |
| `apps/api/src/assets/LOGO_GRANDE.svg` | 604.107 B | **Logo del PDF** — idéntico byte a byte al del frontend (SHA256 `79F2871C3E221A2042432E9F7DB7F323C5ECF3326D4F92504AABB839EE5B3176`) |

Notas:
- **No hay archivos de marca en formato `.png`, `.jpg`, `.webp` o `.ico`.**
- `storage/product-images/` contiene el catálogo de productos (miles de archivos), no material de marca.
- Los SVG son **exportaciones rasterizadas**: contienen etiquetas `<image>` con payloads `data:image/...;base64` y **0 etiquetas `<text>`**, por lo que el texto de marca no es extraíble desde el SVG.

---

## 5.3 Apariciones de la marca en el código

### Frontend (Next.js)

| Archivo:línea | Cadena mostrada |
|---|---|
| `apps/web/src/app/layout.tsx:22` | `title: 'Gold Continent'` |
| `apps/web/src/app/layout.tsx:23` | `description: 'Sistema de gestión comercial'` |
| `apps/web/src/app/(auth)/layout.tsx:4` | `title: 'Iniciar Sesión - Gold Continent'` |
| `apps/web/src/app/(auth)/login/page.tsx:64` y `:220` | `alt="Gold Continent Import & Export"` (`src="/LOGO_GRANDE.svg"`) |
| `apps/web/src/app/(auth)/login/page.tsx:229` | `alt="Gold Continent Icon"` (`src="/MUNDO.svg"`) |
| `apps/web/src/components/ui/Sidebar.tsx:141‑142` | `src="/LOGO_GRANDE.svg"`, `alt="Import & Export Gold Continent"` |
| `apps/web/src/features/configuracion/components/ConfiguracionView.tsx:70` | `empresa_nombre: 'Gold Continent SAC'` |
| `apps/web/src/features/configuracion/components/ConfiguracionView.tsx:71` | `empresa_ruc: '20123456789'` (placeholder) |
| `apps/web/src/features/configuracion/components/ConfiguracionView.tsx:74` | `empresa_email: 'ventas@goldcontinent.com'` |
| `apps/web/src/features/configuracion/components/ConfiguracionView.tsx:94` | `empresa_titular_principal: 'RAZÓN SOCIAL GOLD CONTINENT'` |

`AdminLayout.tsx` y `VendedorLayout.tsx` **no contienen texto de marca** (solo clases `text-brand-*` de CSS); el logo vive en `Sidebar.tsx`, que ambos layouts montan.

### Backend / PDF (NestJS)

| Archivo:línea | Cadena |
|---|---|
| `apps/api/src/modules/cotizaciones/pdf/cotizaciones-pdf.service.ts:62` | `private razonSocial = 'IMPORT & EXPORT GOLD CONTINENT';` |
| `cotizaciones-pdf.service.ts:63` | `private ruc = '20523652525';` |
| `cotizaciones-pdf.service.ts:258` | `config['empresa_nombre'] ?? ... ?? 'IMPORT & EXPORT GOLD CONTINENT'` |
| `cotizaciones-pdf.service.ts:259` | `config['empresa_ruc'] ?? '20523652525'` |
| `cotizaciones-pdf.service.ts:685` | Fallback del encabezado: `IMPORT & EXPORT <span>GOLD CONTINENT</span>` |
| `cotizaciones-pdf.service.ts:687` | `<strong>${esc(this.razonSocial)}</strong>` |
| `cotizaciones-pdf.service.ts:809‑811` | Footer: `Documento generado por <strong>…</strong> · RUC: … · Lima, Perú` |
| `cotizaciones-pdf.service.ts:418‑433` | CSS `.brand-logo` / `.brand-fallback` con acento dorado `#f8b602` |
| `apps/api/src/main.ts:97` | Swagger `.setTitle('GoldContinent API')` |
| `apps/api/src/modules/configuracion/configuracion.controller.ts:16` | `@ApiProperty({ example: 'Gold Continent E.I.R.L.' })` |
| `apps/ai-service/app/main.py:19` | `FastAPI(title="Gold Continent AI Service", version="0.2.0")` |

`pdf-export.service.ts` **no contiene cadenas de marca** (solo orquesta cola BullMQ/MinIO).

### Infraestructura y entorno

| Archivo:línea | Cadena |
|---|---|
| `.env.example:2` | `DATABASE_URL=postgresql://goldcontinent:…@localhost:5432/goldcontinent` |
| `.env.example:26` | `STORAGE_BUCKET=goldcontinent-media` |
| `docker-compose.yml:4` | `container_name: goldcontinent-storage` |
| `docker-compose.yml:26` | `networks.default.name: goldcontinent-network` |
| `package.json` (raíz / api / web) | `goldcontinent`, `@goldcontinent/api`, `@goldcontinent/web` |

**No existen variables de entorno de marca** (`NOMBRE_EMPRESA`, `EMPRESA_RUC`, `LOGO_*`, `MARCA_*`) en `.env`, `.env.example` ni `docker-compose.yml`.

---

## 5.4 Cómo se carga el logo en el PDF

**Archivo local → incrustado como data-URI base64 en el HTML → Puppeteer.** No usa URL remota ni MinIO/S3.

```ts
// apps/api/src/modules/cotizaciones/pdf/cotizaciones-pdf.service.ts:94-118
private loadLogo(): void {
  const possiblePaths = [
    path.resolve(__dirname, '../../../assets/LOGO_GRANDE.svg'),
    path.resolve(__dirname, '../../assets/LOGO_GRANDE.svg'),
    path.resolve(__dirname, '../assets/LOGO_GRANDE.svg'),
    path.resolve(process.cwd(), 'apps/api/src/assets/LOGO_GRANDE.svg'),
    path.resolve(process.cwd(), 'src/assets/LOGO_GRANDE.svg'),
    path.resolve(process.cwd(), 'apps/web/public/LOGO_GRANDE.svg'),
    path.resolve(process.cwd(), 'public/LOGO_GRANDE.svg'),
  ];
  ...
  this.logoBase64 = `data:image/svg+xml;base64,${svgContent.toString('base64')}`;
}
```

- Ruta efectiva en desarrollo: `apps/api/src/assets/LOGO_GRANDE.svg`.
- En Docker: `process.cwd()/apps/api/src/assets/LOGO_GRANDE.svg` (el `Dockerfile` copia el repo completo; no hay `nest-cli.json`).
- Los PDFs generados se guardan en el bucket MinIO **`cotizacion-pdfs`** (`pdf.constants.ts:8`), pero ese es el resultado, no el logo.

---

## 5.5 Fragmentos de encabezados y pie del PDF

```html
<!-- cotizaciones-pdf.service.ts:681-692 — encabezado -->
<div class="header">
  <div class="header-left">
    ${this.logoBase64
      ? `<img src="${this.logoBase64}" alt="${esc(this.razonSocial)}" class="brand-logo" />`
      : `<div class="brand-fallback">IMPORT & EXPORT <span>GOLD CONTINENT</span></div>`}
    <div class="company-info">
      <div><strong>${esc(this.razonSocial)}</strong></div>
      ${this.ruc ? `<div><strong>RUC:</strong> ${esc(this.ruc)}</div>` : ''}
      ${this.direccion ? `<div>${esc(this.direccion)}</div>` : ''}
      ${/* Tel / Email */ ''}
    </div>
  </div>
</div>

<!-- :809-811 — pie de página -->
<div class="page-footer">
  Documento generado por <strong>${esc(this.razonSocial)}</strong> · RUC: ${esc(this.ruc)} · Lima, Perú
</div>
```

```ts
// :255-260 — configuración dinámica (prioriza la tabla `configuracion`)
private async loadCompanyConfig(): void {
  this.razonSocial = config['empresa_nombre'] ?? 'IMPORT & EXPORT GOLD CONTINENT';
  this.ruc         = config['empresa_ruc']    ?? '20523652525';
}
```

---

## 5.6 Fragmentos de identidad en la web

```tsx
// apps/web/src/app/layout.tsx:21-24
export const metadata: Metadata = {
  title: 'Gold Continent',
  description: 'Sistema de gestión comercial',
};
```

```tsx
// apps/web/src/app/(auth)/login/page.tsx:62-69
<Image
  className="w-full max-h-32 sm:max-h-40 lg:max-h-none lg:h-[500px] object-contain"
  alt="Gold Continent Import & Export"
  src="/LOGO_GRANDE.svg"
  width={666} height={500} priority
/>
```

```tsx
// apps/web/src/components/ui/Sidebar.tsx:140-146
<Image src="/LOGO_GRANDE.svg" alt="Import & Export Gold Continent"
  width={200} height={60} priority
  className="h-12 w-auto max-w-full object-contain ..." />
```

---

## 5.7 Base de datos: parametrización de la marca

```prisma
// packages/database/prisma/schema.prisma:402-409
model Configuracion {
  clave       String  @id @map("clave")
  valor       String  @map("valor")
  descripcion String? @map("descripcion")
  updated_at  DateTime @default(now()) @updatedAt @map("updated_at")
  @@map("configuracion")
}
```

- Tabla creada en la migración baseline (`20261009190731_baseline/migration.sql:288‑294`).
- **No hay seed de claves de marca:** ningún archivo de `packages/database` inserta filas en `configuracion`. Si la tabla está vacía, el PDF usa los valores **hardcodeados** de Gold Continent.

---

## 5.8 Inconsistencias internas de la marca actual (recomendaciones)

1. **El nombre legal completo no aparece en ninguna parte del código:** no existe la cadena literal *"Importaciones y Exportaciones Gold Continent EIRL"*; se usa la forma inglesa **`Import & Export Gold Continent`**.
2. **Variantes en paralelo:**
   - `Gold Continent` (título web)
   - `IMPORT & EXPORT GOLD CONTINENT` (PDF)
   - `Gold Continent SAC` (default de la vista de Configuración, `ConfiguracionView.tsx:70`)
   - `Gold Continent E.I.R.L.` (ejemplo de Swagger, `configuracion.controller.ts:16`)
   - `GoldContinent API` (título de Swagger, `main.ts:97`)
3. **RUC en conflicto:** PDF hardcodea `20523652525` (`:63`, `:259`) vs. placeholder de UI `20123456789` (`ConfiguracionView.tsx:71`).
4. **El nombre del PDF solo es personalizable** si la tabla `configuracion` contiene las claves `empresa_nombre` y `empresa_ruc`; sin ese seed, el valor es el hardcodeado.

> **Conclusión para el informe:** la identidad visual del sistema corresponde íntegramente a **Importaciones y Exportaciones Gold Continent**; la marca anterior ("Artes y Flores") fue reemplazada de forma completa y verificable tanto en el código actual como en el historial de versiones.

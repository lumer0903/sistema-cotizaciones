# Apartado 1 — Arquitectura Tecnológica y Dependencias

**Proyecto:** Sistema de Información Web para Incrementar la Eficiencia de la Gestión de Cotizaciones en Importaciones y Exportaciones Gold Continent EIRL

**Archivos de referencia:** `package.json` (raíz), `apps/api/package.json`, `apps/web/package.json`, `apps/ai-service/requirements.txt`, `docker-compose.yml`, `.env.example`

---

## 1.1 Estructura general del sistema

Arquitectura de **monorepo** (Turborepo + pnpm workspaces) con tres aplicaciones y dos paquetes compartidos:

```
sistema-cotizaciones/
├── apps/
│   ├── api/          → @goldcontinent/api     (NestJS 11, Node >= 20)
│   ├── web/          → @goldcontinent/web     (Next.js 16, React 19)
│   └── ai-service/   → microservicio de IA    (FastAPI, Python)
├── packages/
│   ├── database/     → esquema Prisma + migraciones SQL (PostgreSQL)
│   └── shared/       → enums y constantes compartidas (pricing, descripción)
├── scripts/          → dev.js, dev-ai.js, importación de pólizas
├── docker-compose.yml→ MinIO (storage) + red goldcontinent-network
└── turbo.json / pnpm-workspace.yaml
```

Scripts raíz relevantes (`package.json`):
- `dev` → `node scripts/dev.js` (API + web + IA), `dev:ai`, `dev:api`, `dev:web`
- `build` / `lint` / `typecheck` / `test` vía `turbo run`
- `check` = `typecheck && lint && build && test`
- `db:generate | db:push | db:migrate | db:studio | db:seed | db:backup | db:restore`
- `docker:up | docker:down | docker:logs` (solo servicio de almacenamiento MinIO)

---

## 1.2 Backend — NestJS sobre Express (Node.js)

**No es Express "pelado":** es **NestJS 11** ejecutado sobre el adaptador **Express 5** (`@nestjs/platform-express` + `express@^5.2.0`).

### Dependencias principales (`apps/api/package.json`)

| Categoría | Dependencias |
|---|---|
| Framework | `@nestjs/common@11`, `@nestjs/core@11`, `@nestjs/config`, `@nestjs/platform-express` (Express 5) |
| Autenticación/seguridad | `@nestjs/jwt`, `@nestjs/passport` + `passport-jwt`, `bcryptjs`, `jsonwebtoken`, `helmet`, `express-rate-limit`, `cookie-parser`, `cors` |
| Validación/documentación | `class-validator`, `class-transformer`, `zod`, `@nestjs/swagger` + `swagger-ui-express` + `@scalar/nestjs-api-reference` |
| Persistencia | `@prisma/client@^5.22.0`, `pg@^8.11.0`, workspace `@goldcontinent/database` |
| Colas / asíncrono | `bullmq@^5`, `@nestjs/bullmq@^11`, `node-cron` |
| Almacenamiento de archivos | `minio@^8.0.7`, `multer`, `@types/minio` |
| **Generación de PDF** | **`puppeteer@^25.12.0`** |
| Cliente de IA | `@nestjs/axios@^3` + `axios@^1.7.7` |
| Importación de datos | `xlsx@^0.18.5` (también en la raíz) |
| Pruebas/lint | `vitest`, `eslint@9`, `typescript-eslint`, `tsx`, `ts-node` |

### Configuración global (`apps/api/src/main.ts`)

```ts
app.enableCors(...)          // :35 — CORS ANTES de los limiters (evita que un 429 se lea como error CORS)
app.use(cookieParser());     // :44
app.use(helmet({...}));      // :45
// :60  rate-limit específico para credenciales (login)
// :76  rate-limit general, max = RATE_LIMIT_MAX (default 300; .env.example usa 600)
app.useGlobalPipes(new ValidationPipe({...})); // :86
app.setGlobalPrefix('api');  // :94  → todas las rutas quedan bajo /api
// :102 SwaggerModule.createDocument + /api/docs
await app.listen(port);      // :114  PORT=3001
```

Swagger se titula **`GoldContinent API`** (`main.ts:97`).

### Módulos registrados (`apps/api/src/app.module.ts`)

```
ConfigModule (global, envFilePath '.env')
PrismaModule · StorageModule · MinioModule · AuthModule
BullModule (forRootAsync) · CotizacionesModule · PdfWorkerModule.forRoot('api')
AiModule · ProductosModule · UsuariosModule · RolesModule · CobranzaModule
ClientesModule · CategoriasModule · HistorialPreciosModule · AlmacenesModule
InventarioModule · RecomendacionesModule · DashboardModule · ConfiguracionModule
ReportesModule · NotificacionesModule
```

### Variables de entorno clave (`.env.example`)

```
DATABASE_URL=postgresql://goldcontinent:goldcontinent_dev@localhost:5432/goldcontinent?schema=public
PORT=3001 · CLIENT_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000 · IA_URL=http://localhost:8000
STORAGE_DRIVER=minio · STORAGE_BUCKET=goldcontinent-media · STORAGE_ENDPOINT=localhost:9000
REDIS_HOST=localhost · REDIS_PORT=6379
PDF_ROLE=both · PDF_WORKER_PORT=3002
RATE_LIMIT_MAX=600
NEXT_PUBLIC_API_URL=http://localhost:3001 · NEXT_PUBLIC_IA_URL=http://localhost:8000
```

---

## 1.3 Generación de PDF de las cotizaciones — **Puppeteer**

**Librería utilizada: `puppeteer@25`** (no PDFKit, no jsPDF, no react-pdf). El PDF se renderiza a partir de HTML/CSS con Chromium headless.

### Rutas y servicios involucrados

| Archivo | Responsabilidad |
|---|---|
| `apps/api/src/modules/cotizaciones/pdf/cotizaciones-pdf.service.ts` | Construcción del HTML y render con Puppeteer (**849 líneas**) |
| `apps/api/src/modules/cotizaciones/pdf/pdf-export.service.ts` | Orquestación: caché, cola BullMQ, *fail-fast*, lectura desde almacen |
| `apps/api/src/modules/cotizaciones/pdf/pdf.processor.ts` | Worker de la cola (`@Processor('cotizacion-pdfs', { concurrency: 2 })`) |
| `apps/api/src/modules/cotizaciones/pdf/pdf-worker.module.ts` | Módulo condicional según `PDF_ROLE` (`producer` / `consumer` / `both`) |
| `apps/api/src/modules/cotizaciones/pdf/pdf-storage.service.ts` | Persistencia del binario (MinIO bucket `cotizacion-pdfs` o fallback local) |
| `apps/api/src/modules/cotizaciones/pdf/pdf-hash.ts` | Hash del contenido (`pdf_hash`) para caché e invalidación |
| `apps/api/src/modules/cotizaciones/pdf/pdf.constants.ts` | `PDF_QUEUE = 'cotizacion-pdfs'`, `PDF_BUCKET`, lectura de `PDF_ROLE` |

### Fragmento clave del render (`cotizaciones-pdf.service.ts:817‑848`)

```ts
async generarPdfBuffer(id: number): Promise<{ buffer: Buffer; filename: string; hash: string }> {
  const cot: any = await this.cotizacionesService.obtenerPorId(id);
  const hash = computePdfHash(cot);
  await this.loadCompanyConfig().catch(() => {});
  if (!this.logoBase64) this.loadLogo();

  const pooled = await this.acquireBrowser();
  let page: import('puppeteer').Page | null = null;
  try {
    page = await pooled.browser.newPage();
    const html = this.buildHtml(cot);
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    const buffer = Buffer.from(pdf);
    const filename = `${String(cot.numero || `COT-${id}`).replace(/[^A-Za-z0-9-_]+/g, '_')}.pdf`;
    return { buffer, filename, hash };
  } finally {
    await page?.close().catch(() => undefined);
    this.releaseBrowser(pooled);
  }
}
```

Otros puntos relevantes del servicio:
- `:16` `const puppeteer = require('puppeteer')`; `:149` `puppeteer.launch(...)` con **pool de navegadores** (warmup `:128`, adquisición `:213`, apagado `:200`).
- `:94‑118` `loadLogo()` incrusta `LOGO_GRANDE.svg` como **data-URI base64** (archivo local, no URL remota).

### Endpoints (`apps/api/src/modules/cotizaciones/cotizaciones.controller.ts`)

```ts
@Permission('pdf', 'lectura')
@Get(':id/export-pdf')                 // :63
async exportPdf(...) {
  const resultado = await this.pdfExportService.exportar(id);
  if (resultado.type === 'processing')   // cola asincrónica
    return res.status(202).json({ status:'processing', jobId,
                                  poll: `/api/cotizaciones/${id}/pdf-status` });
  res.setHeader('Content-Type', 'application/pdf');
  if (resultado.cached) res.setHeader('X-PDF-Cache', 'hit');
  res.end(resultado.buffer);
}

@Permission('pdf', 'lectura')
@Get(':id/pdf-status')                 // :85 — estado del job encolado
```

### Comportamiento de la cola

- Cola **`cotizacion-pdfs`** (`pdf.constants.ts:1`), procesada con `concurrency: 2`.
- **Fail-fast:** si Redis está caído o no hay workers, la API responde **503 en ~3 s** en lugar de colgar la petición (`pdf-export.service.ts:91‑114`).
- Modos de despliegue (`pdf-worker.module.ts:13‑37`):
  | `PDF_ROLE` | Proceso API | Proceso worker |
  |---|---|---|
  | `producer` | solo encola | `pdf-worker` (puerto 3002) consume |
  | `consumer` | error de configuración | — |
  | `both` | encola y consume en un solo proceso (default) |

- Scripts disponibles: `pnpm --filter @goldcontinent/api dev:worker` y `start:worker` (`apps/api/package.json`).

---

## 1.4 Microservicio de IA — **FastAPI** (Python)

### Estructura

```
apps/ai-service/
├── app/
│   └── main.py          ← único archivo de servicio (191 líneas)
├── requirements.txt
├── .env
├── Dockerfile.dev
└── .venv/               ← entorno virtual local
```

**No utiliza Flask.** Es una aplicación **FastAPI** servida con **Uvicorn**.

### Dependencias (`apps/ai-service/requirements.txt`)

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
psycopg2-binary>=2.9.10
scikit-learn>=1.8.0
numpy>=2.1.0
scipy>=1.18.0
pydantic>=2.11.8
python-dotenv>=1.2.1
```

> **No hay pandas**, ni NLTK/spaCy, ni frameworks de deep learning: el motor es exclusivamente **TF-IDF + similitud del coseno de scikit-learn**.

### Rutas activas (`apps/ai-service/app/main.py`)

| Método | Ruta | Línea | Descripción |
|---|---|---|---|
| GET | `/health` | `:131` | `{'status':'ok','service':'goldcontinent-ai','total_productos':N}`; **503** si el modelo no está inicializado |
| POST | `/admin/refresh-cache` | `:137` | Reentrena el TF-IDF y devuelve `{'status':'success','total_productos':N}` |
| POST | `/suggest` | `:146` | Motor de recomendación (respuesta `RecommendResponse`) |

Metadatos: `FastAPI(title="Gold Continent AI Service", version="0.2.0")` (`main.py:19`).

### Cómo se conecta con el backend principal

**Vía 1 — NestJS → FastAPI (HTTP)**
`apps/api/src/modules/ai/infrastructure/clients/http-ai.service.ts`:

```ts
private readonly aiUrl = process.env.AI_SERVICE_URL || process.env.IA_URL || 'http://localhost:8000';
private readonly useMock = process.env.AI_USE_MOCK === 'true' ||
  (!process.env.AI_SERVICE_URL && !process.env.IA_URL);
private readonly httpTimeout = parseInt(process.env.AI_HTTP_TIMEOUT || '5000', 10);

async recommendItem(data) { return this.callAIService('/suggest', data); }   // :82-89
async generateQuoteSuggestions(data) { return this.callAIService('/suggest', data); } // :78-80
```
- Timeout configurable (`AI_HTTP_TIMEOUT`, default 5000 ms).
- **Modo mock** para desarrollo cuando no hay URL de IA o ante errores en entorno no productivo.
- En producción: `503 SERVICE_UNAVAILABLE` (servicio caído) o `504 GATEWAY_TIMEOUT` (timeout).

**Vía 2 — FastAPI → PostgreSQL (directo, `psycopg2`)**
`main.py:48‑56` conecta con `DATABASE_URL` eliminando el parámetro `schema` (que pertenece a Prisma, no al DSN de libpq):

```python
url = urlsplit(DATABASE_URL)
query = urlencode([(k, v) for k, v in parse_qsl(url.query) if k != 'schema'])
dsn = urlunsplit((url.scheme, url.netloc, url.path, query, url.fragment))
return psycopg2.connect(dsn, cursor_factory=RealDictCursor, connect_timeout=5)
```

**Vía 3 — Reentrenamiento automático desde el backend**
`apps/api/src/modules/ai/infrastructure/ai-cache-refresh.service.ts` dispara, en modo *fire-and-forget* (timeout 3 s, `AI_REFRESH_CACHE_TIMEOUT`), un `POST /admin/refresh-cache` **tras crear o editar productos**, para que `/suggest` use las descripciones actualizadas sin reiniciar el servicio:

```ts
refreshCache(trigger: string): void {
  firstValueFrom(this.httpService.post(`${this.aiUrl}/admin/refresh-cache`, {},
    { timeout: this.timeoutMs }).pipe(timeout(this.timeoutMs), catchError(() => of(null))));
}
```

### Entorno de ejecución

- Desarrollo: `pnpm dev:ai` → `node scripts/dev-ai.js`.
- Carga de variables: `main.py:20‑23` carga, en orden, `apps/ai-service/.env`, `.env` de la raíz y `packages/database/.env` (el proceso tiene prioridad sobre los archivos).

---

## 1.5 Frontend — Next.js + React

### Dependencias principales (`apps/web/package.json`)

| Categoría | Dependencias |
|---|---|
| Framework | `next@^16.1.0` (App Router), `react@^19`, `react-dom@^19` |
| Estado de servidor | `@tanstack/react-query@^5.104.1` |
| Estado de cliente | `zustand@^5` |
| Formularios | `react-hook-form@^7.87.0`, `@hookform/resolvers`, `zod@^3.25.76` |
| Visualización | `recharts@^3.10.1` (gráficos del dashboard), `lucide-react` (iconos) |
| UI/estilos | `tailwindcss@^4.3.0`, `@tailwindcss/postcss`, `tailwind-merge`, `tw-animate-css` |
| Notificaciones | `sonner` |
| Seguridad/JWT | `jose` |
| Pruebas | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test` |

Scripts: `dev: next dev --turbopack -p 3000`, `build: next build --webpack`, `start`, `lint`, `typecheck`, `test: vitest run`.

### Gestión de llamadas HTTP: **`fetch` nativo (no Axios)**

Verificado: **cero importaciones de `axios`** en `apps/web/src`.

Cliente central: **`apps/web/src/lib/apiClient.ts`**

```ts
// :87
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  ...
  let response = await fetch(url, { ... });
  ...
  // :35 — refresco automático de sesión si el access token expiró
  const response = await fetch(normalizeUrl('/auth/refresh'), { ... });
  // :126 — helper que ya parsea y valida la respuesta
  const response = await apiFetch(path, options);
```

- Base URL: `NEXT_PUBLIC_API_URL=http://localhost:3001` (prefijo `/api` agregado por el backend).
- Capa de datos: **React Query** (`apps/web/src/app/providers.tsx` envuelve la app en `QueryClientProvider` + `AuthProvider` + `Toaster` + `TableDensityProvider`).

```tsx
// providers.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/authProvider';
import { Toaster } from 'sonner';
```

---

## 1.6 Infraestructura y despliegue

- **`docker-compose.yml`**: solo define el servicio `storage` (MinIO, puertos 9000/9001, healthcheck `mc ready`), volumen `storage_data` y red `goldcontinent-network`. PostgreSQL, Redis, API, web e IA corren de forma nativa en desarrollo.
- **Fly.io:** existen `fly-api.toml` y `fly-web.toml` para despliegue en la nube.
- **Almacenamiento:** driver MinIO/S3 compatible, bucket `goldcontinent-media` (imágenes de productos) y bucket `cotizacion-pdfs` (PDFs generados).
- **Prisma:** `packages/database` con `binaryTargets = ["native", "debian-openssl-3.0.x"]` y extensión `pg_trgm` para búsquedas difusas (`GIN`).

---

## 1.7 Diagrama de flujo de una petición típica

```
[Next.js 16 · React 19]  fetch()  →  http://localhost:3001/api/...
        │                                   │
        │  React Query (caché/reintentos)   │  NestJS 11 (Express 5)
        │  apiClient (refresh de JWT)       │  helmet + rate-limit + ValidationPipe
        │                                   │
        │                     ┌─────────────┼──────────────────┐
        │                     │             │                  │
        │               Prisma/PostgreSQL  BullMQ/Redis    HTTP (axios)
        │                     │             │                  │
        │                     │        Cola cotizacion-pdfs   FastAPI :8000
        │                     │             │                  │  (TF-IDF + coseno)
        │                     │        pdf-worker (Puppeteer)  │
        │                     │             │                  └── psycopg2 → PostgreSQL
        │                     │        MinIO (cotizacion-pdfs)
        ▼                     ▼             ▼
   Usuario (asesora)      Datos          PDF A4 descargable / recomendaciones IA
```

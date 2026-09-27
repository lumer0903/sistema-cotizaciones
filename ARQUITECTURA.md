# Arquitectura — Gold Continent

> Sistema de cotizaciones para floristería: monorepo con frontend Next.js, API NestJS, microservicio IA Python y PostgreSQL.

---

## Visión general

```
                        ┌─────────────────────┐
                        │   apps/web (Next)   │  :3000
                        │  React 19 · App     │
                        │  Router · RBAC FE   │
                        └──────────┬──────────┘
                                   │ HTTP  /api (Bearer + cookies)
                                   │ 202 + polling /pdf-status (PDFs)
                        ┌──────────▼──────────┐
                        │   apps/api (Nest)   │  :3001
                        │  JwtAuthGuard ·     │
                        │  ValidationPipe ·   │
                        │  helmet · rate-limit│
                        │  Worker BullMQ (PDF)│
                        │  Scalar /reference  │
                        └──┬────────────┬─────┘
              Prisma ORM   │            │ HTTP interno
                        ┌──▼──────┐  ┌──▼──────────────┐
                        │ Postgres│  │ apps/ai-service │ :8000
                        │   16    │  │ FastAPI · TF-IDF│
                        └─────────┘  └─────────────────┘

  Infra docker-compose: postgres · redis (BullMQ) · minio · api · web · ai-service
```

---

## Monorepo (pnpm + turbo)

```
sistema-cotizaciones/
├── apps/
│   ├── api/          # NestJS 11 — backend REST
│   ├── web/          # Next.js 16 — frontend
│   └── ai-service/   # FastAPI — recomendador (NO es paquete pnpm; solo Docker)
├── packages/
│   ├── shared/       # Tipos, enums, schemas Zod, RBAC (auth/rbac)
│   └── database/     # Prisma schema, migraciones, seed
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml   # packages: apps/*, packages/*
```

- **Workspace:** `apps/*` + `packages/*`; Node ≥20, pnpm 9.15.
- **Turbo:** `build`, `dev`, `lint`, `typecheck`, `test`, `db:*` con `globalEnv` (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`).
- Dependencias internas: `@goldcontinent/shared` y `@goldcontinent/database` vía `workspace:*`.

---

## Backend — patrón híbrido (DDD parcial)

### Módulos con arquitectura hexagonal/DDD

Solo **auth**, **ai** y **template** (scaffold vacío):

```
module/
├── domain/            # Entidades y contratos (interfaces, tokens Symbol)
├── application/       # Casos de uso + DTOs de aplicación
├── adapters/          # Controllers NestJS (HTTP)
└── infrastructure/    # Implementaciones (Prisma repos, JWT strategy, HttpService)
```

**Advertencia:** en `auth`, el controller inyecta `LoginUseCase` pero el endpoint real llama a la función plana de `auth.service.ts` — migración DDD a medio camino.

### Módulos planos (NestJS convencional)

El resto (productos, clientes, cotizaciones, inventario, almacenes, categorias, usuarios, cobranza, dashboard, historial-precios, configuracion):

```
module/
├── *.module.ts
├── *.controller.ts
├── *.service.ts
└── dto/               # class-validator (cotizaciones: 6 DTOs de body y query)
```

`cotizaciones` es mixta: módulo plano + subcarpetas `pdf/` y `recomendaciones/`.

### Registro de módulos (`app.module.ts`)

`ConfigModule` (global) · `PrismaModule` · `StorageModule` · `MinioModule` · `AuthModule` · `BullModule.forRootAsync` (Redis: `REDIS_HOST`/`REDIS_PORT`) · + 13 módulos de negocio. **No** registra `TemplateModule`. La cola `cotizacion-pdfs` se registra en `CotizacionesModule` (`registerQueue` con reintentos/backoff) y su worker `PdfProcessor` vive en el mismo proceso de la API.

### Capas transversales (`src/common`)

- `prisma/` — module + service (conexión global)
- `storage/` — `StorageService` (disco local) **y** `MinioModule` (S3-compatible) — dos backends conviviendo
- `filters/all-exceptions.filter.ts` — respuestas uniformes `{success:false, message}`
- `middleware/` — handlers Express legados (`errorHandler`, `notFoundHandler`) **no registrados** en `main.ts`

### Pipeline HTTP (`main.ts`)

1. Manejadores de `unhandledRejection` / `uncaughtException` (log, no exit)
2. `cookie-parser`
3. `helmet()` (headers de seguridad)
4. `express-rate-limit` (300 req / 15 min, headers estándar)
5. CORS: `origin: CLIENT_URL`, `credentials: true`
6. `ValidationPipe` estricto (`whitelist`, `forbidNonWhitelisted`, `forbidUnknownValues`)
7. `AllExceptionsFilter` global
8. Prefijo global `api` (sin versionado)
9. Documentación Swagger → UI **Scalar** en `GET /reference`
10. Puerto `3001`

### Exportación de PDF (cola BullMQ)

```
GET /api/cotizaciones/:id/export-pdf
  → PdfExportService.exportar()
    → hash sha256 de los campos del HTML (pdf_hash) + pdf_key en BD
    → cache-hit (MinIO bucket `cotizacion-pdfs` / disco local) → 200 binario (X-PDF-Cache: hit)
    → miss → encola job `generate-pdf` (id determinista por cotización+hash)
       → espera ≤ 15 s (polling interno cada 300 ms)
         → listo → 200 con el PDF recién generado
         → aún generando → 202 {status, jobId, poll: /pdf-status}
  → worker PdfProcessor (concurrency 2): Puppeteer HTML→A4 → PdfStorageService
     → actualiza pdf_key / pdf_hash / pdf_generado_en

GET /api/cotizaciones/:id/pdf-status → {estado: pendiente|generando|listo, jobId, pdf_generado_en}
```

Cliente: `getCotizacionPdfBlob` en `cotizacionApi.ts` — ante 202 sondea `pdf-status` cada 2 s (máx. 10 intentos = 20 s) y solo vuelve a llamar `export-pdf` cuando `estado === 'listo'`; agota → error con toast.

---

## Autenticación y autorización

### Flujo de tokens

```
POST /api/auth/login
  → bcrypt.compare
  → access JWT 15 min (JWT_SECRET) + refresh JWT 7 días (JWT_REFRESH_SECRET)
  → refresh_token_hash (bcrypt) persistido en usuario
  → cookies httpOnly: accessToken + refreshToken
  → JSON: access_token + usuario

JwtStrategy: lee cookies.accessToken → fallback Authorization: Bearer
             validate() → { id_usuario, email, rol }

POST /api/auth/refresh → verifica firma + type=refresh + bcrypt hash
                        → rota ambos tokens → re-setea cookies

POST /api/auth/logout  → limpia refresh_token_hash + cookies

GET  /api/auth/me      → usuario (nombre, email, rol, avatar_url, permisos)
PATCH /api/auth/password → cambia contraseña (bcrypt)
PATCH /api/auth/profile  → actualiza nombre y/o email
PATCH /api/auth/avatar   → setea foto (data URL base64, máx ~512 KB)
DELETE /api/auth/avatar  → elimina foto
```

- Secrets con fallbacks inseguros (`'dev-secret-change-in-production'`).
- `JwtModule` en `auth.module.ts` declara expiración 8h **sin uso efectivo** (los tokens reales usan `JWT_CONFIG` de shared: 15m).

### Roles

Catálogo dinámico en BD (`model Rol` + `model RolPermiso`); `Usuario.rol` es **string código** (JWT/`@Roles` siguen igual). Defaults seed: **`admin` | `gerente` | `vendedor`** (`es_sistema: true`). Matriz admin siempre `edicion` (bloqueada en UI y API).

- RBAC en `packages/shared/src/auth/rbac.ts` (`puede()`, niveles `sin_acceso < lectura < edicion`, `GRUPOS_MODULOS` administrativo/operativo, `esMatrizBloqueada`).
- **Backend:** módulo `roles` (CRUD + permisos) con `@Roles('admin')`; `RolesGuard` **por controller** + `@Roles(...)` en endpoints sensibles (usuarios, roles, categorías, almacenes, dashboard, PUT configuración). Sin `@Roles` → solo `JwtAuthGuard`. No está como `APP_GUARD` global (ese orden rompería `user` antes del JWT).
- **Frontend:** `usePermissions()` + `ProtectedRoute` en layouts + `middleware.ts` estricto (rutas `/admin` y `/vendedor` exigen sesión y cookie `userRole`); pestaña Roles y Permisos en `/admin/usuarios`.

---

## Frontend — Next.js App Router

### Protección de rutas (3 niveles)

1. **`middleware.ts` (edge):** lee cookies `accessToken/refreshToken/userRole`; redirige `/` por rol; bloquea cruce admin↔vendedor (débil si falta `userRole`).
2. **`ProtectedRoute` en layouts:** `admin/layout.tsx` exige `roles: [admin, gerente]` + permiso `dashboard`; `vendedor/layout.tsx` exige `roles: [vendedor]` + permiso `cotizaciones`.
3. **RBAC client-side:** `usePermissions()` → `can(modulo, nivel)` de `@goldcontinent/shared/auth`.

### Estructura de rutas

```
app/
├── (auth)/login/           # Público
├── admin/                  # Admin/Gerente
│   ├── dashboard, inventario, precios, cotizaciones/*,
│   ├── cobranza/*, usuarios, configuracion, reportes (stub)
└── vendedor/               # Vendedor
    ├── cotizaciones/*, catalogo
```

### Patrón de features

```
features/<nombre>/
├── api/          # Cliente API (fetch hacia Nest)
├── components/   # UI de la feature
├── hooks/        # Lógica reactiva
├── store/        # Zustand (solo cotizaciones, con persist)
└── types/        # Tipos locales
```

### Estado y datos

- **Contexto:** `lib/authProvider.tsx` (sesión, login/logout/refresh).
- **Zustand:** `useCrearCotizacionStore` (borrador de creación, `persist`).
- **Cliente API único:** `lib/apiClient.ts` — token desde cookie `accessToken` → `localStorage` (`access_token`/`token`); en 401 intenta `POST /auth/refresh` una vez y reintenta; si falla → limpia sesión y redirige a `/login?redirectTo=...`. Incluye `uploadFile()` para FormData.
- **Debounce de filtros:** `hooks/useDebounce.ts` (300 ms) en páginas de listado (inventario, cotizaciones admin/vendedor, cobranza, catálogo); el valor crudo se usa para el filtro local inmediato y el debounced para la consulta HTTP.
- **PDF:** fetch directo con cookies/Bearer en `cotizacionApi.ts` (polling 202 descrito en el flujo backend), no pasa por `apiClient`.

---

## Microservicio IA (`apps/ai-service`)

- FastAPI + uvicorn (`:8000`), pool `psycopg2` a Postgres.
- **TF-IDF en memoria** (scikit-learn, stop-words español, ngrams 1-2) + `cosine_similarity`.
- Endpoints: `GET /health`, `POST /suggest` (buckets `similar` / `upsell` / `equilibrio`), `POST /admin/refresh-cache`.
- Consumido por `HttpAiService` (Nest) con fallback a **mock**.
- **No es paquete pnpm** → `pnpm dev:ai` no funciona; solo Docker.
- **Env resuelta:** el código lee `AI_SERVICE_URL || IA_URL` (fallback a `localhost:8000`) y compose inyecta `AI_SERVICE_URL=http://ai-service:8000`.

---

## Decisiones y deudas detectadas

| Tema | Estado |
|------|--------|
| Redis/BullMQ | **Activo:** cola `cotizacion-pdfs` + worker `PdfProcessor` (en el mismo proceso de la API) |
| helmet / express-rate-limit | **Activos** en `main.ts` (helmet + 300 req/15 min) |
| node-cron | Instalado, **sin jobs** |
| ESLint | **Configurado** (flat config en `apps/api` y `apps/web`); `pnpm lint` verde |
| Tests | **55 specs vitest** (solo API: 41 cotizaciones + 14 PDF); frontend sin tests |
| Migraciones | 1 legacy + flujo real `db:push` (historial desincronizado) |
| Models legacy | ~~`Venta`, `VentaDetalle`, `VentaPago`, `CuentaCobrar`~~ **eliminados del schema** |
| DTOs cotizaciones | **Resuelto:** DTOs class-validator (`dto/`) en create/update/estado/pago/listado |
| IA env | **Resuelta:** `AI_SERVICE_URL \|\| IA_URL` + compose con `AI_SERVICE_URL` |
| CI/CD | `fly.toml` y `deploy.yml` apuntan a `Gold_back/` inexistente |
| Duplicados | `registrarPago`, `toNumber`, dos clientes API, auth controller legado |
| Campos huérfanos | `fecha_vencimiento`, `tiempo_fin` (leídos, nunca escritos) |

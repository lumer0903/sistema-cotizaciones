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
                        ┌──────────▼──────────┐
                        │   apps/api (Nest)   │  :3001
                        │  JwtAuthGuard ·     │
                        │  ValidationPipe ·   │
                        │  Scalar /reference  │
                        └──┬────────────┬─────┘
              Prisma ORM   │            │ HTTP interno
                        ┌──▼──────┐  ┌──▼──────────────┐
                        │ Postgres│  │ apps/ai-service │ :8000
                        │   16    │  │ FastAPI · TF-IDF│
                        └─────────┘  └─────────────────┘

  Infra docker-compose: postgres · redis · minio · api · web · ai-service
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
└── dto/               # class-validator (no siempre: cotizaciones usa body:any)
```

`cotizaciones` es mixta: módulo plano + subcarpetas `pdf/` y `recomendaciones/`.

### Registro de módulos (`app.module.ts`)

`ConfigModule` (global) · `PrismaModule` · `StorageModule` · `MinioModule` · `AuthModule` · `BullModule` (Redis) · + 13 módulos de negocio. **No** registra `TemplateModule`.

### Capas transversales (`src/common`)

- `prisma/` — module + service (conexión global)
- `storage/` — `StorageService` (disco local) **y** `MinioModule` (S3-compatible) — dos backends conviviendo
- `filters/all-exceptions.filter.ts` — respuestas uniformes `{success:false, message}`
- `middleware/` — handlers Express legados (`errorHandler`, `notFoundHandler`) **no registrados** en `main.ts`

### Pipeline HTTP (`main.ts`)

1. Manejadores de `unhandledRejection` / `uncaughtException` (log, no exit)
2. `cookie-parser`
3. CORS: `origin: CLIENT_URL`, `credentials: true`
4. `ValidationPipe` estricto (`whitelist`, `forbidNonWhitelisted`)
5. `AllExceptionsFilter` global
6. Prefijo global `api` (sin versionado)
7. Documentación Swagger → UI **Scalar** en `GET /reference`
8. Puerto `3001`

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
```

- Secrets con fallbacks inseguros (`'dev-secret-change-in-production'`).
- `JwtModule` en `auth.module.ts` declara expiración 8h **sin uso efectivo** (los tokens reales usan `JWT_CONFIG` de shared: 15m).

### Roles

Enum real: **`admin` | `gerente` | `vendedor`** (`packages/shared/src/constants/enums.ts`).

- RBAC completo definido en `packages/shared/src/auth/rbac.ts` (`puede()`, niveles `sin_acceso < lectura < edicion`).
- **Backend:** `RolesGuard` **por controller** (`@UseGuards(JwtAuthGuard, RolesGuard)`) + decorador `@Roles(...)` en endpoints sensibles (usuarios, categorías, almacenes, dashboard, PUT configuración). Sin `@Roles` → solo `JwtAuthGuard`. No está como `APP_GUARD` global (ese orden rompería `user` antes del JWT).
- **Frontend:** `usePermissions()` + `ProtectedRoute` en layouts + `middleware.ts` estricto (rutas `/admin` y `/vendedor` exigen sesión y cookie `userRole`).

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

---

## Microservicio IA (`apps/ai-service`)

- FastAPI + uvicorn (`:8000`), pool `psycopg2` a Postgres.
- **TF-IDF en memoria** (scikit-learn, stop-words español, ngrams 1-2) + `cosine_similarity`.
- Endpoints: `GET /health`, `POST /suggest` (buckets `similar` / `upsell` / `equilibrio`), `POST /admin/refresh-cache`.
- Consumido por `HttpAiService` (Nest) con fallback a **mock**.
- **No es paquete pnpm** → `pnpm dev:ai` no funciona; solo Docker.
- **Mismatch de env:** compose define `IA_URL`, el código lee `AI_SERVICE_URL` → riesgo de mock permanente.

---

## Decisiones y deudas detectadas

| Tema | Estado |
|------|--------|
| Redis/BullMQ | Provisionado, **sin colas ni workers** |
| helmet / express-rate-limit | Instalados, **sin usar** |
| node-cron | Instalado, **sin jobs** |
| ESLint | Scripts `lint` existen pero **sin config** en todo el repo |
| Tests | Vitest configurado, **cero specs** |
| Migraciones | 1 sola (`initial_schema`) |
| Models legacy | `Venta`, `VentaDetalle`, `VentaPago`, `CuentaCobrar` en BD (módulo ventas eliminado) |
| CI/CD | `fly.toml` y `deploy.yml` apuntan a `Gold_back/` inexistente |
| Duplicados | `registrarPago`, `toNumber`, dos clientes API, auth controller legado |
| Campos huérfanos | `fecha_vencimiento`, `tiempo_fin` (leídos, nunca escritos) |

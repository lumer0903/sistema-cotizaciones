# Tecnología — Gold Continent

> Stack completo del sistema, dependencias clave, scripts y gaps conocidos.

---

## Stack resumido

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | pnpm + Turborepo | pnpm 9.15 · turbo ^2.3 |
| Lenguaje | TypeScript (backend/frontend) · Python (IA) | TS ^5.6 |
| Backend | NestJS | 11 |
| Frontend | Next.js (App Router) + React | Next ^16 · React 19 |
| ORM / BD | Prisma + PostgreSQL | Prisma 5.22 · PG 16 |
| IA | FastAPI + scikit-learn (TF-IDF) | FastAPI 0.115 · sklearn 1.5.1 |
| Colas / Cache | Redis + BullMQ | Redis 7 · cola activa `cotizacion-pdfs` (PDFs) |
| Storage | MinIO (S3) + storage local | MinIO (buckets `product-images`, `cotizacion-pdfs`) |
| Auth | JWT (access+refresh) + cookies httpOnly + Passport | passport-jwt 4 |
| Validación BE | class-validator + class-transformer (+ zod disponible) | |
| Validación FE | react-hook-form + zod + @hookform/resolvers | |
| Estado FE | Zustand (persist) · Context (auth) | Zustand 5 |
| Estilos | Tailwind CSS v4 | ^4.3 |
| Iconos | lucide-react | |
| Toasts | sonner | |
| PDF | Puppeteer (Chromium) | 25.x |
| Docs API | @nestjs/swagger + **Scalar** (`/reference`) | |
| Node | ≥ 20 | engines |

---

## Estructura de dependencias

### Raíz (`package.json` — `goldcontinent`)

- Scripts: `dev`, `dev:api`, `dev:web`, `dev:ai`*, `dev:worker` (API), `build`, `lint`, `typecheck`, `test`, `db:*`, `docker:*`
- devDeps: `turbo`, `typescript`
- deps: `clsx`, `tailwind-merge`

> `dev` y `dev:ai` levantan `ai-service` vía `scripts/dev-ai.js` (venv/PATH + sonda `:8000/health`); el servicio no está en el workspace pnpm (sin package.json).

### `apps/api` — `@goldcontinent/api`

**Runtime:** `@nestjs/{common,core,config,platform-express,jwt,passport,axios,bullmq,swagger}`, `@prisma/client`, `prisma`, `bullmq`, `passport` + `passport-jwt`, `bcryptjs`, `jsonwebtoken`, `class-validator`, `class-transformer`, `cookie-parser`, `cors`, `express` 5, `zod`, `puppeteer`, `minio`, `multer`, `pg`, `node-cron`*, `helmet`, `express-rate-limit`, `swagger-ui-express`, `@scalar/nestjs-api-reference`, `rxjs`, `reflect-metadata`, `dotenv`, `axios`.

\* `node-cron` instalado pero sin imports en `src/` (sin jobs).

**devDeps:** `@nestjs/cli`, `@nestjs/testing`, `vitest`, `tsx`, `ts-node`, `typescript`, tipos varios.

**Scripts:** `dev` (nest start --watch), `build`, `start`, `lint` (eslint 9 flat config — `eslint.config.mjs`, verde), `typecheck`, `test` (vitest run, 93 specs), `db:*`.

### `apps/web` — `@goldcontinent/web`

**Runtime:** `next`, `react`, `react-dom`, `@goldcontinent/shared`, `react-hook-form`, `@hookform/resolvers`, `zod`, `zustand`, `lucide-react`, `sonner`.

**devDeps:** `tailwindcss` v4 + `@tailwindcss/postcss`, `postcss`, `eslint` + `eslint-config-next` (flat config, verde), tipos React/Node, `typescript`, `vitest` + `@vitejs/plugin-react` + `jsdom` + `@testing-library/{react,jest-dom,user-event}`.

**Scripts:** `dev` (next dev -p 3000), `build`, `start`, `lint`, `typecheck`, `test` (vitest run, 19 specs — `vitest.config.mts`, jsdom, alias `@` → `src`).

### `packages/shared` — `@goldcontinent/shared`

Tipos y contratos compartidos:

- `src/auth/` — RBAC (`rbac.ts`: `DEFAULT_ROLE_PERMISSIONS`, `puede()`), config JWT (`JWT_CONFIG`), tipos de usuario autenticado.
- `src/constants/` — enums (`Rol`, `EstadoCotizacion`, `TipoPrecio`, `TipoVenta`, `MetodoPago`, `OrigenMovimiento`, etc.).
- `src/schemas/` — schemas Zod.
- `src/types/` — tipos TS.

### `packages/database` — `@goldcontinent/database`

- `prisma/schema.prisma` — 18 modelos, 9 enums, extensión `pg_trgm` (modelos legacy de ventas `Venta`/`CuentaCobrar` eliminados).
- `prisma/migrations/` — 1 migración legacy (`20260909214305_initial_schema`). **Flujo actual: `db:push`** (el historial de migraciones quedó desincronizado; no usar `db:migrate` sin regenerarlo).
- `prisma/seed.ts` — 4 almacenes, 4 categorías, 6 productos con precios y stock, 1 admin (`admin@goldcontinent.com`).
- `.env` — variable `DATABASE_URL`.
- Scripts: `db:generate`, `db:push`, `db:migrate`, `db:migrate:deploy`, `db:studio`, `db:seed`.

### `apps/ai-service` (sin package.json)

`requirements.txt`: `fastapi`, `uvicorn`, `psycopg2-binary`, `scikit-learn`, `numpy`, `scipy`, `pydantic`, `python-dotenv`.

---

## Variables de entorno

| Variable | Uso | Default notable |
|----------|-----|-----------------|
| `DATABASE_URL` | Conexión Prisma/PG | — |
| `JWT_SECRET` | Access token | **Obligatorio** (sin fallback; lanza si falta) |
| `JWT_REFRESH_SECRET` | Refresh token | **Obligatorio** (sin fallback; lanza si falta) |
| `PORT` | Puerto API | `3001` |
| `CLIENT_URL` | CORS origin | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Base URL del front | `http://localhost:3001` |
| `REDIS_HOST` / `REDIS_PORT` | BullMQ (cola PDF) | `localhost` / `6379` |
| `PDF_ROLE` / `PDF_WORKER_PORT` | Quién ejecuta `PdfProcessor`: `producer` (API sólo encola) · `consumer` (worker dedicado) · `both` (un proceso, default) / puerto del worker | `both` / `3002` |
| `MINIO_*` + `MINIO_ENABLED` | Object storage (imágenes + PDFs bucket `cotizacion-pdfs`) | fallback placeholder si false |
| `AI_SERVICE_URL` | URL FastAPI (preferida por el código) | `http://localhost:8000` |
| `AI_USE_MOCK` | Fuerza mock IA | — |
| `IA_URL` | Fallback legado: el código lee `AI_SERVICE_URL \|\| IA_URL` (compose ya inyecta `AI_SERVICE_URL`) | `http://localhost:8000` |
| `STORAGE_PATH` | Storage en disco local | `uploads` |

---

## Infraestructura (docker-compose.yml)

| Servicio | Imagen/puerto | Notas |
|----------|--------------|-------|
| postgres | `postgres:16` · 5432 | healthcheck; volumen `./init-scripts` **referenciado pero no existe** |
| redis | `redis:7` · 6379 | healthcheck; **en uso** por BullMQ (cola `cotizacion-pdfs`) |
| minio | 9000 / consola 9001 | healthcheck; buckets se crean lazy desde la API (`product-images`, `cotizacion-pdfs`) |
| api | `Dockerfile.dev` · 3001 | `AI_SERVICE_URL=http://ai-service:8000`; `PDF_ROLE=producer` (el worker corre aparte); `depends_on` con condition de healthcheck a redis y minio |
| pdf-worker | `Dockerfile.dev` · 3002 | `PDF_ROLE=consumer` · `dev:worker` (mismas dependencias que api; sólo expone `/health`) |
| web | 3000 | |
| ai-service | uvicorn · 8000 | FastAPI |

Volumenes: `postgres_data`, `redis_data`, `minio_data`.

---

## Scripts principales

```bash
pnpm install            # workspace completo
pnpm dev                # turbo: api + web en paralelo
pnpm dev:api            # solo NestJS :3001
pnpm dev:web            # solo Next :3000
pnpm build              # build turbo de todos
pnpm lint               # eslint (flat config en apps/api y apps/web)
pnpm typecheck          # tsc de todos
pnpm test               # vitest — 112 specs (93 API + 19 web)
pnpm db:generate        # prisma generate
pnpm db:push            # sincronizar schema sin migración
pnpm db:migrate         # migración dev
pnpm db:studio          # Prisma Studio
pnpm docker:up          # compose up -d
pnpm docker:down        # compose down
pnpm docker:logs        # compose logs -f
```

Seed: `pnpm --filter=@goldcontinent/database db:seed`.

> **PDFs en dev local:** requieren Redis en `localhost:6379` (`docker compose up -d redis`).
> Sin Redis, los endpoints de PDF responden **503** con mensaje accionable (fail-fast de
> `PdfExportService`) y el FE aborta los fetch a los 15 s — no se cuelgan los spinners.

---

## Performance (medido)

- **Bundle producción** (`next build` + gzip de `apps/web/.next/static`): **417 KB gzip** en 44 chunks — top: 71.6 / 41.7 / 38.7 / 32.9 / 24.7 KB gz; CSS 84.6 KB raw. Sin librerías pesadas en FE (no hay charts/xlsx/moment/lodash/framer).
- **Carga real** (Puppeteer, dev server, 1440×900): login FCP 604 ms · load 989 ms; dashboard admin FCP 564 ms · **LCP 968 ms** · DCL 328 ms.
- Sin deuda pendiente: todas las imágenes pasan por `next/image` (`remotePatterns`), no hay componentes que exijan `next/dynamic`.

---

## Gaps y riesgos conocidos

| # | Gap | Impacto |
|---|-----|---------|
| 1 | ~~Sin RolesGuard en API~~ | **Resuelto:** `RolesGuard` por controller (junto a JWT) + `@Roles` en usuarios, categorías, almacenes, dashboard, config PUT |
| 2 | ~~helmet y rate-limit sin usar~~ | **Resuelto:** `helmet()` global; límite duro 20/15 min solo en `/api/auth/login` + `/api/auth/refresh` (no `/auth/me`), global `RATE_LIMIT_MAX` (default 300/15 min, configurable), CORS aplicado antes de los limiters |
| 3 | ~~Sin config ESLint~~ | **Resuelto:** flat config (`eslint.config.mjs`) en `apps/api` y `apps/web`; `pnpm lint` verde |
| 4 | ~~Sin tests~~ | **Resuelto:** 112 specs vitest — 93 API (44 cotizaciones + 14 PDF + 8 integración + 16 RBAC + 5 JWT + 6 rol PDF) + 19 FE (formatters, useDebounce, Button, Badge con jsdom/testing-library) |
| 5 | ~~Secrets con fallback~~ | **Resuelto:** `jwt.ts` sin fallback (throw si faltan); `load-env.ts` en API y dotenv en `next.config.mjs` |
| 6 | ~~Mismatch `IA_URL` vs `AI_SERVICE_URL`~~ | **Resuelto:** código lee `AI_SERVICE_URL \|\| IA_URL`; compose inyecta `AI_SERVICE_URL` |
| 7 | ~~`ai-service` fuera de pnpm~~ | **Resuelto:** `pnpm dev` lo orquesta (venv/PATH + sonda `:8000/health`) y `pnpm dev:ai` existe |
| 8 | ~~CI/CD stale~~ | **Resuelto:** `deploy.yml` reescrito + `fly-api.toml`/`fly-web.toml` (dos apps Fly) |
| 9 | ~~`init-scripts/` no existe~~ | **Resuelto:** volumen/dependencia muerta eliminada del compose |
| 10 | ~~Campos huérfanos~~ | **Resuelto:** `tiempo_fin` se escribe al pasar a `enviada` (KPI tiempo vivo); `fecha_vencimiento` la llena el asesor vía DTO (cobranza "vencida" operativa) |
| 11 | ~~Doble cliente API FE~~ | **Resuelto:** unificado en `lib/apiClient.ts` con refresh |
| 12 | ~~`console.log` en cliente API~~ | **Resuelto** |
| 13 | ~~Precios mock en consulta FE~~ | **Resuelto:** precios reales vía `/productos?include=precios` |
| 14 | ~~Models legacy de ventas en BD~~ | **Resuelto:** `Venta`/`VentaDetalle`/`VentaPago`/`CuentaCobrar` eliminados del schema; `db:push` aplicado |
| 15 | ~~Soft delete inconsistente~~ | **Resuelto:** los listados de usuarios filtran `deleted_at: null` |
| 16 | ~~Cola PDF acoplada al proceso API~~ | **Resuelto:** `PdfWorkerModule.forRoot()` registra `PdfProcessor` según `PDF_ROLE` (`producer`/`consumer`/`both`); entrypoint `pdf-worker.ts` (solo `/health`) + servicio `pdf-worker` en compose; API con `PDF_ROLE=producer` sólo encola |
| 17 | ~~Historial de migraciones desincronizado~~ | **Resuelto:** baseline `0_init` + `migrate deploy` aplicado |

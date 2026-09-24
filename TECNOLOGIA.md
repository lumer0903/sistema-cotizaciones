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
| Colas / Cache | Redis + BullMQ | Redis 7 (sin uso activo) |
| Storage | MinIO (S3) + storage local | MinIO (buckets `product-images`, `cotizacion-pdfs`) |
| Auth | JWT (access+refresh) + cookies httpOnly + Passport | passport-jwt 4 |
| Validación BE | class-validator + class-transformer (+ zod disponible) | |
| Validación FE | react-hook-form + zod + @hookform/resolvers | |
| Estado FE | Zustand (persist) · Context (auth) | Zustand 5 |
| Estilos | Tailwind CSS v4 | ^4.3 |
| Iconos | lucide-react | |
| Toasts | sonner | |
| PDF | pdfkit | 0.18 |
| Docs API | @nestjs/swagger + **Scalar** (`/reference`) | |
| Node | ≥ 20 | engines |

---

## Estructura de dependencias

### Raíz (`package.json` — `goldcontinent`)

- Scripts: `dev`, `dev:api`, `dev:web`, `dev:ai`*, `build`, `lint`, `typecheck`, `test`, `db:*`, `docker:*`
- devDeps: `turbo`, `typescript`
- deps: `clsx`, `tailwind-merge`

> `dev:ai` filtra `@goldcontinent/ai-service`, pero **ai-service no tiene package.json** → el script no resuelve nada (solo Docker).

### `apps/api` — `@goldcontinent/api`

**Runtime:** `@nestjs/{common,core,config,platform-express,jwt,passport,axios,bullmq,swagger}`, `@prisma/client`, `prisma`, `bullmq`, `passport` + `passport-jwt`, `bcryptjs`, `jsonwebtoken`, `class-validator`, `class-transformer`, `cookie-parser`, `cors`, `express` 5, `zod`, `pdfkit`, `minio`, `multer`, `pg`, `node-cron`*, `helmet`*, `express-rate-limit`*, `swagger-ui-express`, `@scalar/nestjs-api-reference`, `rxjs`, `reflect-metadata`, `dotenv`, `axios`.

\* Instalados pero sin imports en `src/`.

**devDeps:** `@nestjs/cli`, `@nestjs/testing`, `vitest`, `tsx`, `ts-node`, `typescript`, tipos varios.

**Scripts:** `dev` (nest start --watch), `build`, `start`, `lint` (eslint — **sin config**), `typecheck`, `test` (vitest run), `db:*`.

### `apps/web` — `@goldcontinent/web`

**Runtime:** `next`, `react`, `react-dom`, `@goldcontinent/shared`, `react-hook-form`, `@hookform/resolvers`, `zod`, `zustand`, `lucide-react`, `sonner`.

**devDeps:** `tailwindcss` v4 + `@tailwindcss/postcss`, `postcss`, `eslint` + `eslint-config-next` (**sin config efectiva**), tipos React/Node, `typescript`.

**Scripts:** `dev` (next dev -p 3000), `build`, `start`, `lint`, `typecheck`.

### `packages/shared` — `@goldcontinent/shared`

Tipos y contratos compartidos:

- `src/auth/` — RBAC (`rbac.ts`: `DEFAULT_ROLE_PERMISSIONS`, `puede()`), config JWT (`JWT_CONFIG`), tipos de usuario autenticado.
- `src/constants/` — enums (`Rol`, `EstadoCotizacion`, `TipoPrecio`, `TipoVenta`, `MetodoPago`, `OrigenMovimiento`, etc.).
- `src/schemas/` — schemas Zod.
- `src/types/` — tipos TS.

### `packages/database` — `@goldcontinent/database`

- `prisma/schema.prisma` — 20 modelos, 11 enums, extensión `pg_trgm`.
- `prisma/migrations/` — 1 migración (`20260909214305_initial_schema`).
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
| `JWT_SECRET` | Access token | `'dev-secret-change-in-production'` ⚠ |
| `JWT_REFRESH_SECRET` | Refresh token | `'change-me-refresh-secret'` ⚠ |
| `PORT` | Puerto API | `3001` |
| `CLIENT_URL` | CORS origin | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Base URL del front | `http://localhost:3001` |
| `REDIS_HOST` / `REDIS_PORT` | BullMQ | `localhost` / `6379` |
| `MINIO_*` + `MINIO_ENABLED` | Object storage | fallback placeholder si false |
| `AI_SERVICE_URL` | URL FastAPI (código API) | `http://localhost:8000` |
| `AI_USE_MOCK` | Fuerza mock IA | — |
| `IA_URL` | Definida en compose (⚠ nombre distinto al que lee el código) | `http://ai-service:8000` |
| `STORAGE_PATH` | Storage en disco local | `uploads` |

---

## Infraestructura (docker-compose.yml)

| Servicio | Imagen/puerto | Notas |
|----------|--------------|-------|
| postgres | `postgres:16` · 5432 | healthcheck; volumen `./init-scripts` **referenciado pero no existe** |
| redis | `redis:7` · 6379 | healthcheck; sin uso activo en la app |
| minio | 9000 / consola 9001 | healthcheck; buckets se crean lazy desde la API |
| api | `Dockerfile.dev` · 3001 | `IA_URL=http://ai-service:8000` |
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
pnpm typecheck          # tsc de todos
pnpm db:generate        # prisma generate
pnpm db:push            # sincronizar schema sin migración
pnpm db:migrate         # migración dev
pnpm db:studio          # Prisma Studio
pnpm docker:up          # compose up -d
pnpm docker:down        # compose down
pnpm docker:logs        # compose logs -f
```

Seed: `pnpm --filter=@goldcontinent/database db:seed`.

---

## Gaps y riesgos conocidos

| # | Gap | Impacto |
|---|-----|---------|
| 1 | ~~Sin RolesGuard en API~~ | **Resuelto:** `RolesGuard` por controller (junto a JWT) + `@Roles` en usuarios, categorías, almacenes, dashboard, config PUT |
| 2 | **helmet y rate-limit sin usar** | Sin headers de seguridad ni throttling |
| 3 | **Sin config ESLint** en el repo | `pnpm lint` no puede funcionar bien |
| 4 | **Sin tests** (vitest vacío) | Sin red de seguridad |
| 5 | **Secrets con fallback** | Riesgo si se despliega sin `.env` |
| 6 | **Mismatch `IA_URL` vs `AI_SERVICE_URL`** | API puede quedar en modo mock |
| 7 | **`ai-service` fuera de pnpm** | `dev:ai` no funciona |
| 8 | **CI/CD stale** (`fly.toml`, `deploy.yml` → `Gold_back/`) | Deploy roto si se usa |
| 9 | **`init-scripts/` no existe** | compose puede fallar o ignorar volumen |
| 10 | **Campos huérfanos** (`fecha_vencimiento`, `tiempo_fin`) | Cobranza "vencida" y KPI tiempo muertos |
| 11 | ~~Doble cliente API FE~~ | **Resuelto:** unificado en `lib/apiClient.ts` con refresh |
| 12 | ~~`console.log` en cliente API~~ | **Resuelto** |
| 13 | ~~Precios mock en consulta FE~~ | **Resuelto:** precios reales vía `/productos?include=precios` |
| 14 | **Models legacy de ventas en BD** | Esquema con tablas muertas |
| 15 | **Soft delete inconsistente** | Usuarios eliminados siguen listados |

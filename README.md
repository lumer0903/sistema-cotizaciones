# Gold Continent — Sistema de Cotizaciones

> Sistema web para floristería: cotizaciones con recomendaciones de IA, inventario multialmacén, catálogo de productos con precios duales y cobranza.

---

## De qué trata el sistema

**Gold Continent** permite a un equipo comercial crear y gestionar cotizaciones de flores y arreglos, con:

- **Cotizaciones** con ciclo de vida completo (`borrador → enviada → aprobada/parcialmente_pagada/rechazada`), numeración correlativa `COT-001`, pagos parciales y exportación a PDF.
- **Recomendaciones IA** por ítem (Similar / Upsell / Equilibrio) usando un microservicio Python con TF-IDF.
- **Inventario multialmacén** con kardex, transferencias, alertas de stock mínimo y auditoría de movimientos.
- **Catálogo de productos** con 6 precios por artículo (normal/distribuidor × unidad/docena/mayor) e historial de cambios de precio.
- **Cobranza** sobre cotizaciones aprobadas con abonos y estados (pendiente/parcial/pagada).
- **Dashboard** con KPIs de conversión, efectividad de IA y alertas.
- **Roles:** `admin`, `gerente`, `vendedor` con panel separado (`/admin/*` y `/vendedor/*`).

---

## Stack tecnológico

| Capa | Tech |
|------|------|
| Frontend | Next.js 16 · React 19 · Tailwind v4 · Zustand · react-hook-form + zod |
| Backend | NestJS 11 · Prisma 5 · JWT (cookies httpOnly + Bearer) |
| Base de datos | PostgreSQL 16 |
| IA | FastAPI · scikit-learn (TF-IDF + cosine similarity) |
| Infra | Docker Compose · Redis · MinIO · pnpm + Turborepo |

Detalle completo en **[TECNOLOGIA.md](./TECNOLOGIA.md)**.

---

## Estructura del monorepo

```
sistema-cotizaciones/
├── apps/
│   ├── api/          # NestJS — API REST (puerto 3001, prefijo /api)
│   ├── web/          # Next.js — Frontend (puerto 3000)
│   └── ai-service/   # FastAPI — Recomendaciones IA (puerto 8000)
├── packages/
│   ├── shared/       # Enums, tipos, schemas Zod, RBAC
│   └── database/     # Prisma schema, migraciones, seed
└── docker-compose.yml
```

---

## Cómo levantar el sistema

### Opción A — Docker (recomendado)

```bash
pnpm docker:up      # postgres + redis + minio + api + web + ai-service
```

### Opción B — Desarrollo local

```bash
pnpm install
pnpm docker:up      # solo infra: postgres, redis, minio

# Terminal 1 — base de datos
pnpm db:generate
pnpm db:push        # o pnpm db:migrate
pnpm db:seed

# Terminal 2 — backend
pnpm dev:api        # http://localhost:3001  (docs: /reference)

# Terminal 3 — frontend
pnpm dev:web        # http://localhost:3000

# IA (solo vía docker o uvicorn manual en :8000)
```

### Credenciales del seed

- Email: `admin@goldcontinent.com` (rol `admin`) — ver `packages/database/prisma/seed.ts` para la contraseña demo.

### URLs útiles

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api |
| Docs API (Scalar) | http://localhost:3001/reference |
| IA | http://localhost:8000 |
| MinIO console | http://localhost:9001 |

---

## Documentación del sistema

| Documento | Contenido |
|-----------|-----------|
| **[ENDPOINTS.md](./ENDPOINTS.md)** | Los 56 endpoints: método, ruta, auth, query/body, config global del API |
| **[MODULOS.md](./MODULOS.md)** | Qué hace cada módulo backend y feature frontend |
| **[ARQUITECTURA.md](./ARQUITECTURA.md)** | Monorepo, patrón híbrido DDD/plano, flujo de auth, protección de rutas, diagramas |
| **[TECNOLOGIA.md](./TECNOLOGIA.md)** | Stack, dependencias, env vars, scripts, docker, gaps conocidos |
| **[COMPONENTES.md](./COMPONENTES.md)** | Componentes UI, layouts, páginas, features, hooks y stores del frontend |

---

## Flujos principales

### Login y sesión

1. `POST /api/auth/login` → cookies httpOnly `accessToken` (15 min) + `refreshToken` (7 días).
2. Frontend: middleware (edge) + `ProtectedRoute` + RBAC client-side.
3. Refresh automático o limpieza de sesión ante 401 (dos clientes API, comportamiento distinto — ver ARQUITECTURA).

### Cotización

1. Vendedor/admin crea cotización con cliente + detalle de productos (puede invocar **✨ Recomendar IA** por ítem).
2. Estados: `borrador` (editable) → `enviada` → `aprobada` / `parcialmente_pagada` / `rechazada`.
3. Pagos/abonos desde cotización o módulo cobranza; exportación PDF en cualquier momento.

### Inventario

1. Movimientos (entrada/salida/ajuste) y transferencias entre almacenes actualizan `stock_actual` + kardex.
2. Alertas de stock mínimo → campana en `AdminLayout` (polling).

---

## Comandos útiles

```bash
pnpm dev              # api + web en paralelo (turbo)
pnpm build            # build completo
pnpm typecheck        # verificación de tipos
pnpm db:studio        # Prisma Studio
pnpm docker:logs      # logs del compose
```

---

## Estado y deudas (resumen)

**Módulos frontend al 100% (sin cambios salvo bugs):**
- **Inventario** — CRUD, movimientos, transferencias, kardex, alertas, Ficha Técnica con chips de color reales (`resolveColorHex`), `ColorConfigModal` con lista vacía en producto nuevo y botón Guardar dinámico.
- **Precios / Historial** — consulta con precios reales del backend, `HistorialPrecioModal` con `Table*` unificado.

**Globales ya unificados:** `Table.tsx` (todas las tablas del sistema), `Pagination` (opciones `[8,16,24,32,48,64]`, default `8`), `Select` (portal + flatten de options).

El resto del sistema está operativo en auth, productos, cotizaciones, cobranza y dashboard, con deudas documentadas en **TECNOLOGIA.md** y **ARQUITECTURA.md**:

- Sin `RolesGuard` en el backend (roles solo en frontend).
- `helmet`, rate-limit, ESLint y tests: instalados/configurados pero sin implementar.
- Módulos sin uso: `configuracion` (sin controller), Redis/BullMQ (sin colas), cron (sin jobs).
- Código legado: controller auth Express huérfano, `registrarPago` duplicado, tablas de ventas legacy en BD.
- KPIs/campos muertos: `fecha_vencimiento`, `tiempo_fin` (leídos, nunca escritos).

# Gold Continent - Documentación Completa del Proyecto

## Resumen del Proyecto
Sistema de cotizaciones con recomendaciones IA (TF-IDF + Cosine Similarity) para empresa real. Timeline: 2-3 semanas. Stack: Node.js/Express + React (Next.js) + PostgreSQL/Prisma + Python/Flask (IA).

---

## Estado Inicial del Código

### Backend (Gold_back/)
- **Prisma Schema** completo: Usuario, Producto, Categoria, PreciosActuales, HistorialPrecios, Cliente, Cotizacion, CotizacionDetalle, IaInteracciones
- **Auth**: JWT + bcrypt + roles (admin, gerente, vendedor) con permisos granulares
- **Productos**: CRUD + importación CSV masiva + historial precios
- **Cotizaciones**: Máquina de estados (borrador→enviada→aprobada/rechazada) + PDF (pdfkit)
- **Dashboard**: Métricas diferenciadas por rol
- **IA Microservicio** (ia/recomendador.py): Flask + TF-IDF + cosine similarity en español

### Frontend Empleado (Empleado-front/)
- Dashboard, Catálogo, Consulta precios, Cotizaciones (listar, crear, detalle con IA integrada)

### Frontend Admin (Admin-front/)
- Dashboard, Inventario (CRUD + CSV), Consulta precios, Usuarios (CRUD + matriz permisos), Historial cotizaciones

---

## Gaps Críticos Identificados

### 1. Módulo Inventario Movimientos (FALTA COMPLETO)
- Modelo `InventarioMovimiento` (entrada/salida/ajuste/transferencia entre almacenes)
- Kardex/Historial por producto con saldo running
- Alertas stock mínimo automáticas
- UI Admin + Empleado

### 2. Seguridad Hardening (OBLIGATORIO PRODUCCIÓN)
| Vulnerabilidad | Solución |
|---|---|
| JWT_SECRET default débil | Secreto 256-bit + rotación + refresh tokens (15m/7d httpOnly cookie) |
| Sin rate limiting | express-rate-limit (auth: 10/min, api: 100/min) |
| Sin headers seguridad | helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| Sin política contraseñas | Mín 8 chars, mayús, minús, num, especial, bcrypt cost=12 |
| Sin auditLog | Tabla + middleware automático (user, action, resource, ip, timestamp) |
| Sin sanitización XSS | DOMPurify server-side |
| CORS permisivo | Orígenes exactos únicamente |

### 3. IA Recomendador - Mejora Central de Tesis
| Actual | Objetivo |
|---|---|
| TF-IDF on-demand (lento, recalcula cada request) | Cache vectorizador (joblib) + precálculo nocturno (cron 3AM) |
| Solo TF-IDF | **Hybrid**: TF-IDF (0.5) + SBERT embeddings (0.5) + faiss index |
| Sin feedback | Tabla `ia_feedback` + reentrenamiento semanal ponderado |
| Sin métricas | Precision@5, Recall@5, NDCG + A/B test endpoint |
| Sin explicabilidad | Mostrar términos comunes + score breakdown |

### 4. Infraestructura Producción (FALTA TODO)
- Docker + docker-compose (dev + prod multi-stage)
- CI/CD básico (GitHub Actions: lint→test→build)
- Proveedor email (Nodemailer) para envío cotizaciones
- Observabilidad (pino logs, health checks, Prometheus)
- Export CSV + Swagger/OpenAPI
- SSL/HTTPS + dominio

---

## Plan de Acción 14 Días

### SEMANA 1: Fundamentos + Inventario
| Día | Tarea |
|-----|-------|
| 1-2 | Seguridad hardening completo |
| 3 | Docker + docker-compose + .env validation |
| 4-5 | Modelo InventarioMovimiento + Kardex + alertas stock + UI Admin/Empleado |
| 6-7 | Tests paths críticos + CI básico + Cache TF-IDF (joblib) + precálculo nocturno |

### SEMANA 2: IA Avanzada + Pulido Producción
| Día | Tarea |
|-----|-------|
| 8-9 | Hybrid Recommender (TF-IDF + SBERT + faiss) + feedback loop |
| 10 | Métricas IA (Precision@5, Recall@5, NDCG) + Dashboard Admin + A/B test |
| 11 | Email cotizaciones (Nodemailer + PDF + tracking) |
| 12 | Export CSV + Swagger/OpenAPI |
| 13 | Observabilidad (logs, health, métricas) + Toasts/Skeletons |
| 14 | Smoke tests + docs mínimas + entrega tesis |

---

## Decisiones de Infraestructura (Costo $0)

### Hosting: Fly.io
- **Por qué**: No duerme, Docker nativo, PostgreSQL opcional, SSL automático, $0 free tier (3 VMs shared-cpu-1x, 3GB vol, 160GB BW/mes)
- **App principal**: `sistema-cotizaciones` (región dfw)
- **Admin**: `goldcontinent-admin`
- **Empleado**: `goldcontinent-empleado`

### Base de Datos: Neon.tech
- PostgreSQL serverless gratis (0.5 GB storage, 1 proyecto)
- Connection pooling incluido
- URL: `${DATABASE_URL}` (configurar en Fly secrets)

### Email: Brevo (ex Sendinblue)
- 300 emails/día gratis para siempre
- API Key: `${BREVO_API_KEY}` (configurar en Fly secrets)
- Sender: `noreply@sistema-cotizaciones.fly.dev`

### Redis: NO necesario para MVP
- Cache IA: archivos `.joblib` + `.npy` en disco
- Rate limiting: `express-rate-limit` con memory store
- Sesiones: JWT stateless (ya implementado)

---

## Configuración de Secrets (Fly.io)

```bash
# DATABASE_URL (Neon pooled connection)
fly secrets set DATABASE_URL="${DATABASE_URL}"

# JWT Secrets (generados con openssl rand -base64 32)
fly secrets set JWT_SECRET="${JWT_SECRET}"
fly secrets set JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"

# CORS
fly secrets set CORS_ORIGIN="https://sistema-cotizaciones.fly.dev"

# Brevo Email
fly secrets set BREVO_API_KEY="${BREVO_API_KEY}"
fly secrets set BREVO_SENDER="noreply@sistema-cotizaciones.fly.dev"

# IA Service (interno mismo contenedor)
fly secrets set IA_URL="http://localhost:5000"
```

---

## Despliegues Realizados

### 1. Backend API - `sistema-cotizaciones`
- **URL**: https://sistema-cotizaciones.fly.dev
- **Health Check**: https://sistema-cotizaciones.fly.dev/api/health → 200 OK
- **Dockerfile**: Multi-stage (node:20-slim + python3 + scikit-learn via apt)
- **Prisma**: binaryTargets = ["native", "debian-openssl-3.0.x"]
- **IA Service**: Flask en puerto 5000 interno (concurrently)
- **Puerto**: 3000 (bind 0.0.0.0)

### 2. Admin Frontend - `goldcontinent-admin`
- **URL**: https://goldcontinent-admin.fly.dev
- **Next.js 16** con Turbopack
- **Dockerfile**: Multi-stage builder/runner
- **Puerto**: 3001

### 3. Empleado Frontend - `goldcontinent-empleado`
- **URL**: https://goldcontinent-empleado.fly.dev
- **Next.js 16** con Turbopack
- **Dockerfile**: Multi-stage builder/runner
- **Puerto**: 3002 (configurado en package.json "start": "next start -p 3002")
- **Fly.toml**: internal_port = 3002

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────┐
│                        Fly.io (dfw)                             │
├──────────────────┬──────────────────────┬──────────────────────┤
│  sistema-        │  goldcontinent-      │  goldcontinent-      │
│  cotizaciones    │  admin               │  empleado            │
│  (Backend API)   │  (Admin Frontend)    │  (Empleado Frontend) │
│  Puerto 3000     │  Puerto 3001         │  Puerto 3002         │
│  + IA Flask 5000 │                      │                      │
└────────┬─────────┴──────────┬───────────┴──────────┬───────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   Neon.tech      │ │   Brevo Email    │ │   Usuario Final  │
│   PostgreSQL     │ │   (300/día)      │ │   (Navegador)    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Endpoints Principales

### Backend API
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/health | Health check |
| POST | /api/auth/login | Login |
| GET | /api/productos | Listar productos |
| POST | /api/productos/importar | Importar CSV |
| GET | /api/cotizaciones | Listar cotizaciones |
| POST | /api/cotizaciones | Crear cotización |
| GET | /api/cotizaciones/:id/pdf | Descargar PDF |
| GET | /api/cotizaciones/:id/recomendaciones/:idProducto | Recomendaciones IA |

### IA Microservicio (interno)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /recomendar | TF-IDF + Cosine Similarity |

---

## Variables de Entorno Frontends

### Admin-front / Empleado-front
```env
NEXT_PUBLIC_API_URL=https://sistema-cotizaciones.fly.dev
```

---

## Próximos Pasos para Tesis

### 1. IA Avanzada (Core de la tesis)
- [ ] Hybrid Recommender: TF-IDF (0.5) + SBERT embeddings (0.5)
- [ ] Cache joblib + precálculo nocturno (cron 3AM)
- [ ] Feedback loop: tabla `ia_feedback` + reentrenamiento semanal
- [ ] Métricas: Precision@5, Recall@5, NDCG@5
- [ ] A/B test endpoint
- [ ] Explicabilidad: términos comunes + score breakdown

### 2. Módulo Inventario Movimientos
- [ ] Modelo InventarioMovimiento (entrada/salida/ajuste/transferencia)
- [ ] Kardex con saldo running
- [ ] Alertas stock mínimo automáticas
- [ ] UI Admin + Empleado

### 3. Seguridad Hardening
- [ ] Refresh tokens + httpOnly cookies
- [ ] Rate limiting
- [ ] Helmet.js
- [ ] AuditLog middleware
- [ ] Password policy
- [ ] DOMPurify server-side

### 4. Observabilidad
- [ ] Pino logs estructurados
- [ ] Health checks detallados
- [ ] Métricas Prometheus
- [ ] GitHub Actions CI/CD

---

## Comandos Útiles

```bash
# Generar secretos JWT
openssl rand -base64 32

# Deploy backend
flyctl deploy --remote-only -a sistema-cotizaciones

# Deploy admin
flyctl deploy --remote-only -a goldcontinent-admin

# Deploy empleado
flyctl deploy --remote-only -a goldcontinent-empleado

# Ver logs
flyctl logs -a sistema-cotizaciones

# SSH a máquina
flyctl ssh console -a sistema-cotizaciones

# Migraciones Prisma
flyctl ssh console -C "npx prisma migrate deploy" -a sistema-cotizaciones

# Ver secrets
flyctl secrets list -a sistema-cotizaciones
```

---

## Estructura del Repositorio

```
goldcontinent/
├── Gold_back/                 # Backend API
│   ├── src/
│   │   ├── app.js            # Entry point Express
│   │   ├── config/prisma.js
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── services/
│   ├── prisma/schema.prisma
│   ├── Dockerfile
│   ├── fly.toml
│   └── package.json
├── ia/                        # IA Microservicio
│   ├── recomendador.py       # Flask + TF-IDF
│   └── requirements.txt
├── Admin-front/               # Admin Frontend
│   ├── src/
│   ├── Dockerfile
│   ├── fly.toml
│   └── package.json
├── Empleado-front/            # Empleado Frontend
│   ├── src/
│   ├── Dockerfile
│   ├── fly.toml
│   └── package.json
├── .github/workflows/         # CI/CD
├── fly.toml                   # Backend config
├── .dockerignore
└── PROJECT_CONTEXT.md         # Este archivo
```

---

## Notas para la Tesis

### Métricas a Reportar
1. **Performance IA**: Latencia P50/P95 <50ms, throughput
2. **Calidad recomendaciones**: Precision@5, Recall@5, NDCG@5 vs baseline TF-IDF
3. **Adopción usuario**: % cotizaciones con ≥1 producto IA aceptado
4. **Impacto negocio**: Ticket promedio, tiempo cotización, conversión
5. **Seguridad**: 0 vulnerabilidades críticas/altas en OWASP ZAP scan

### Estructura Documento Tesis Sugerida
1. Introducción + Problema + Objetivos
2. Estado del Arte (Recommender Systems, TF-IDF, Embeddings, Hybrid)
3. Arquitectura del Sistema (Diagrama + Stack)
4. Diseño BD + API + Seguridad
5. Motor de Recomendaciones (Algoritmo + Cache + Feedback Loop)
6. Implementación (Módulos clave + Capturas)
7. Evaluación (Métricas offline + Online A/B + Encuesta usuarios)
8. Conclusiones + Trabajo Futuro

---

## URLs de Producción

| Servicio | URL |
|----------|-----|
| Backend API | https://sistema-cotizaciones.fly.dev |
| Health Check | https://sistema-cotizaciones.fly.dev/api/health |
| Admin Frontend | https://goldcontinent-admin.fly.dev |
| Empleado Frontend | https://goldcontinent-empleado.fly.dev |
| Neon Console | https://console.neon.tech |
| Fly Dashboard | https://fly.io/dashboard |
| Brevo Dashboard | https://app.brevo.com |

---

*Documento actualizado: 30/08/2026 - Deploy completado en Fly.io*
# Gold Continent - Contexto Completo del Proyecto de Tesis

## Resumen Ejecutivo
Sistema de cotizaciones con recomendaciones IA (TF-IDF + Cosine Similarity) para empresa real. Timeline: 2-3 semanas. Stack: Node.js/Express + React (Next.js) + PostgreSQL/Prisma + Python/Flask (IA).

---

## Estado Actual del Código

### Backend (Gold_back/)
- Prisma Schema completo: Usuario, Producto, Categoria, PreciosActuales, HistorialPrecios, Cliente, Cotizacion, CotizacionDetalle, IaInteracciones
- Auth: JWT + bcrypt + roles (admin, gerente, vendedor) con permisos granulares
- Productos: CRUD + importación CSV masiva + historial precios
- Cotizaciones: Máquina de estados (borrador->enviada->aprobada/rechazada) + PDF (pdfkit)
- Dashboard: Métricas diferenciadas por rol
- IA Microservicio (ia/recomendador.py): Flask + TF-IDF + cosine similarity en español

### Frontend Empleado (Empleado-front/)
- Dashboard, Catálogo, Consulta precios, Cotizaciones (listar, crear, detalle con IA integrada)

### Frontend Admin (Admin-front/)
- Dashboard, Inventario (CRUD + CSV), Consulta precios, Usuarios (CRUD + matriz permisos), Historial cotizaciones

---

## Gaps Críticos Identificados

### 1. Módulo Inventario Movimientos (FALTA COMPLETO)
- Modelo InventarioMovimiento (entrada/salida/ajuste/transferencia entre almacenes)
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
| Solo TF-IDF | Hybrid: TF-IDF (0.5) + SBERT embeddings (0.5) + faiss index |
| Sin feedback | Tabla ia_feedback + reentrenamiento semanal ponderado |
| Sin métricas | Precision@5, Recall@5, NDCG + A/B test endpoint |
| Sin explicabilidad | Mostrar términos comunes + score breakdown |

### 4. Infraestructura Producción (FALTA TODO)
- Docker + docker-compose (dev + prod multi-stage)
- CI/CD básico (GitHub Actions: lint->test->build)
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
| 10 | Métricas IA + Dashboard Admin + A/B test |
| 11 | Email cotizaciones (Nodemailer + PDF + tracking) |
| 12 | Export CSV + Swagger/OpenAPI |
| 13 | Observabilidad (logs, health, métricas) + Toasts/Skeletons |
| 14 | Deploy staging + smoke tests + docs mínimas |

---

## Preguntas de Infraestructura Pendientes

### 1. Servidor/Hosting
- Opciones gratuitas/baratas para empezar:
  - Railway.app - /mes, PostgreSQL incluido, Docker nativo, SSL automático
  - Render.com - Free tier (se duerme 15min inactividad), PostgreSQL gratis 90 días
  - Fly.io - Free allowance, PostgreSQL, Docker, SSL
  - VPS barato (DigitalOcean /mes, Hetzner 4€/mes) - más control, más trabajo

### 2. Proveedor Email (Nodemailer)
| Opción | Gratis | Facilidad | Producción |
|--------|--------|-----------|------------|
| Gmail SMTP | 500/día | 5 estrellas | Solo testing |
| Brevo (ex Sendinblue) | 300/día | 4 estrellas | Bueno |
| Mailgun | 1000/mes (3 meses) | 3 estrellas | Bueno |
| Resend | 3000/mes | 5 estrellas | Excelente |
| AWS SES | 62000/mes (si EC2) | 2 estrellas | Enterprise |

Recomendación: Resend (gratis generoso, API simple, buena deliverability) o Brevo.

### 3. Redis - ¿Qué es y ¿Lo necesito?
Redis = Base de datos en memoria ultra-rápida (key-value). Sirve para:
- Cache (vectorizadores IA, sesiones, rate limiting)
- Colas de trabajos (bullmq) - emails async, precálculo IA
- Pub/Sub para notificaciones tiempo real

Para tu timeline (2-3 sem): NO es obligatorio
- Cache IA: usar archivos .joblib + .npy en disco (funciona bien <10k productos)
- Rate limiting: express-rate-limit con memory store (reinicia en deploy, aceptable)
- Sesiones: JWT stateless (ya lo tienes)

Añadir Redis después si necesitas escalar.

### 4. Dominio + SSL
- Gratis: Freenom (.tk, .ml, .ga) - poco profesional
- Barato: Namecheap, Porkbun ~/año (.com, .dev)
- SSL: Let's Encrypt (automático en Railway/Render/Fly/Caddy/Traefik)

---

## Decisiones Técnicas Clave

### IA Stack Adicional (Semana 2)
pip install sentence-transformers faiss-cpu joblib
- Modelo: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dims, rápido, buen español)
- faiss-cpu para búsqueda vectorial aproximada (ANN)

### Estructura Docker (Multi-stage)
`dockerfile
# Backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
CMD ["node", "dist/index.js"]
`

### Variables Entorno Críticas (.env.production)
`env
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
JWT_SECRET=<openssl rand -base64 32>  # 256-bit
JWT_REFRESH_SECRET=<openssl rand -base64 32>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=https://tu-dominio.com
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxx
EMAIL_FROM=Cotizaciones Gold Continent <noreply@tu-dominio.com>
IA_URL=http://ia:5000  # interno docker network
NODE_ENV=production
PORT=3000
`

---

## Comandos Útiles para Continuar

`ash
# Generar secreto JWT seguro
openssl rand -base64 32

# Verificar schema Prisma
cd Gold_back && npx prisma validate && npx prisma db push

# Test IA local
cd ia && python recomendador.py

# Build frontend
cd Admin-front && npm run build
cd Empleado-front && npm run build

# Docker compose local
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
`

---

## Próximos Pasos Inmediatos (Cuando inicies nueva conversación)

1. Elegir hosting (recomiendo Railway.app por simplicidad + PostgreSQL + Docker + SSL gratis)
2. Crear cuenta Resend.com para email (gratis 3000/mes)
3. Comprar dominio (.dev en Porkbun/Namecheap ~/año)
4. Iniciar Semana 1 Día 1: Seguridad Hardening
   - Implementar refresh tokens + httpOnly cookies
   - Rate limiting + helmet + auditLog + password policy + sanitización
   - Tests de auth

---

## Archivos Clave a Revisar/Modificar

### Backend
- Gold_back/src/middlewares/auth.middleware.js -> Refresh tokens
- Gold_back/src/middlewares/rateLimiter.middleware.js -> Nuevo
- Gold_back/src/middlewares/audit.middleware.js -> Nuevo
- Gold_back/src/services/ia.service.js -> Hybrid recommender
- Gold_back/prisma/schema.prisma -> + InventarioMovimiento + IaFeedback
- Gold_back/Dockerfile + docker-compose.yml -> Nuevo

### IA
- ia/recomendador.py -> Hybrid TF-IDF + SBERT + faiss + cache joblib
- ia/precompute.py -> Script nocturno (cron)
- ia/requirements.txt -> + sentence-transformers, faiss-cpu, joblib

### Frontend Admin
- Admin-front/src/presentation/pages/MovementsPage.jsx -> Nuevo
- Admin-front/src/presentation/pages/InventoryDashboard.jsx -> Alertas stock

### Frontend Empleado
- Empleado-front/src/presentation/pages/DashboardPage.jsx -> + Alertas stock

---

## Notas para la Tesis (Documentar)

### Métricas a Reportar
1. Performance IA: Latencia P50/P95 <50ms, throughput
2. Calidad recomendaciones: Precision@5, Recall@5, NDCG@5 vs baseline TF-IDF
3. Adoctrinamiento usuario: % cotizaciones con >=1 producto IA aceptado
4. Impacto negocio: Ticket promedio, tiempo cotización, conversión
5. Seguridad: 0 vulnerabilidades críticas/altas en OWASP ZAP scan

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

## Contacto / Recursos
- Prisma Docs: https://www.prisma.io/docs
- Express Rate Limit: https://github.com/express-rate-limit/express-rate-limit
- Helmet: https://helmetjs.github.io/
- SBERT: https://www.sbert.net/
- Faiss: https://github.com/facebookresearch/faiss
- Resend: https://resend.com/docs
- Railway: https://railway.app/docs
- Docker Multi-stage: https://docs.docker.com/build/building/multi-stage/

---

*Documento generado automáticamente para continuidad entre sesiones. Actualizar conforme avance el proyecto.*

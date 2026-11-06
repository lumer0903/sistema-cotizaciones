# ===== Builder: monorepo pnpm (contexto = raíz del repo) =====
FROM node:20-slim AS builder

# unzip es obligatorio: la descarga de Chrome (Puppeteer) extrae un .zip
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.15.0

# Chrome de Puppeteer se descarga en `pnpm install`; la caché queda dentro
# del repo para copiarla al runner.
ENV PUPPETEER_CACHE_DIR=/repo/.puppeteer-cache

WORKDIR /repo

# Solo los manifestos primero (capa de cache de dependencias)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

COPY . .

# Prisma client antes de compilar (los types de @prisma/client son necesarios)
RUN pnpm --filter @goldcontinent/database db:generate
RUN pnpm --filter @goldcontinent/shared build
RUN pnpm --filter @goldcontinent/api build

# ===== Runner: producción =====
FROM node:20-slim AS runner

ENV NODE_ENV=production \
    PORT=3001 \
    PUPPETEER_CACHE_DIR=/repo/.puppeteer-cache

# Dependencias de sistema de Chromium (Puppeteer) y fuentes para PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-6 \
    libxcb1 \
    libxext6 \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.15.0

WORKDIR /repo
COPY --from=builder /repo /repo

EXPOSE 3001

# Migraciones idempotentes en cada arranque y luego el API
CMD ["sh", "-c", "pnpm --filter @goldcontinent/database db:migrate:deploy && pnpm --filter @goldcontinent/api start"]

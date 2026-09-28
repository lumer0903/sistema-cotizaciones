# ===== Builder: monorepo pnpm (contexto = raíz del repo) =====
FROM node:20-slim AS builder

# unzip: el install del workspace incluye Puppeteer (descarga de Chrome)
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.15.0

WORKDIR /repo

# NEXT_PUBLIC_API_URL se inyecta en build (queda embebido en el bundle del
# cliente y en las rewrites del servidor standalone).
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

COPY . .

# @goldcontinent/shared importa tipos de @prisma/client
RUN pnpm --filter @goldcontinent/database db:generate
RUN pnpm --filter @goldcontinent/shared build
RUN pnpm --filter @goldcontinent/web build

# ===== Runner: Next.js standalone =====
FROM node:20-slim AS runner

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]

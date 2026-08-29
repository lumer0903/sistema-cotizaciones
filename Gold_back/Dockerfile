# ===== BUILDER =====
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY Gold_back/package*.json ./
COPY Gold_back/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY Gold_back/ .

# Generate Prisma Client
RUN pnpm exec prisma generate

# ===== RUNNER =====
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Python and pip for IA service + scikit-learn pre-compilado via apk
RUN apk add --no-cache python3 py3-pip py3-scikit-learn

# Copy node_modules and built files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/index.js ./
COPY --from=builder /app/package.json ./

# Install IA dependencies
COPY ia/requirements.txt ./ia/
RUN pip install --no-cache-dir --break-system-packages -r ia/requirements.txt
COPY ia/ ./ia/

# Install concurrently for running both services
RUN npm install -g concurrently

EXPOSE 3000 5000

CMD ["npm", "run", "start:prod"]
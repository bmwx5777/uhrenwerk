# syntax=docker/dockerfile:1

# ---------------------------------------------------------------
# Зависимости
# ---------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------
# Сборка. Этот же слой используется для миграций и служебных
# скриптов (target: builder) — в нём есть drizzle-kit и tsx.
# ---------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* вшиваются в код при сборке, поэтому домен нужен уже здесь.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Серверные переменные проверяются схемой при импорте модулей. Во время
# сборки настоящей базы и секрета нет — подставляем заглушки, которые
# проходят проверку. В итоговый образ они не попадают.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    BETTER_AUTH_SECRET="build-time-placeholder-not-a-real-secret-000" \
    npm run build

# ---------------------------------------------------------------
# Рабочий образ: только standalone-сервер и статика.
# ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Каталог под том с загруженными фото должен принадлежать nextjs,
# иначе запись из админки упадёт с EACCES.
RUN mkdir -p public/uploads/products && chown -R nextjs:nodejs public/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# syntax=docker/dockerfile:1

# ---------- dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time values only. These are not secrets and are never used at runtime.
# Render supplies real values as runtime environment variables.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    DATABASE_URL="postgresql://build:build@localhost:5432/campusfind?schema=public" \
    SESSION_SECRET="build-time-only-not-a-secret-000000000000000000000000" \
    NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    NEXT_TELEMETRY_DISABLED=1 \
    UPLOAD_DIR=/app/.data/uploads

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/.data/uploads && chown -R node:node /app/.data

USER node

EXPOSE 3001

CMD ["npm", "start"]

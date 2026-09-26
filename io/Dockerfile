# syntax=docker/dockerfile:1
# Platyko Socket.IO duel service. Build context is the repo root (root .dockerignore applies):
#   docker build --platform linux/arm64 -f io/Dockerfile -t platyko-io .
# Same two-stage layout as backend/Dockerfile: scoped install + compile, then a production-only,
# non-root runtime image.

FROM node:22.23.3-bookworm-slim AS builder
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY io/package.json io/
COPY mobile/package.json mobile/
COPY packages/ packages/
RUN npm ci --workspace io --ignore-scripts \
  && npx prisma generate --schema packages/db/prisma \
  && npm run build:packages

COPY io/ io/
RUN npm --prefix io run build

FROM node:22.23.3-bookworm-slim AS runtime
ENV NODE_ENV=production NODE_CONFIG_ENV=production
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system platyko && useradd --system --gid platyko --home /repo --shell /usr/sbin/nologin platyko

COPY --from=builder /repo/package.json /repo/package-lock.json ./
COPY --from=builder /repo/backend/package.json backend/
COPY --from=builder /repo/io/package.json io/
COPY --from=builder /repo/mobile/package.json mobile/
COPY --from=builder /repo/packages/ packages/
RUN npm ci --workspace io --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /repo/node_modules/.prisma node_modules/.prisma
COPY --from=builder /repo/io/dist io/dist
COPY --from=builder /repo/io/config io/config
RUN cd io && node -e "require('socket.io'); require('@prisma/client')"

USER platyko
WORKDIR /repo/io
EXPOSE 4001
CMD ["node", "dist/index.js"]

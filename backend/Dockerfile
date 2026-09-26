# syntax=docker/dockerfile:1
# Platyko REST API. Build context is the repo root (root .dockerignore applies):
#   docker build --platform linux/arm64 -f backend/Dockerfile -t platyko-backend .
# Stage "builder" installs only the backend workspace (+ the shared packages it links), generates the
# Prisma client and compiles everything; it also serves the compose `migrate` tool (has the Prisma CLI).
# Stage "runtime" is a fresh production-only install run as a non-root user.

FROM node:22.23.3-bookworm-slim AS builder
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Manifests first so the dependency layer is cached until a lockfile changes.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY io/package.json io/
COPY mobile/package.json mobile/
COPY packages/ packages/
# --ignore-scripts keeps the mobile patch-package hook and Prisma's postinstall out of this image;
# the two native modules are then rebuilt from the prebuilt binaries bundled in their packages.
RUN npm ci --workspace backend --ignore-scripts \
  && npm rebuild bcrypt isolated-vm \
  && npx prisma generate --schema packages/db/prisma \
  && npm run build:packages

COPY backend/ backend/
RUN npm --prefix backend run build \
  && cd backend && node -e "require('bcrypt'); require('isolated-vm'); require('@prisma/client')"

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
RUN npm ci --workspace backend --omit=dev --ignore-scripts \
  && npm rebuild bcrypt isolated-vm \
  && npm cache clean --force
COPY --from=builder /repo/node_modules/.prisma node_modules/.prisma
COPY --from=builder /repo/backend/dist backend/dist
COPY --from=builder /repo/backend/config backend/config
RUN cd backend && node -e "require('bcrypt'); require('isolated-vm'); require('@prisma/client')"

USER platyko
WORKDIR /repo/backend
EXPOSE 4000
CMD ["node", "--no-node-snapshot", "dist/index.js"]

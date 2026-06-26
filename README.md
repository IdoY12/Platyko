# CodeQuest JS — code review guide

This document is a **human-readable map of the repository**: what each part does, how requests and data move through the system, and where to look when reviewing or changing behavior.

---

## What this project is

**CodeQuest JS** is a monorepo for a coding-learning and duel experience:

- **Mobile app** (Expo / React Native): lessons, exercises, profile, daily challenges, real-time duels.
- **REST backend** (Express): authentication, user profile, learning content APIs, duels metadata, and daily puzzles.
- **Realtime service** (Socket.IO): duel matchmaking and in-match events.
- **Shared packages**: database access (Prisma), JWT helpers, shared user credential limits/messages (`@project/user-credentials`), static puzzle/exercise data, and small server utilities (CORS, logging, env validation).

PostgreSQL is the primary datastore. Optional S3 (or LocalStack in Docker) supports assets such as avatar uploads.

---

## Architecture at a glance

```mermaid
flowchart LR
  subgraph client [Mobile app]
    RN[Expo / React Native]
  end
  subgraph api [REST API]
    BE[Express backend]
  end
  subgraph rt [Realtime]
    IO[Socket.IO service]
  end
  subgraph data [Data and libs]
    DB[(PostgreSQL)]
    PKG[@project packages]
  end
  RN -->|HTTPS JSON| BE
  RN -->|WebSocket| IO
  BE --> DB
  IO --> DB
  BE --> PKG
  IO --> PKG
```

- The **mobile** client talks to the **backend** over HTTP (see `mobile/src/config/network.ts` for `API_BASE_URL` and `mobile/src/services/auth-aware/` for axios-based API clients).
- The **mobile** client opens a **Socket.IO** connection to the **io** service for duels (see `mobile` code under duel/socket usage and `io/src/socket/duel/`).
- **backend** and **io** both use **`@project/db`** for Prisma and **`@project/auth-jwt`** where JWT verification is required.

---

## Repository layout (top level)

| Path | Role |
|------|------|
| `mobile/` | Expo app: UI, navigation, Redux, React Query, API client, duel UI. |
| `backend/` | Express REST API: routers, controllers, middlewares, config. |
| `io/` | Socket.IO server: duel namespace, session logic, handlers. |
| `packages/db/` | Prisma schema, migrations, DB URL injection, `connectDatabase`. |
| `packages/auth-jwt/` | Sign/verify access and refresh tokens (shared secret contract with backend/io). |
| `packages/server-kit/` | Shared server concerns: CORS resolution, structured logging, production security checks. |
| `packages/user-credentials/` | Shared username/email/password length constants and user-facing validation messages (backend + mobile). |
| `infra/` | Local infrastructure helpers (e.g. LocalStack S3 init). |
| `docker-compose.yml` | Postgres, LocalStack, backend, io — wired for local full-stack runs. |
| `patches/` | **`patch-package`** patches applied after `npm install` (see below). |

---

## End-to-end data flow

### 1. REST request (typical)

1. **Mobile** issues HTTP calls through axios instances from `mobile/src/services/auth-aware/AuthAware.ts` (subclasses like `UserService`): base URL from `API_BASE_URL` in `mobile/src/config/network.ts`, `Authorization` attached in an interceptor when a session access token exists.
2. **Request** hits **Express** in `backend/src/app.ts`: global middleware (Helmet, CORS, JSON body, request logging), then a mounted router under `/api/...`.
3. **Router** chains per-route middleware (rate limits where configured, optional JSON/query/param validation via `validateBody` / `validateQuery` / `validateParams` in `backend/src/middlewares/validateBody.ts` using Zod schemas in `backend/src/validators/`), then the **handler** under `backend/src/controllers/` for that route in `backend/src/routers/`.
4. **Auth** where required: `backend/src/middlewares/auth.ts` validates JWT using shared logic / `@project/auth-jwt`.
5. **Persistence**: handlers use **Prisma** via `@project/db` (`PrismaClient`) to read/write PostgreSQL.
6. **Response**: JSON body; errors are mapped to HTTP status codes and `{ error: ... }` shapes where applicable. The mobile client surfaces failures as axios errors for callers to catch (see interceptors in `mobile/src/services/auth-aware/AuthAware.ts`).

**When reviewing REST changes**, start at the router (what path and method, middleware order including validation), then the controller/handler (business rules; JSON bodies are already validated when `validateBody` is in the chain), then any Prisma queries (correct indexes, transactions, and user scoping).

### 2. Realtime duel flow (conceptual)

1. **Mobile** connects to the **io** service with Socket.IO (same JWT secret contract for auth handshakes as configured in io).
2. **io** attaches duel logic from `io/src/socket/duel/index.ts` and handlers under `io/src/socket/duel/handlers/` (e.g. queue, answers, session lifecycle in `session.ts`).
3. **io** uses **Prisma** for persistent duel-related data where needed, consistent with backend rules.

**When reviewing duel changes**, trace an event from the client emit name → server handler → session state updates → any DB writes → broadcasts back to clients.

### 3. Learning content and static packages

- Curriculum structure and server-driven learning APIs live in the **backend** (`backend/src/routers/learning.ts` and related controllers).
- Some content is **seeded** into the database from `backend/prisma/seed/` (orchestrated by `backend/prisma/seed/runMain.ts`). Typechecking for seed scripts is included via `backend/tsconfig.prisma.json`.
- Code puzzle content is stored in the **`CodePuzzle`** Prisma model, seeded from `backend/prisma/seed/codePuzzles.ts`.

---

## Backend: where logic lives

| Area | Location | What to look for |
|------|-----------|------------------|
| App composition | `backend/src/app.ts` | Middleware order, router mounts, global error handler. |
| Process entry | `backend/src/index.ts` | DB connect, HTTP server listen, env validation hooks. |
| HTTP routes | `backend/src/routers/*.ts` | Path prefixes match `app.ts` mounts (`/api/auth`, `/api/user`, etc.). |
| Request validation (Zod) | `backend/src/validators/*.ts` + `backend/src/middlewares/validateBody.ts` | Schemas live in `validators/`; routers call `validateBody` / `validateQuery` / `validateParams` before handlers. |
| Domain logic | `backend/src/controllers/` | Business rules and orchestration (validated request shapes arrive from middleware). |
| Auth | `backend/src/middlewares/auth.ts` | Token extraction and user attachment to `req`. |
| Logging | `backend/src/utils/logger.ts` | Correlation with `@project/server-kit` patterns where used. |
| Config | `backend/config/` | `config` npm package; `NODE_CONFIG_ENV` selects default vs compose vs production files. |

**Health check**: `GET /health` returns JSON `{ ok: true, service: "codequest-backend" }` (used by Docker).

---

## IO service: where logic lives

| Area | Location | What to look for |
|------|-----------|------------------|
| Entry | `io/src/index.ts` | HTTP server for `/health`, Socket.IO server, DB connect. |
| Duel namespace | `io/src/socket/duel/index.ts` | Namespace setup and registration. |
| Handlers | `io/src/socket/duel/handlers/` | Per-event validation and side effects. |
| Session | `io/src/socket/duel/session.ts` | In-memory or hybrid state — consistency with disconnects and timeouts. |

**Health check**: `GET /health` on the io port.

---

## Mobile app: where logic lives

| Area | Location | What to look for |
|------|-----------|------------------|
| Root UI | `mobile/src/components/app/App.tsx` | Redux `Provider`, shell layout. |
| Navigation / shell | `mobile/src/components/layout/AppShell/` | Tab/stack structure and feature entry. |
| API | `mobile/src/services/auth-aware/` (`AuthAware`, `UserService`, etc.) | Axios clients; shared interceptors for auth header and token refresh. |
| State | `mobile/src/redux/` | Global client state (e.g. profile, auth tokens). |
| Server state | React Query hooks under `mobile/src/hooks/` | Cache keys, stale times, and refetch on focus. |
| Theme | `mobile/src/theme/` | Shared spacing, typography tokens for consistent UI. |

Path alias: `@/*` → `mobile/src/*` (see `mobile/tsconfig.json`).

---

## Shared packages (review order)

1. **`packages/db`** — Schema (`packages/db/prisma/`), migrations, and exported `connectDatabase`. Wrong schema changes ripple through backend, io, and seeds.
2. **`packages/auth-jwt`** — Token shape and expiry constants; must stay aligned with backend auth routes and io verification.
3. **`packages/server-kit`** — CORS and security validation; changes affect both deployable servers.
4. **`packages/user-credentials`** — Length limits and messages consumed by backend `validators/` and the mobile app; keep backend Zod messages aligned with these strings.
5. **`packages/db`** migrations and `backend/prisma/seed/codePuzzles.ts` — code puzzle data lives in the DB; schema changes require a new migration and re-seed.

---

## Tooling and TypeScript notes

### Monorepo scripts (root `package.json`)

- `npm run db:generate` — Prisma client generation for `packages/db`.
- `npm run backend:build` / `npm run io:build` — Compile TypeScript to `dist/`.
- `npm run typecheck:all` — Typecheck **backend** (including prisma seed TS), **io**, **mobile**, and all `packages/*` workspaces.
- `npm run postinstall` — Runs **`patch-package`** to apply patches in `patches/`.

### React Native typings patch

The repo includes **`patches/react-native+0.81.5.patch`**, applied automatically via `patch-package`. It adjusts several core React Native `.d.ts` host components so that **TypeScript 5.9 + React 19 + `@types/react` ~19** accept JSX for `View`, `Text`, `ScrollView`, etc. Without this, `tsc --noEmit` in `mobile/` reports thousands of false-positive JSX errors. The runtime behavior of React Native is unchanged; only type declarations are adjusted.

If you upgrade **react-native**, re-run `npx patch-package react-native` after reconciling any conflicts, or remove the patch if upstream fixes land.

---

## Running locally

### TL;DR — 2 containers + 3 terminals

```bash
# One-time setup
npm install
docker compose up -d postgres localstack   # 2 containers: Postgres + LocalStack S3
npm run db:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed

# Then run each in its own terminal:
npm run backend:dev    # Terminal 1 — REST API (port 4000)
npm run io:dev         # Terminal 2 — Socket.IO realtime (port 4001)
npm run mobile:start   # Terminal 3 — Expo / Metro
```

### Prerequisites

- Node.js (see `react-native` / `expo` docs for recommended version; engine hints may appear in package metadata).
- PostgreSQL (or Docker).
- For full stack with S3-compatible storage: Docker (LocalStack) per `docker-compose.yml`.

### Install

```bash
npm install
```

This installs all workspaces and applies **`patch-package`**.

### Database

- Point `DATABASE_URL` (and related config) at your Postgres instance; Prisma schema lives in `packages/db/prisma`.
- `npm run db:generate`
- From `backend/`: `npm run prisma:migrate` / `npm run prisma:seed` as needed for your environment.

### Services

- Backend dev: `npm run backend:dev` (from repo root).
- IO dev: `npm run io:dev`.
- Mobile: `npm run mobile:start` (Expo / Metro).

### Docker

```bash
docker compose up --build
```

starts Postgres, LocalStack, **backend**, and **io** with healthchecks. **Docker must be running** on your machine for this to succeed.

### Quick verification checklist

1. `npm run typecheck:all` — zero errors.
2. `npm --prefix backend run build` and `npm --prefix io run build` — success.
3. `npm --prefix mobile run typecheck` — success.
4. Expo: `cd mobile && npx expo start` — Metro listens (e.g. on port 8081); use a device or simulator to exercise UI.

---

## Suggested reading order for a new reviewer

1. This **README** (you are here).
2. `backend/src/app.ts` — the full list of HTTP surfaces.
3. `backend/src/routers/auth.ts`, `backend/src/middlewares/auth.ts`, and `backend/src/validators/` + `middlewares/validateBody.ts` — how identity is established and how JSON bodies are validated before controllers.
4. `mobile/src/services/auth-aware/AuthAware.ts` — how the client attaches auth and handles HTTP failures.
5. `io/src/index.ts` and `io/src/socket/duel/index.ts` — how realtime is structured.
6. `packages/db/prisma/schema.prisma` — the data model.

When touching a feature, read **router (middleware + validation) → controller → Prisma** on the server, and **hook/screen → auth-aware services / axios → Redux/React Query** on mobile.

---

## Conventions you will see in code

Many files start with a short **comment block** describing responsibility, layer, dependencies, and consumers. Prefer extending that style when adding new modules so the next reader (human or tool) can navigate quickly.

---

## License / ownership

See repository owner or organization defaults; this guide does not replace product or legal documentation.

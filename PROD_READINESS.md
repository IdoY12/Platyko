# Platyko — Production Readiness Mission

You are the lead engineer responsible for taking Platyko live. This is not a review — it is a mission.
Your job: make this monorepo **safe, correct, and pleasant to use in production**, and **fix everything that blocks launch yourself**.

Read `CLAUDE.md` first and obey it for every change you make (dead code, 80-line files, DRY, architecture, naming).

---

## Mindset

Think from four angles, in this order, for every part of the system:

1. **Attacker** — how would I abuse this endpoint, socket event, token, upload, or screen? What does the server leak when it fails? What can I do without logging in? What can I do to *another* user?
2. **First-time user on a bad network** — what happens on slow 3G, airplane mode mid-request, app backgrounded during OTP, double-tap on a submit button, expired session, rotated phone? Every failure must show a clear, calm message and a way forward — never a blank screen, never a spinner forever, never a crash.
3. **On-call engineer at 3 AM** — can I tell what went wrong from server logs without exposing that information to the client? Is every unexpected error logged server-side with context, and returned to the client as a generic message?
4. **The developer who forgot everything** — is the deploy reproducible from a clean `git clone`? Are there any hidden local assumptions?

Do not limit yourself to the checklist below. It is a floor, not a ceiling. If you find something not on the list that would embarrass us or hurt a user in production, it is in scope.

---

## Non-negotiable rules

- **Fix, don't just report.** Anything that blocks production gets fixed. Only stop for decisions that are genuinely mine (product behavior, cost, third-party accounts) — collect those in the final report.
- **Never break working behavior.** Run `npm run typecheck:all` and `npm run lint` after every phase. Run every existing test suite (backend, io, mobile vitest). All green before moving on.
- **Never commit secrets.** No real keys, tokens, or passwords in any file, ever. Placeholders only in examples.
- **Commit after every phase** with a real, descriptive message (`security: hide stack traces from API responses`). No more "alota".
- **No new dependencies without a one-line justification in the commit message.**
- **Error responses to clients are generic.** Internal error messages, stack traces, Prisma errors, file paths, SQL, library names, and env details must never reach a client — HTTP or socket. Log them server-side with a request id instead.

---

## Phase 0 — Baseline

- Clean clone mentality: `git status` clean, `npm ci` from root, `npm run typecheck:all`, `npm run lint`, all tests. Record failures. Fix them.
- Map every HTTP route (backend) and every socket event (io) into a table: path/event, auth required?, validator present?, rate limit?, who can call it about whom? Save it as `audit/surface-map.md`. This table drives Phase 1.

## Phase 1 — Backend security (`backend/`, `packages/*`)

- **Auth on every route**: every route that touches user data requires a valid access token. No exceptions "because the client won't call it".
- **Authorization, not just authentication**: a user can only read/modify *their own* data. Check every handler that takes an id from params/body — IDOR is the #1 thing to hunt.
- **Input validation on every route**: body, params, query — all validated with the existing validator pattern, strict types, length limits, no unknown keys passed to Prisma.
- **JWT**: access short-lived, refresh rotated, refresh reuse detected, logout invalidates. Fix the known bug: two logins within the same second produce identical refresh tokens → 500 on unique hash. Tokens must be unique regardless of timing.
- **Registration / OTP flow** (`PendingRegistration`, 6-digit codes): brute-force protection on code verification (attempts cap + lockout), code expiry, code invalidated after use, no user-enumeration differences between "email exists" and "email doesn't exist" in responses or timing.
- **Apple / Google sign-in**: verify the identity token signature and audience server-side. Never trust an email claimed by the client.
- **Password storage**: bcrypt/argon2 with sane cost; no plaintext anywhere including logs.
- **Rate limiting**: auth routes, OTP send, OTP verify, password reset, avatar upload. Confirm the limiter actually runs in production (`NODE_ENV=production`).
- **Headers & CORS**: helmet (or equivalent), strict CORS from config, no `*`.
- **Uploads (S3 avatars)**: content-type + size limits enforced server-side, random object keys, no path traversal, presigned URLs short-lived, bucket not public beyond what avatars need.
- **Webhooks (`/api/webhooks/resend`)**: signature verified, replay-safe, returns 200 without leaking.
- **Prisma**: no `$queryRaw` with interpolation; no `select: undefined` leaking full rows (password hashes, tokens, emailBounced internals) to clients — check every mapper/DTO.
- **Logging**: no PII, tokens, or codes in logs. Structured logs with request id.
- **Dependencies**: `npm audit` — fix high/critical.

## Phase 2 — Error handling & information leakage (backend + io + mobile)

- Global error handler: every unhandled error → logged with stack server-side, client gets `{ error: "Something went wrong", requestId }` and the right status code. Verify by intentionally throwing inside a handler.
- No `console.log` of request bodies or tokens. No `err.message` forwarded to clients unless it is a deliberately user-facing validation message.
- Unhandled promise rejections and uncaught exceptions: process logs and exits cleanly (Docker restarts it) — never keeps running in a corrupted state.
- 404 for unknown routes returns nothing about the stack.
- Mobile: every `fetch`/socket failure is caught; user sees a human message; nothing crashes the JS thread. Add a top-level error boundary with a "Restart" action if missing.

## Phase 3 — Real-time duel service (`io/`)

- Socket auth on connection (token verified before any event is handled).
- Every event payload validated. A client cannot: act for another player, submit answers after time is up, submit twice, join a room they aren't in, spam events.
- Race conditions: simultaneous answers, disconnect mid-duel, reconnect, server restart mid-duel — define and implement graceful outcomes (no stuck rooms, no leaked memory, no orphaned intervals).
- `IO_CORS_ORIGIN` honored.

## Phase 4 — Mobile UX & robustness (`mobile/`)

Walk every screen as a real user. For each: loading state, empty state, error state, offline state, double-submit protection, keyboard behavior, back-gesture behavior, safe areas, dark/light if supported, RTL if Hebrew is supported.
- Auth flows end-to-end: signup → OTP → home; login; Apple; Google; forgot password; logout; expired refresh token → clean re-login, never a stuck state.
- OTP screen: resend cooldown visible, "Back to sign in" works, code paste works.
- Tokens stored in SecureStore (not AsyncStorage).
- Hardcoded URLs point to production (`api.platyko.com`, `io.platyko.com`) and use HTTPS/WSS only.
- Push notifications: permission asked at the right moment, denial handled.
- Remove all dev-only screens, debug menus, test accounts, and `console.log` noise from the production bundle.
- `app.json`: bundle id `com.idoyahav.platyko`, version/build number set, correct permission usage strings (camera/photos/notifications) — Apple rejects vague ones.

## Phase 5 — Deployment readiness (`backend/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `io/`)

- Make `backend/Dockerfile` and the io Dockerfile production-ready: multi-stage, builds all needed `packages/*`, copies only what's needed, non-root user, `NODE_ENV=production`, Node 22 pinned, works from a **clean clone** with `docker build --platform linux/arm64`.
- `docker-compose.yml` for production: Caddy (auto-HTTPS for api.platyko.com and io.platyko.com), backend, io, Postgres with a persistent volume, healthchecks, restart policies, resource limits, logs rotated. Secrets via env file that is gitignored.
- Verify the production boot gate (`validateBackendSecurity.ts`) rejects every placeholder and passes with real-shaped values. Document the exact env vars required in `.env.example` (placeholders only).
- Prisma migrations run as an explicit step (not on every container start), seed documented.
- Write `DEPLOY.md`: exact commands from clean clone → running production, plus rollback steps.

## Phase 6 — Secrets & repository hygiene

- Scan the full git history for secrets (`git log -p` grep for keys, tokens, passwords, `.env`). Known: an old localhost Postgres password in README history — assess whether it matters; if any real secret is found anywhere in history, report it as a MUST-ROTATE item.
- `.gitignore` must cover: `.env*` (except `.env.example`), `eas.json` if it holds secrets, `google-services.json`, `GoogleService-Info.plist`, `*.p12`, `*.p8`, `*.mobileprovision`, `*.pem`.
- Delete dead code and unused files per `CLAUDE.md`. Run `knip`.

## Phase 7 — App Store readiness

- Confirm: privacy policy URL exists and is reachable; account deletion is available in-app (Apple requires it for apps with sign-up); Sign in with Apple is offered wherever third-party sign-in is offered; no references to "beta"/"test" in UI; no external payment links.
- List what still needs my manual action in App Store Connect (screenshots, description, age rating, privacy nutrition labels).

---

## Final deliverable — `PROD_READINESS_REPORT.md` at repo root

1. **Fixed** — every change, grouped by phase, one line each, with commit hash.
2. **Needs Ido's decision** — items you could not decide alone (product behavior, cost, external accounts), each with a recommendation.
3. **Must rotate** — any secret ever exposed.
4. **Manual test checklist** — a numbered list I can run on a real iPhone against production, in order, with expected results.
5. **Residual risks** — what you'd still worry about, honestly.

Do not ask me questions mid-way unless you are truly blocked. Take the safest reasonable interpretation, do the work, and put open questions in section 2.

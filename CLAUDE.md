# AI Rules — Iron Rules (Non-Negotiable)

> These rules apply to every change, suggestion, and output. No exceptions.

---

## 1. Dead Code — #1 Priority

- Any code, file, or folder that is no longer used **must be deleted immediately**.
- After every change, scan the entire project for dead code, unused files, and unused folders.
- Dead code confuses engineers during code review. Zero tolerance.

---

## 2. Architecture — Never Break It

- Preserve the existing folder structure and naming conventions at all times.
- Example: `/mobile/services` must contain **only** API request files and folders — nothing else.
- Do not rename, restructure, or reorganize unless explicitly instructed.
- File and folder names must clearly reflect their contents.

---

## 3. File Size — Max 80 Lines

- Every file must stay at or under **80 lines**.
- Exceeding 80 lines requires explicit developer approval.
- If a file grows beyond 80 lines, split it — do not ask, just split it cleanly.

---

## 4. DRY — Our Holy Grail

- Do not repeat logic. Ever.
- Before writing anything, check if it already exists.
- Abstract and reuse. If two things do the same thing, they must be one thing.

---

## 5. Minimalism

- Write the minimum code needed to solve the problem.
- Use the minimum number of files and folders.
- If something can be reduced or consolidated — do it.
- Flat file structure over deep nesting. Always.

---

## 6. Readability

- Every variable, function, file, and folder name must be self-explanatory.
- A developer who has never seen this project must understand it immediately — zero guesswork.
- No clever tricks. No ambiguous abbreviations. Clear, obvious, readable.

---

## 7. Restricted Folders — Avoid Unless Necessary

- **Avoid creating new files** inside `mobile/src/hooks` or `mobile/src/utils`.
- These folders are already dense — do not add to them without a strong reason.
- **Exception:** If the only alternative is placing the file outside its logical context or breaking architectural conventions, create it here — convention and architecture always win.
- **If a new file is created in either of these folders, explicitly notify the developer** — state the file name, the path, and why there was no better alternative.
- When in doubt, do not create. Ask first.

---

## 8. Post-Change Verification

- After every change, verify that no new bugs were introduced elsewhere in the codebase.
- Changes must not break existing functionality. Always check side effects.

---

## Project Overview

**Platyko** — a React Native mobile app for deliberate daily JavaScript practice.
Target users: JS developers at Junior / Mid / Senior levels. Core loop: learn → streak → duel.

### Features
- **Onboarding wizard** — 3-step level / goal / commitment picker (first launch only, AsyncStorage-gated).
- **Learn** — 3 curriculum blocks per level (9 total), each with 10 exercises (MCQ + short-answer PUZZLE types). Server-synced progress for registered users; local-only for guests.
- **Duel Mode** — real-time 1v1 Socket.IO battles (5 rounds). Authenticated users only. Solo auto-match after 25 s with no opponent. Max 3 wrong attempts per round, 60 s per round. Post-match replay + rematch.
- **Code Puzzle** — standalone free-response puzzles evaluated against `acceptedAnswers` or test cases inside an `isolated-vm` V8 sandbox. XP capped at 10 solves per puzzle.
- **XP & Level** — 250 XP per correct answer (lessons, puzzles, duel rounds). `level = floor(xp/250)+1`, `xpTotal` capped at `MAX_XP_TOTAL`.
- **Streak** — increments once per calendar day on qualifying XP. Resets if 2+ days missed.
- **Daily Goal** — user-chosen commitment (10/15/25 min). Practice time tracked server-side. Daily local notification at 19:00 via `expo-notifications`; permission is requested when the first reminder is scheduled, never at launch.
- **Accounts & auth** — email + password sign-up with a 6-digit OTP emailed by Resend (`PendingRegistration`: no `User` row until verified), Google Sign-In and Sign in with Apple (both verified server-side), password reset by emailed OTP, "Set password" for social-only accounts, JWT access (15 min) + rotated refresh (30 d) tokens.
- **Profile** — avatar (JPEG upload through the backend to S3), username, preferences, password change, account deletion (in-app, typed confirmation).
- **Guest mode** — full Learn + Code Puzzle access; XP/streak stored locally and migrated into the account on sign-up; Duel blocked.

### Architecture Layers

| Layer | Package / Path | Technology |
|-------|---------------|------------|
| Mobile app | `mobile/` | React Native 0.81, Expo 54, Redux Toolkit, React Navigation 7 |
| HTTP API | `backend/` | Express 5, Prisma 6, PostgreSQL 16, Zod, JWT (HS256), Node 22 |
| Real-time | `io/` | Socket.IO 4 — `/duel` namespace only |
| Database | `packages/db/` | Prisma schema (multi-file), singleton client, one squashed init migration |
| Shared logic | `packages/` | `auth-jwt`, `xp-constants`, `streak-logic`, `duel-constants`, `exercise-answer`, `user-credentials`, `server-kit` (CORS, logging + request ids, production boot gates) |
| Email | Resend | OTP emails, bounce/complaint webhook (`/api/webhooks/resend`) |
| Storage | AWS S3 / LocalStack | Avatar images only |
| Production | `docker-compose.prod.yml`, `backend/Dockerfile`, `io/Dockerfile`, `infra/` | Caddy auto-HTTPS → backend + io containers (multi-stage, non-root), Postgres volume, nightly S3 backups. Runbook: `DEPLOY.md` |

### Key Technical Decisions
- **JWT token versioning** — `User.tokenVersion` column; bumping it instantly invalidates all outstanding tokens (logout, password change, password reset, account delete). Refresh tokens are stored hashed, rotated on use, carry a `jti`, and reuse revokes every session.
- **Dual token storage** — JWTs in `expo-secure-store` (primary); Redux/AsyncStorage snapshot has tokens zeroed out.
- **OTP codes** — 6 digits, bcrypt-hashed, 10 min TTL, 5 attempts, 60 s resend cooldown; identical logic for email verification (`PendingRegistration`) and password reset (`PasswordReset`).
- **Social sign-in trusts only verified tokens** — Google ID token audience + `email_verified`; Apple identity token issuer/audience, email taken from the token, never from the client.
- **In-memory duel state** — active sessions, queue, and rematch entries live in Maps on the `io` process; only finished `DuelSession` rows are persisted. Every socket payload is type-checked; malformed input is ignored.
- **Isolated-VM puzzle sandbox** — puzzle `testCases` run in a 32 MB, 100 ms V8 isolate; only `Math.*` and `Object.*` helpers are bridged in.
- **Single XP constant** — `XP_PER_CORRECT_EXERCISE = 250` is the single source of truth used by backend, io, and mobile.
- **Shared streak logic** — `@project/streak-logic` pure functions used identically by backend, io, and mobile to prevent drift.
- **Errors never leak** — every request gets an `X-Request-Id`; server logs carry `[rid=…]` and redact emails/passwords/tokens/answers; clients only ever see generic messages (plus the request id on 500s).
- **Production boot gate** — `packages/server-kit/src/validate` refuses to start on placeholder/short/identical secrets, dev DB credentials, wildcard or `http://` CORS.
- **Guest-first design** — app fully usable without an account; registration unlocks Duel + server sync only.

### DB Tables
`User` (incl. `tokenVersion`, `emailBounced`, `googleId`, `appleSub`, `puzzleXpSolveCounts`), `UserProgress` (one per user×level), `RefreshToken`, `PendingRegistration`, `PasswordReset`, `Exercise`, `ExerciseOption`, `DuelQuestion`, `DuelSession`, `CodePuzzle`.

### Redux Slices
`session`, `profile`, `xp`, `streak`, `lesson`, `duel` (stats), `duelLive` (transient, not persisted), `puzzle`.

### Verification
`npm run typecheck:all`, `npm run lint`, `npm run test:all`, `npx knip` must all be green after every change. `npm run build:packages` runs in `postinstall`; run it manually after editing `packages/*` before typechecking consumers.

---

## Summary

| Rule | One-liner |
|------|-----------|
| Dead code | Delete immediately, always |
| Architecture | Never break conventions |
| File size | Max 80 lines |
| DRY | One source of truth |
| Minimalism | Least code, least files |
| Readability | Self-explanatory everything |
| Restricted folders | Avoid hooks/utils — notify if exception made |
| Post-change check | Verify no regressions |
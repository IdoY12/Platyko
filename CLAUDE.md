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
- **Duel Mode** — real-time 1v1 Socket.IO battles (5 rounds). Authenticated users only. Solo auto-match after 25 s with no opponent. Max 3 wrong attempts per round. Post-match replay + rematch.
- **Code Puzzle** — standalone free-response puzzles evaluated against `acceptedAnswers` or test cases inside an `isolated-vm` V8 sandbox. XP capped at 10 solves per puzzle.
- **XP & Level** — 250 XP per correct answer (lessons, puzzles, duel rounds). `level = floor(xp/250)+1`.
- **Streak** — increments once per calendar day on qualifying XP. Resets if 2+ days missed.
- **Daily Goal** — user-chosen commitment (10/15/25 min). Practice time tracked server-side. Daily push notification at 19:00 via `expo-notifications`.
- **Profile** — avatar (S3 upload), username, preferences, password change, account deletion.
- **Guest mode** — full Learn + Code Puzzle access; XP/streak stored locally; Duel blocked.

### Architecture Layers

| Layer | Package / Path | Technology |
|-------|---------------|------------|
| Mobile app | `mobile/` | React Native 0.81, Expo 54, Redux Toolkit, React Navigation 7 |
| HTTP API | `backend/` | Express 5, Prisma 6, PostgreSQL 16, Zod, JWT (HS256) |
| Real-time | `io/` | Socket.IO 4 — `/duel` namespace only |
| Database | `packages/db/` | Prisma schema (multi-file), singleton client |
| Shared logic | `packages/` | `auth-jwt`, `xp-constants`, `streak-logic`, `duel-constants`, `exercise-answer`, `user-credentials`, `server-kit` |
| Storage | AWS S3 / LocalStack | Avatar images only |

### Key Technical Decisions
- **JWT token versioning** — `User.tokenVersion` column; bumping it instantly invalidates all outstanding tokens (logout, password change, account delete).
- **Dual token storage** — JWTs in `expo-secure-store` (primary); Redux/AsyncStorage snapshot has tokens zeroed out.
- **In-memory duel state** — active sessions, queue, and rematch entries live in Maps on the `io` process; only `DuelSession` rows are persisted to DB (at match end).
- **Isolated-VM puzzle sandbox** — puzzle `testCases` run in a 32 MB, 100 ms V8 isolate; only `Math.max/min` and `Object.keys` bridged in.
- **Single XP constant** — `XP_PER_CORRECT_EXERCISE = 250` is the single source of truth used by backend, io, and mobile.
- **Shared streak logic** — `@project/streak-logic` pure functions used identically by backend, io, and mobile to prevent drift.
- **Guest-first design** — app fully usable without an account; registration unlocks Duel + server sync only.

### DB Tables
`User`, `UserProgress` (one per user×level), `Exercise`, `ExerciseOption`, `DuelQuestion`, `DuelSession`, `CodePuzzle`.

### Redux Slices
`session`, `profile`, `xp`, `streak`, `lesson`, `duel` (stats), `duelLive` (transient, not persisted), `puzzle`.

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
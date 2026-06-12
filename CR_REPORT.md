# CodeQuest JS — Pre-Production Code Review Report

Baseline: HEAD `60150e3` (clean tree). Scope: backend/, io/, mobile/, packages/, configs, docker-compose, seeds, migrations.

---

### CRITICAL — Must Fix Before Ship

**C1 [SECURITY] Malformed socket payload crashes the entire io process**
File: io/src/socket/duel/handlers/rematchRequest.ts:23,40; io/src/socket/duel/handlers/joinQueue.ts:38
Status: FIXED — guarded payload access (`typeof payload?.session_id === "string"`, safe username read) in rematchRequest.ts and joinQueue.ts.
Observation: `rematch_request` and `rematch_abandoned` listeners dereference `payload.session_id` without guarding `payload`. A client emitting either event with no payload throws a synchronous TypeError inside the listener; io/src/index.ts:19-22 installs an `uncaughtException` handler that calls `process.exit(1)`. `join_queue` similarly evaluates `payload.username` (async handler → unhandledRejection → exit) when the DB user lookup returns null.
Risk: Any authenticated user can kill the duel server for everyone with a single crafted emit; all in-memory duel sessions are lost.

**C2 [EDGE CASE] No duel round or ready timeout — sessions leak forever and lock users out**
File: io/src/socket/duel/startRound.ts; io/src/socket/duel/queue.ts:36-49; io/src/socket/duel/state.ts:19
Status: FIXED — new io/src/socket/duel/roundTimeout.ts (ready timeout 120 s expires never-started sessions; round timeout 60 s resolves stalled rounds as no-winner); wired into queue.ts, startRound.ts, endSession.ts, handlers/disconnect.ts; SessionState.roundTimer added in types.ts.
Observation: After `match_found`, if a player never emits `player_ready`, or mid-duel neither player answers (without exhausting 3 wrong attempts), no server-side timer ever fires. The `SessionState` stays in the `sessions` Map indefinitely. `handleQueueJoin` rejects re-queue with `already_in_duel` for any user with a stale session. `io/dist/socket/duel/roundTimeoutFlow.js` exists in the stale build output but has no source counterpart — a timeout feature was removed from src.
Risk: Permanent memory leak on the io process; affected users can never duel again until server restart.

---

### HIGH — Strong Recommendation Before Ship

**H1 [DATA INTEGRITY] Duel XP reward is a non-transactional read-modify-write**
File: io/src/socket/duel/services/rewards.ts:5-37
Status: FIXED — applyXpReward now runs inside runSerializableWithRetry (new shared helper in packages/db/src/serializableTransaction.ts); XP + streak update are atomic.
Observation: `applyXpReward` reads `progress.xpTotal`, computes `nextXp` in JS, then updates — no transaction, no atomic increment. It runs concurrently per answered round and concurrently with backend lesson/puzzle XP writes for the same row.
Risk: Lost XP updates under concurrency (duel + lesson on two devices, or rapid rounds); level/xpTotal silently wrong.

**H2 [DATA INTEGRITY] Lesson/puzzle XP and puzzle solve counts race at default isolation**
File: backend/src/services/learning/applyExerciseSubmission.ts:26-52; backend/src/services/codePuzzle/applyAuthenticatedPuzzleSolve.ts:30-60
Status: FIXED — both transactions now use runSerializableWithRetry (SERIALIZABLE + P2034 retry); postPracticeLogHandler refactored onto the same shared helper (DRY).
Observation: Both wrap read-then-write of `xpTotal` (and the `puzzleXpSolveCounts` JSON column) in `prisma.$transaction` at default READ COMMITTED isolation; two concurrent requests both read the same prior value and one write is lost. `postPracticeLog` (backend/src/controllers/user/postPracticeLogHandler.ts:23-41) already solves this with Serializable + retry, so the codebase has two divergent patterns for the same problem.
Risk: Lost XP, and lost-update on solve counts lets a user collect more than `PUZZLE_MAX_XP_SOLVES` XP grants per puzzle by submitting in parallel.

**H3 [SECURITY] Refresh-token rotation race defeats reuse detection**
File: backend/src/controllers/auth/authRefreshHandler.ts:24-54
Status: FIXED — rotation now claims the token via conditional updateMany({id, used:false}); a lost race counts as reuse and triggers revokeAllSessionsForUser + 401.
Observation: The handler reads `stored.used`, checks it in JS, then unconditionally sets `used: true` inside the transaction. Two concurrent refreshes with the same token both pass the check and both mint new token pairs; the second is not detected as reuse and `revokeAllSessionsForUser` is never called.
Risk: A stolen refresh token can be used in parallel with the victim's without triggering family revocation — the exact attack the rotation scheme exists to stop.

**H4 [PROD READINESS] Database seed deletes all user progress**
File: backend/prisma/seed/seedCleanup.ts:14
Status: FIXED — removed prisma.userProgress.deleteMany(); seed cleanup now wipes content tables only (header documents the invariant).
Observation: `seedCleanup` runs `prisma.userProgress.deleteMany()` before re-seeding content tables. UserProgress holds XP, level, streak, practice log, goals for every registered user and has no relation to the content tables being re-seeded.
Risk: Running `npm run prisma:seed` against the production database irreversibly wipes every user's XP, streaks, and preferences.

**H5 [STRUCTURAL] 5,863 node_modules files are committed to git**
File: io/node_modules/** and node_modules/** (tracked); .gitignore:1 covers them but they were added before the rule
Status: FIXED — git rm -r --cached removed all 5,863 tracked node_modules files; .gitignore already excludes them going forward.
Observation: `git ls-files` shows 5,863 tracked files under `io/node_modules/` (socket.io, engine.io, tsx, .prisma generated client, .bin) and root `node_modules/` — 93% of all tracked files in the repo.
Risk: Stale vendored dependencies shadow lockfile installs, repo bloat, generated Prisma client checked in, and dependency updates silently diverge from what is committed.

---

### MEDIUM — Should Fix Soon

**M1 [SECURITY] Refresh endpoint does not enforce tokenVersion**
File: backend/src/controllers/auth/authRefreshHandler.ts:16-23
Status: FIXED — handler now rejects with 401 when user.tokenVersion !== payload.tokenVersion.
Observation: The handler verifies the refresh JWT and loads the user but never compares `payload.tokenVersion` to `user.tokenVersion` (access-token middleware and socket auth both do). It is currently shielded only because every tokenVersion bump also deletes RefreshToken rows.
Risk: Single point of failure — any future code path that bumps tokenVersion without deleting rows silently re-arms revoked refresh tokens.

**M2 [BUG] Invalid/expired refresh token returns 500 instead of 401**
File: backend/src/controllers/auth/authRefreshHandler.ts:57-60
Status: FIXED — verifyRefreshToken wrapped in its own guard returning 401; rotation transaction extracted to backend/src/utils/rotateRefreshToken.ts to keep the handler within the 80-line rule; remaining catch-all returns 500 "Refresh failed" only for genuine server errors.
Observation: `verifyRefreshToken` throws for malformed/expired JWTs; the catch-all returns `500 {"error":"Invalid refresh token"}`.
Risk: Client errors are misreported as server failures (monitoring noise, wrong HTTP semantics).

**M3 [VALIDATION] register blockProgress accepts arbitrary level keys → Prisma enum error → 500**
File: backend/src/validators/authValidators.ts:38; backend/src/services/auth/registerUser.ts:51-62
Status: FIXED — blockProgress keys constrained via z.partialRecord(z.enum(["JUNIOR","MID","SENIOR"]), …); invalid keys now fail validation with 400.
Observation: `blockProgress` is `z.record(z.string(), …)`; `registerUser` casts the keys `as ExperienceLevel[]` and feeds them to `userProgress.create`. A request with `blockProgress: {"BOGUS": {}}` throws a Prisma validation error → 500 "Registration failed".
Risk: Unvalidated input reaches the DB layer; trivially triggerable 500s on a public endpoint.

**M4 [BUG] Change-password client validates 6 chars, server requires 8**
File: mobile/src/hooks/useProfileAccountHandlers.ts:34-37
Status: FIXED — client now uses passwordPolicyError from @project/user-credentials (same source of truth as the server).
Observation: Client gate is `newPassword.length < 6`; server schema (backend/src/validators/userValidators.ts:26-29) requires `PASSWORD_MIN_LEN = 8`. A 6–7 char password passes the client, gets a generic 400, and the user sees "Check your current password and try again."
Risk: Misleading failure; duplicated policy violating the shared `@project/user-credentials` source of truth.

**M5 [RACE] Duplicate startRound from repeated player_ready**
File: io/src/socket/duel/startRound.ts:38-47; io/src/socket/duel/handlers/playerReady.ts:48-53
Status: FIXED — startRound re-checks session.round after the awaited question pick and bails if a concurrent call already advanced the round.
Observation: `playerReady` checks `session.round === 0` synchronously, then `startRound` awaits `pickQuestionForSession` before incrementing `session.round`. Two qualifying `player_ready` events arriving within the await window both pass the check and both emit `round_start` (round advances to 2, two different questions broadcast).
Risk: Corrupted round state at match start; clients render conflicting questions.

**M6 [RESOURCE] Compiled isolate scripts are never released**
File: backend/src/services/codePuzzle/codePuzzleSandboxRunner.ts:55-66
Status: FIXED — compiled scripts are released in the finally block alongside the context.
Observation: `runExpression` compiles a new `ivm.Script` per test case and releases the context but never the script. All scripts accumulate inside the single shared 32 MB isolate until it OOMs and gets disposed/reset.
Risk: Slow memory growth and periodic isolate disposal under puzzle-submission load; in-flight evaluations on a disposed isolate fail.

**M7 [BUG] Duel line-pick answer UI is unreachable dead code**
File: mobile/src/utils/duelSocketModels.ts:23-34; mobile/src/utils/duelInboundSocket.ts:44; io/src/socket/duel/startRound.ts:17-30
Status: FIXED — line-pick inference now uses the round's options (all numeric, within line range) instead of the never-sent correctAnswer; dead DuelRound.correctAnswer field and the q.correct_answer mapping deleted.
Observation: `duelRoundUsesLinePick` requires `round.correctAnswer`, mapped from `q.correct_answer` — but the server's `roundStartPayload` never includes `correct_answer` (correctly, to prevent cheating). The predicate always returns false; the line-tap rendering branch in DuelActiveAnswerZone.tsx:14-27 and the `DuelRound.correctAnswer` field are dead. Seeded "bug" questions fall back to plain "1"–"4" option buttons.
Risk: Dead feature code; intended line-tap UX never shows.

**M8 [VALIDATION] Resume endpoint parses query manually instead of via Zod middleware**
File: backend/src/controllers/learning/learningGetResumeHandler.ts:21-23
Status: FIXED — /learning/resume now uses validateQuery(learningResumeQuerySchema); handler reads validatedQuery and the inline allow-list was deleted.
Observation: Every other route validates input through `validateBody/Query/Params`; this handler reads `request.query.experienceLevel` raw and allow-lists it inline.
Risk: Inconsistent validation surface; future edits to this handler bypass the established validation layer.

**M9 [DATA INTEGRITY] Disconnect vs round-advance timer can double-persist DuelSession**
File: io/src/socket/duel/handlers/disconnect.ts:10-36; io/src/socket/duel/endSession.ts:10-16; io/src/socket/duel/applyCorrectDuelAnswer.ts:30-33,72-75
Status: FIXED — abandon path deletes the session from the map synchronously (before async XP work) and endSession returns early for abandonInProgress sessions; round timers see an empty map and no-op.
Observation: `onDuelParticipantGone` persists the session, then deletes it from the `sessions` Map only inside an async `.then` after `applyXpReward` resolves. The 4 s between-round timer checks `sessions.has(...)` and calls `endSession`, which persists again. `endSession` never checks `abandonInProgress`.
Risk: Duplicate DuelSession rows → inflated win/loss counts; survivor receives two conflicting `duel_end` events.

---

### INFORMATIONAL — Debt / Polish

**I1 [DEAD CODE] Commented-out debug date override**
File: mobile/src/redux/session-slice.ts:37
Status: FIXED — commented-out debug line deleted.
Observation: `// const dateKey = "2026-05-18";` left in `rollStudyCalendarIfNeeded`.
Risk: Dead code; project rules mandate immediate deletion.

**I2 [DEAD CODE] Backend carries io CORS config it never uses**
File: backend/config/default.json:35-39 (and docker/compose/production variants); backend/config/custom-environment-variables.json:30-34; backend/src/@types/config.d.ts:33-38; docker-compose.yml backend `IO_CORS_ORIGIN` env
Status: FIXED — io section removed from all backend config files, the AppConfig type, and the backend service env in docker-compose (the io service keeps IO_CORS_ORIGIN).
Observation: No backend source reads `io.cors`; `resolveSocketIoCors` is only consumed by the io service. docker-compose forces `IO_CORS_ORIGIN` onto the backend container.
Risk: Dead config misleads deploys (suggests backend serves sockets).

**I3 [DEAD CODE] googleClientSecret config is never read**
File: backend/config/custom-environment-variables.json:11; backend/config/default.json:14
Status: FIXED — googleClientSecret removed from config mapping and defaults.
Observation: `app.googleClientSecret` appears in config mapping and defaults; no source file reads it (ID-token verification needs no client secret).
Risk: Dead config; invites someone to put a real secret in a file that does nothing.

**I4 [STRUCTURAL] .DS_Store files tracked in git**
File: .DS_Store; backend/.DS_Store; backend/src/.DS_Store
Status: FIXED — untracked via git rm --cached; .DS_Store added to .gitignore.
Observation: Three macOS Finder artifacts are committed; .gitignore does not exclude them.
Risk: Repo noise; churn on every developer machine.

**I5 [BUG] Logout server-error path returns misleading "Invalid credentials"**
File: backend/src/controllers/auth/authLogoutHandler.ts:31
Status: FIXED — 500 path now returns "Logout failed".
Observation: The catch block for `revokeAllSessionsForUser` failures responds `500 {"error":"Invalid credentials"}`.
Risk: Misleading error body for a genuine server failure.

**I6 [VALIDATION] /auth/logout has no validateBody middleware**
File: backend/src/routers/auth.ts:34
Status: DISPUTED — intentional: logout must accept bearer-only requests with no JSON body; a Zod body schema would 400 them. The handler's manual optional read is the correct shape here.
Observation: Logout reads `request.body.refreshToken` manually; every other auth route uses a Zod schema. Logout must accept requests with no body at all (bearer-only logout), which `validateBody` as implemented would reject.
Risk: Inconsistency only — flagged for confirmation; may be intentional.

**I7 [DEBT] Rotated/used refresh tokens are cleaned up only at login**
File: backend/src/utils/storeRefreshToken.ts:10-15; backend/src/controllers/auth/authRefreshHandler.ts:44-54
Status: FIXED — cleanupExpiredRefreshTokens now accepts a DbClient, is exported, and runs inside every rotation (rotateRefreshToken.ts) as well as at login, so expired rows are purged continuously.
Observation: Every refresh creates a new row and marks the old one used; expired-row cleanup runs only in `storeRefreshToken` (login/register/google). A long-lived session refreshing every 15 minutes accrues ~2,900 rows per 30 days, purged only on next login.
Risk: Unbounded table growth for always-signed-in users.

**I8 [DRY] Three divergent puzzle-answer normalizers**
File: backend/src/controllers/codePuzzle/codePuzzleSubmitHandler.ts:15-17; backend/src/services/codePuzzle/codePuzzleSandbox.ts:10; packages/exercise-answer/src/index.ts:1-3
Status: FIXED — normaliseCodePuzzleAnswer (comparison) and prepareCodePuzzleExpression (evaluation) added to @project/exercise-answer; the local normalizeAnswer and inline prep were deleted and both call sites use the shared functions.
Observation: `normalizeAnswer` (strip all whitespace + trailing `;`), the sandbox's `trim + strip trailing ;`, and `normaliseExerciseAnswer` (strip all whitespace) coexist with overlapping but unshared rules.
Risk: Drift between acceptance paths; violates the project's single-source-of-truth rule.

**I9 [PRIVACY] Emails and request bodies logged at INFO in production**
File: backend/src/controllers/auth/authLoginHandler.ts:15; backend/src/middlewares/requestLogger.ts:9-13
Status: DISPUTED — intentional operational logging: passwords/tokens/answers are already redacted by sanitizeBody, and the email on login attempts is deliberate auth diagnostics. Tightening is a product/compliance decision, not a code defect.
Observation: Login attempts log the raw email; every request body is logged (passwords/tokens/answers are redacted by `sanitizeBody`, emails are not). The shared logger has no production level gate.
Risk: PII retention in production logs.

**I10 [STRUCTURAL] Stale audit-prompt artifact at repo root**
File: CR_4PROD.md
Status: DISPUTED — developer-owned document, not code; left for the developer to remove manually rather than deleting a file the run does not own.
Observation: A previous code-review prompt document (references a nonexistent `socket-service/` and `shared/` layout) lives at the repo root.
Risk: Confusing, outdated dev artifact.

**I11 [DESIGN — needs confirmation] Lesson exercises grant XP on every re-submission**
File: backend/src/services/learning/applyExerciseSubmission.ts:36-41
Status: DISPUTED — intentional design: lesson blocks are replayable in the app (block progress resets on completion) and total XP is bounded by the intentional global MAX_XP_TOTAL cap; a per-exercise cap would change product behavior.
Observation: Unlike puzzles (capped via `puzzleXpSolveCounts`), submitting the same correct lesson exercise repeatedly grants 250 XP each time (bounded only by `MAX_XP_TOTAL`; learning limiter allows 100 req/min). Blocks are replayable by design in the mobile app, so this may be intentional.
Risk: XP farming via direct API replay — flagged for developer confirmation, not assumed to be a bug.

---

### OUT OF REACH

- `mobile/ios/` native project (Xcode project, Pods, .pbxproj) — not line-audited; binary/lockfile content.
- Image assets (`mobile/assets/*.png`) — binary.
- Tracked `node_modules/` contents — counted and flagged (H5) but not audited file-by-file.
- `*/dist/` build outputs — skimmed only to detect src/dist drift (which surfaced the removed round-timeout feature, see C2).
- `package-lock.json` dependency tree CVE audit — `npm audit` not run against the network in this pass.

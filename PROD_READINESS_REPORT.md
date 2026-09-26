# Platyko — Production Readiness Report

Mission executed 2026-09-26 on `main`, from commit `ef6a809`. Every phase was verified with
`npm run build:packages`, `npm run typecheck:all`, `npm run lint`, `npm run test:all` (48 tests: 17 boot-gate,
3 auth-jwt, 28 mobile) and `npx knip`, all green at the final commit `3e89b45`. Both production images were
built from a clean Docker context on linux/arm64 and the boot gate was exercised inside the real image.

## 1. Fixed

### Phase 0 — Baseline (`af19c4c`)
- Baseline recorded: typecheck, lint, mobile tests green; backend and io had no tests; `npm audit` reported 21 high / 3 critical.
- `audit/surface-map.md`: every HTTP route and socket event with auth, validator, rate limit and scope.
- Found the hidden clean-clone assumption: nothing built `packages/*`, so a fresh clone failed typecheck and both old Dockerfiles only worked because gitignored `dist/` folders on this Mac were copied into the image.

### Phase 1 — Backend security (`2cd3f4f`)
- Refresh JWTs carry a random `jti`; two logins in the same second no longer 500 on `RefreshToken.tokenHash`. Covered by `packages/auth-jwt/src/signRefreshToken.test.ts`.
- Apple sign-in no longer accepts an email from the request body; only the verified identity-token claim counts. This closed a path where a caller could create or link an account under someone else's address. Google linking now also refuses an email already bound to an Apple ID (mirror of the existing Google check on the Apple side).
- Login and password-reset-confirm burn one bcrypt compare when the account does not exist, so timing no longer reveals whether an email is registered.
- Avatar upload checks JPEG magic bytes (the Content-Type header is client-controlled), has its own 10-per-15-min limit, and moved to `uploadAvatarHandler.ts` (the old file was 88 lines).
- Refresh and logout read only Zod-validated bodies; a wrong current password answers 400 instead of 401 (401 made the client rotate its tokens for nothing).
- Every request gets an `X-Request-Id`; the shared logger stamps `[rid=…]` on every line written inside that request (AsyncLocalStorage, zero handler changes). Unhandled errors answer `{ error: "Something went wrong", requestId }`; unknown routes answer JSON 404; malformed JSON is 400 and oversized bodies 413, all with generic text. Verified against the compiled app with sync and async throws.
- Emails are redacted from all server logs (key-based, covers request bodies and metadata); the Resend webhook logs a recipient count instead of addresses; expired tokens log as WARN without a stack.
- Production boot gate now rejects the `.env.example` secrets and any human-looking secret, identical access/refresh secrets, mis-shaped Resend key/webhook secret, the `postgres:postgres` dev credentials, `http://` or wildcard CORS, and `trustProxy` off. Both gates share one `assertStrongSecret`. 17 tests in `packages/server-kit`.
- Register rate limit keys off the config environment instead of `NODE_ENV`; graceful shutdown drains in-flight requests with a 10 s cap.
- `node-cache` (unused) removed. Vulnerable transitive packages bumped inside their semver ranges (axios, socket.io-parser, engine.io, ws, form-data, tar, shell-quote, undici, brace-expansion, js-yaml, nanoid, tmp, xmldom, defu, browserslist, vite, vitest): 0 critical and 7 high remain, all needing a major upgrade of `prisma` or `expo` (see section 2).
- `npm run build:packages` (ordered) runs in `postinstall`; a clean clone now typechecks and builds.

### Phase 2 — Error handling & leakage (`cce9331`, plus backend parts in `2cd3f4f`)
- `AppErrorBoundary` at the root of the mobile app: render errors show a calm screen with a Restart action instead of a white screen.
- All unauthenticated mobile requests (login, register, OTP, password reset) share one axios instance with a 10 s timeout; the avatar upload fetch aborts after 30 s.
- A stray 401 in guest mode can no longer wipe local XP/streak/lessons.
- Token persistence bug: tokens are now written to SecureStore whenever they change. Previously a token-only change (the re-login after "Set password") was skipped, leaving revoked tokens on disk and forcing a re-login at next cold start.
- Backend and io exit on unhandled rejections/exceptions (already the case) and now close cleanly on SIGTERM.

### Phase 3 — Real-time duel service (`4e4e7c0`)
- Every socket payload is type-checked (`payloadGuards.ts`); malformed input is ignored instead of throwing into a catch that logged ERROR (a free log-spam vector).
- `join_queue` no longer trusts the client username (an unbounded string was broadcast to the opponent).
- Server restart mid-duel: the server emits `no_active_duel` on connect when it holds nothing for that user; the client leaves the arena instead of waiting forever.
- Matches that never reached round 1 are no longer persisted as junk 0-round rows.
- `maxHttpBufferSize` 1 MB → 16 KB; `io.close()` awaited on shutdown.
- Confirmed already correct: JWT verified before connection, slot resolved from socket/user id, single-claim per round, 3-attempt cap, round/ready/rematch timeouts, all timers cleared on end/abandon, `IO_CORS_ORIGIN` honored and required in production.

### Phase 4 — Mobile UX & robustness (`14b8fdf`)
- Matchmaking shows "Can't reach the duel server" when the socket cannot connect (was an endless "Searching…" timer).
- Lesson **Check** and puzzle **Submit** are disabled while in flight; a double tap could award XP twice.
- Notification permission is requested when the first reminder is about to be scheduled (after onboarding, reminders on), not at cold launch; denial schedules nothing (new test).
- OTP inputs offer one-time-code autofill on iOS and Android.
- `app.json`: `ios.buildNumber`, `android.versionCode`, explicit camera/photo usage strings, `ITSAppUsesNonExemptEncryption=false`, notification default channel, secure-store plugin; `@expo/vector-icons` and `expo-system-ui` declared (both were already installed transitively).
- Confirmed: production URLs are `https://api.platyko.com` / `https://io.platyko.com` (wss via Socket.IO), no `console.*` outside the `__DEV__`-gated logger, no dev screens or test accounts, tokens in SecureStore, bundle id `com.idoyahav.platyko`.

### Phase 5 — Deployment (`64f429a`)
- Multi-stage `backend/Dockerfile` and `io/Dockerfile`: Node `22.23.3-bookworm-slim` pinned, workspace-scoped `npm ci` (no mobile deps, no patch-package), Prisma generate + package build in the builder, fresh `--omit=dev` runtime as the `platyko` system user with `NODE_ENV=production`. Both build from a clean clone (verified). Native modules use bundled linux-arm64 prebuilds.
- Root `.dockerignore` excludes node_modules, dist, the mobile app, env files, local config and tests; the two unused per-service `.dockerignore` files were deleted.
- `docker-compose.prod.yml`: Caddy auto-HTTPS, backend, io, Postgres 16 on a named volume, healthchecks, restart policies, cpu/memory limits, rotated json logs, read-only root fs, `no-new-privileges`, Postgres not exposed. `migrate` tool service runs `prisma migrate deploy` and the seed as explicit steps.
- `.env.example` documents every production variable (placeholders only); `DEPLOY.md` covers clean clone → running, release, rollback, backup/restore, log correlation, secret rotation. README updated.
- Gate verified inside the built image: `.env.example` secrets, identical secrets, dev DB credentials and `http://` origins are refused; real-shaped values pass (then fail only on the unreachable DB, as expected).

### Phase 6 — Secrets & hygiene (`3e89b45`)
- Full `git log -p` scan over all branches for API keys, JWTs, private keys, connection strings and `.env` files: **no real secret was ever committed** (details in section 3).
- `.gitignore` now covers `.env.production`, `eas.json`, `google-services.json`, `GoogleService-Info.plist`, `*.p12`, `*.p8`, `*.mobileprovision`, `*.jks`, `*.keystore`.
- knip runs clean: dead exports removed, three intentional dependency exceptions documented in `knip.config.ts`.

### Phase 7 — App Store readiness (no code changes needed)
- Privacy policy, terms and help pages at `platyko.com/{privacy,terms,help}/` all return 200 with real content.
- Account deletion is in-app (Profile → Danger zone, typed confirmation). Sign in with Apple is shown wherever Google is, on iOS. No "beta"/"test" strings, no external payment links.

## 2. Needs Ido's decision

1. **Registration reveals whether an email exists** (`409 Email already exists`). Same for login on social-only accounts ("Sign in with Google for this account"). Standard consumer-app UX, but it is an enumeration oracle. *Recommendation:* keep for launch; if you want to close it, register would always answer 202 and email existing users "you already have an account".
2. **Curriculum answers are public.** `GET /api/learning/exercises/:level` returns `correctAnswer` + `explanation` so guests can practice offline, and `/api/code-puzzles/all` returns `acceptedAnswers` for "Reveal answer". Anyone can farm lesson XP with a script. *Recommendation:* accept for a learning app; revisit only if XP ever becomes competitive.
3. **Guest snapshot is trusted at sign-up.** Register/Google/Apple accept `xpTotal` up to 100 000 and `streakCurrent` up to 365 from the client. *Recommendation:* cap migrated XP (e.g. 9 blocks × 10 exercises × 250 = 22 500) or accept.
4. **Logout signs out every device** (tokenVersion bump) and switches reminders off on that device. Keep, or move to per-device logout?
5. **Duel sockets are authenticated at connect only.** A user who logs out elsewhere stays in a running duel until the socket drops. *Recommendation:* accept (duels last minutes; access tokens are 15 min).
6. **Remaining `npm audit` highs:** `prisma`/`@prisma/config` (via `deepmerge-ts`, `effect`) need a downgrade to 6.12 or an upgrade to Prisma 7; `postcss` needs Expo 57. Both are tooling-side, not request-path code. *Recommendation:* schedule the Prisma 7 upgrade after launch.
7. **Runtime images are ~700 MB**: npm installs the linked packages' devDependencies (TypeScript, Prisma CLI) even with `--omit=dev`. Harmless; trimming needs a custom prune step.
8. **Infrastructure choices** for DEPLOY.md: host/region, S3 bucket name and public-read policy on `avatars/`, exact `CORS_ORIGIN`/`IO_CORS_ORIGIN` (I suggest `https://platyko.com`), Let's Encrypt email.
9. **Android Google sign-in** has no client id yet; the button explains that. Ship iOS-first or create the Android OAuth client first?
10. **Pre-existing files over 80 lines** (not touched by this mission): `mobile/src/redux/session-slice.ts` (125), `mobile/src/hooks/useLessonLoad.ts` (108), `mobile/src/hooks/useOnboardingWizard.ts` (107), `mobile/src/hooks/useLessonExerciseCompleteHandler.ts` (92). Split now or after launch?
11. **`CR_4PROD.md` and `.cursorrules`** (a byte-identical copy of CLAUDE.md) look like leftovers. Delete?

## 3. Must rotate

Nothing was ever committed. Specifically:
- The historical `io/.env` and `mobile/.env` held only `change-me`, a localhost `postgres:postgres` URL and a LAN IP. The README's old Postgres password is the compose default `postgres` — local only, not a secret.
- The `PRIVATE_KEY` matches in history are dotenv's README inside a once-committed `node_modules`.
- **On this Mac only** (gitignored, never in git): `backend/config/local.json` and `backend/.env` contain a live Resend API key (`re_h4…`) and webhook secret (`whsec_sT…`). They were never exposed, but since they are a dev key stored in plaintext, create a separate production key/webhook secret for `.env.production` rather than reusing them.

## 4. Manual test checklist (real iPhone, production build)

1. Fresh install, airplane mode on, open app → onboarding wizard appears; complete it → Home shows with the offline banner; no crash.
2. Airplane mode off → banner disappears within a few seconds.
3. Home → Learn → start a block as guest → answer one MCQ correctly → "+250 XP", streak becomes 1, Home stats update.
4. Kill and relaunch → XP, streak and lesson position persist.
5. Profile (guest) → toggle Notifications on → the system permission prompt appears now (not at launch). Deny it → no error; toggle stays as chosen.
6. Profile → Sign in → Register with a new email → OTP screen shows "Resend code in 60s" counting down; back to sign in works.
7. Enter a wrong code 5 times → "Too many wrong attempts. Request a new code."; Resend after cooldown → new code works → lands on Home signed in; guest XP was carried over.
8. Profile → Log out → Profile → Sign in with the same email and a wrong password → "Invalid credentials" (no hint that the email exists beyond the generic message).
9. Sign in correctly → Home loads server stats.
10. Tap "Check" twice very fast on a correct MCQ → only one "+250" is granted (button disabled while checking).
11. Home → Code Puzzle → submit a correct expression → XP granted; submit the same puzzle 11 times → 11th says "Well done!" with no XP.
12. Profile → avatar → Take Photo → image appears within a few seconds; kill/relaunch → avatar still shown.
13. Profile → Change Password with the wrong current password → "Current password is incorrect"; correct one → succeeds and you stay signed in.
14. Second device (or simulator) signed into the same account → device A's Profile → Log out → device B's next action returns to guest cleanly, no stuck spinner.
15. Sign in with Apple on a new Apple ID (with Hide My Email) → account created; sign out; sign in with Apple again → same account, no duplicate.
16. Sign in with Google → account created; sign out; email+password login with that address → "Sign in with Google for this account".
17. Forgot password → enter email → code screen; use code + new password → "Password updated"; Back to Sign In → login with new password works, old one fails.
18. Duel tab as guest → "Account Required" alert with Sign In / Register; as a signed-in user → Find a Match → after 25 s alone a solo duel starts.
19. During a duel, answer wrong 3 times → answer zone locks with "0 remaining"; round resolves when the 60 s timer ends.
20. During a duel, background the app for 5 s and return → same round continues or the round result shows; no white screen.
21. During a duel, turn airplane mode on → "Connection lost — reconnecting…"; after 8 s → back at Duel Home, no stuck screen.
22. Two real accounts duel → both see the same rounds; winner sees XP; results screen → Play Again on both → rematch starts.
23. Results → Play Again on one device only → after 60 s the other side sees "Opponent left" / expired, no hang.
24. Profile → Delete Account → type DELETE → returns to guest; the email can register again.
25. Open a link from the Help Center / Privacy / Terms rows → pages open in the browser.
26. Force a server error (stop the backend container) → Home shows "Could not reach the server… Retry" banner; start it → Retry loads stats.
27. On the server: `docker compose -f docker-compose.prod.yml logs backend | grep rid=` shows the request id from any 5xx you provoked, with the stack, and no email addresses anywhere in the logs.

## 5. Residual risks

- **Duel state is in memory on one io process.** An io deploy or crash ends every running duel (players see "Connection lost" then return to Duel Home; XP already granted is kept). Fine for one host; needs Redis or sticky sessions before scaling out.
- **Rate limits live in process memory**, keyed by client IP behind Caddy. Correct for a single instance; multiple backend replicas would each count separately.
- **Puzzle sandbox blocks the event loop** up to 100 ms per test case. Limited to 20 submissions/min/IP; a distributed flood could still degrade latency. Move evaluation to a worker thread if it becomes a problem.
- **No backend or io integration tests.** The gate, JWT helpers and mobile logic are tested; route behavior was verified by hand (probe scripts, image smoke tests) but is not automated. A supertest suite against the Express app would be the next best investment.
- **Docker images were built and smoke-tested on arm64 only.** The Dockerfiles are architecture-neutral (prebuilds exist for linux-x64) but were not exercised on an x86_64 host.
- **Refresh-token reuse revokes all of the user's sessions**, which is the safe response but means a flaky network double-refresh could log a user out of every device.
- **Backups are manual** (DEPLOY.md documents `pg_dump`). No monitoring, alerting or uptime checks exist yet; the health endpoints and request ids are ready for them.
- **Email deliverability** depends on the verified Resend domain; bounces are handled by the webhook, but there is no dashboard for stuck registrations.
- **Apple identity tokens without `email_verified`** are treated as having no email and are refused with a clear message; if Apple ever omits the claim for real users, sign-in would fail for them.
- **UX was verified by code walk and headless probes, not on a device.** The checklist above is the device pass.

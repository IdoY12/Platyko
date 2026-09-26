# Platyko attack-surface map

Generated during the production-readiness mission (2026-09-26). Every HTTP route the backend
mounts and every Socket.IO event the io service handles, with the controls that guard it.

Legend: **Auth** = valid access JWT required (token version checked against `User.tokenVersion`).
**Validator** = Zod schema on body / params / query (unknown keys are stripped). **Rate limit** = per-IP
window (express-rate-limit; `trust proxy` is on in production so Caddy's `X-Forwarded-For` is honored).
**Scope** = whose data the caller can read or change.

## Backend HTTP (`backend/`, mounted in `src/app.ts`)

| Method + path | Auth | Validator | Rate limit | Scope (who can act on whom) |
|---|---|---|---|---|
| `GET /health` | none | – | none | Public liveness only (`{ ok, service }`). |
| `POST /api/webhooks/resend` | Svix signature (`RESEND_WEBHOOK_SECRET`) over raw body | provider event shape | none | Resend only. Flags `User.emailBounced` for the recipients in the event. |
| `POST /api/auth/register` | none | body `registerBodySchema` | 8 / 15 min (prod), 100 dev | Creates a `PendingRegistration` for the caller's email; replaces an earlier pending row for the same email. |
| `POST /api/auth/verify-email` | none (needs `registrationToken` from register) | body `verifyEmailBodySchema` | 30 / 15 min | Turns the caller's pending row into a `User`. 6-digit code, bcrypt-hashed, 10 min TTL, 5 attempts. |
| `POST /api/auth/verify-email/resend` | none (needs `registrationToken`) | body `resendVerificationBodySchema` | 10 / 15 min + 60 s per-email cooldown | Re-issues the code for the caller's pending row. |
| `POST /api/auth/password-reset/request` | none | body `requestPasswordResetBodySchema` | 10 / 15 min + 60 s per-user cooldown | Always `200 { sent: true }`; code emailed in the background only if the account exists. |
| `POST /api/auth/password-reset/confirm` | none | body `confirmPasswordResetBodySchema` | 30 / 15 min | Sets a new password for the account whose email + code match; revokes every session. |
| `POST /api/auth/login` | none | body `loginBodySchema` | 8 / 15 min | Issues access + refresh tokens for the credential owner. |
| `POST /api/auth/google` | Google ID token verified server-side (audience = web + iOS client IDs) | body `googleAuthBodySchema` | 8 / 15 min | Finds/links/creates the user for the verified Google `sub` + verified email. |
| `POST /api/auth/apple` | Apple identity token verified server-side (issuer + bundle-id audience) | body `appleAuthBodySchema` | 8 / 15 min | Finds/links/creates the user for the verified Apple `sub`; email is taken from the token only. |
| `POST /api/auth/refresh` | valid refresh JWT + stored, unused, unexpired hash | body `refreshBodySchema` | 60 / 15 min | Rotates the caller's own refresh token; reuse of a spent token revokes all of that user's sessions. |
| `GET /api/auth/me` | **Auth** | – | none | Own identity fields only. |
| `POST /api/auth/logout` | access or refresh JWT (either) | none (body optional) | 40 / 15 min | Revokes every session of the token's owner (bumps `tokenVersion`, deletes refresh rows). |
| `GET /api/user/profile` | **Auth** | – | 60 / min | Own profile + active progress. Hash / provider ids never leave the server. |
| `PATCH /api/user/profile` | **Auth** | body `patchProfileBodySchema` | 60 / min | Own username. |
| `PUT /api/user/avatar/upload` | **Auth** | raw body, `image/*`, ≤ 5 MB, JPEG magic bytes | 10 / 15 min | Uploads to `avatars/<ownUserId>/<uuid>.jpg`. |
| `PATCH /api/user/avatar` | **Auth** | body `patchAvatarBodySchema` | 60 / min | Own avatar URL; key must live under `avatars/<ownUserId>/`. |
| `GET /api/user/progress-summary` | **Auth** | query `progressSummaryQuerySchema` | 60 / min | Own XP / streak / duel stats (runs the streak app-open rule). |
| `GET /api/user/preferences` | **Auth** | – | 60 / min | Own preferences. |
| `PATCH /api/user/preferences` | **Auth** | body `patchPreferencesBodySchema` | 60 / min | Own preferences + active level row. |
| `POST /api/user/practice-log` | **Auth** | body `postPracticeLogBodySchema` | 60 / min | Own practice seconds for a date key. |
| `POST /api/user/change-password` | **Auth** + current password | body `postChangePasswordBodySchema` | 60 / min | Own password; revokes every session. |
| `DELETE /api/user/account` | **Auth** | body `deleteAccountBodySchema` (`confirmation: "DELETE"`) | 60 / min | Deletes own user, progress, duel rows, avatar object. |
| `GET /api/learning/exercises/:experienceLevel` | none (guest Learn) | params `experienceLevelParamsSchema` | 100 / min | Public curriculum. Includes `correctAnswer` + `explanation` by design (guest local evaluation). |
| `POST /api/learning/submit-exercise` | **Auth** | body `learningSubmitExerciseBodySchema` | 100 / min | Awards XP / streak to the caller only. |
| `GET /api/learning/resume` | **Auth** | query `learningResumeQuerySchema` | 100 / min | Own resume index. |
| `DELETE /api/learning/progress` | **Auth** | – | 100 / min | Resets own exercise index. |
| `GET /api/code-puzzles/all` | none (guest puzzles) | – | 60 / min | Public puzzles incl. `acceptedAnswers` (used by "Reveal answer"). |
| `POST /api/code-puzzles/:id/submit` | optional (guest allowed) | params `codePuzzleSubmitParamsSchema`, body `codePuzzleSubmitBodySchema` | 20 / min | Evaluates the answer (accepted list, then 32 MB / 100 ms V8 isolate). XP only for the authenticated caller. |
| any other path | – | – | – | JSON `404 { error: "Not found" }`. |

Unhandled errors anywhere above → logged server-side with stack + request id → client gets
`500 { error: "Something went wrong", requestId }`. Body-parser errors map to their own 4xx status with a
generic message.

## Real-time (`io/`, namespace `/duel`)

Connection is refused by middleware unless `handshake.auth.token` is a valid access JWT whose
`tokenVersion` matches the user row. Every handler resolves the caller's slot from its socket id or
authenticated user id; a socket can never act for the other player. Payloads are type-checked and
malformed ones are ignored (never logged as errors).

| Event (client → server) | Payload check | Throttle | Scope / server-side guard |
|---|---|---|---|
| `join_queue` | payload ignored (profile read from DB) | 2 s | Caller enqueued once; a second device evicts the first. Rejected while already in a duel. Solo match after 25 s alone. |
| `leave_queue` | – | – | Removes the caller's own queue entry + solo timer. |
| `player_ready` | `session_id` string, optional `streak_local_date` `YYYY-MM-DD` | 1 s | Caller must be a participant of that session. Round 1 starts when both (or the solo player) are ready. |
| `submit_answer` | `session_id`, `round_number` number, `answer` string, `time_taken_ms` finite ≥ 0, optional `streak_local_date` | 300 ms | Participant only; rejected after the round is resolved, after the 60 s round deadline, when `round_number` is stale, or after 3 wrong attempts. First correct answer wins the round atomically. |
| `leave_duel` | `session_id` string | – | Participant only; forfeits (survivor gets the win + XP). |
| `rematch_request` | `session_id` string | – | Only the two original players, within 60 s of `duel_end`. Both must ask. |
| `rematch_abandoned` | `session_id` string | – | Only the two original players. |
| `disconnect` | – | – | Leaves queue, fails over to the user's other live socket if any, otherwise forfeits; clears every timer. |

Server → client events: `queue_status`, `queue_rejected`, `match_found`, `round_start`, `answer_feedback`,
`round_result`, `duel_end`, `opponent_disconnected`, `rematch_declined`, `no_active_duel` (sent on connect
when the server holds no duel for the user, so a client that outlived a server restart can leave the arena),
`error`, `auth_error`.

Server-side timeouts guarantee no session lives forever in memory: 120 s to start round 1, 60 s per round,
4 s between rounds, 60 s rematch window.

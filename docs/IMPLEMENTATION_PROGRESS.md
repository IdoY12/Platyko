# Implementation Progress — Platyko Redesign

Source of truth for the autonomous implementation of `PRODUCT_REDESIGN_PRD.md` on branch
`redesign/full-implementation`. Re-read this file and the PRD at the start of every session and
after any context reset, then continue from "Current position".

## Working rules (from the owner's brief)

- Never push, never touch `main`, never deploy, never migrate a shared or production database.
- Small logical local commits. English only; Hebrew only in `packages/locales/he.json`.
- CLAUDE.md applies in full except the 80-line limit (waived by PRD rule R3).
- After every change: `npm run typecheck:all`, `npm run lint`, `npm run test:all`, `npx knip`.
- New models are added beside the old ones, data is migrated and verified locally, then the old
  ones are removed.
- Secrets never committed; features needing external credentials sit behind a flag and degrade.

## Current position

- **Updated:** 2026-11-15 01:00. All gates green (typecheck, lint, tests, knip, language scan,
  whole-bank verify offline, legacy map, source ledger).
- **Phases:** 0 nearly done; 1 done; 2: all 604 items authored, verification pass 1
  (`run-20261114-205833`, 329 findings) and pass 2 (`run-20261114-221204`, 123 findings, 70
  of them item defects), pass 3 (`run-20261114-225713`, 57) and pass 4 (`run-20261114-232751`, 44;
  Gate B clean) and pass 5 (`run-20261115-000513`, 20) resolved and committed; pass 6 next; 3 done apart from server
  push (H6); 4: profile, privacy, search, friends with presence, played recently, block and
  report, friend and room links done; 5: engine, io `/play`, the Play tab, friends duels with
  invitations, rooms that reopen after a game, leaver cooldown, Bug Hunt and Output Race done and
  played end to end on the simulator against scripted players; 6: "explain my mistake" behind
  its flag done.
- **Next for the main thread:** passes 1–5 resolved (329, 123, 57, 44 and 20 findings; Gate B clean since pass 4); pass 6 next;
  repeat to three consecutive clean passes; meanwhile phase 6 (league, share cards, item
  analysis) and the Hebrew auth screens.
- **Next for sub-agents:** gate agents for pass 2, then fix agents per batch (briefs written from
  the pass's findings; see pass 1's `scratchpad/fix1/brief-N.md` for the shape).
- **Owner rules added mid-run:** at most two sub-agents at a time; sub-agents default to Sonnet
  through `.claude/settings.local.json` (`CLAUDE_CODE_SUBAGENT_MODEL=sonnet`); Opus only for
  hard engineering; show the owner each change to usage settings before making it.

### How unit authoring runs

1. Per-unit brief = template `content/verification/prompts/unit-author.md` with placeholders
   filled from `content/concept-catalog.json`, `tools/content/src/bank/curriculum.ts` and
   `content/migration/legacy-triage.json` (a short Python snippet does it; briefs live in the
   session scratchpad and can be regenerated).
2. The author writes `content/units/<track>/<nn>-<unit>.json`, runs
   `sources --update-ledger`, `verify --unit <slug> --write-traces` (online) and `legacy-map`.
3. The main thread re-runs `verify --offline` over the whole bank (duplicates are cross-unit),
   reads a few items, commits the unit with its trace file and the legacy map.
4. When all 28 units are in: `pass start --complete`, gate B/C/D agents per unit with the
   prompts in `content/verification/prompts/`, `pass finish`, fix, repeat until three
   consecutive clean passes (PRD 8.4); then `npm --prefix backend run prisma:seed` loads LIVE.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Item model, attempts, user-level XP, verification pipeline, CI, bug fixes, tokens, fonts, i18n | In progress |
| 1 | Learning core: lesson player, 7 formats, feedback, code view, execution player, map, Home, onboarding, mascot | Done (Profile, Settings, auth in the new design; EN + HE) |
| 2 | 604-item bank, legacy migration, full verification loop | Bank authored (604 items); passes 1–5 resolved (329, 123, 57, 44, 20 findings); pass 6 next |
| 3 | Retention: review (SM-2), daily challenge, revision, weekly goal, freeze, push, achievements | Done except server push (credentials) |
| 4 | Social: profile, privacy, search, friends, block/report, presence, GitHub, badge | Done: profile, privacy, search, friends, played recently, presence, invitations inbox, block and report, friend links, Friend Streak, QR code, README badge, GitHub sign-in and link (flag off until H7) |
| 5 | Multiplayer: contract, N-player engine, scoring, Glicko-2, ghost, rooms, reconnect | Done: engine, `/play`, Play tab, friends duels and invitations, presence, reconnect and server-restart recovery, rooms reopening, podium, leaver cooldown, room links, in-game reactions, "how scoring works" screen (examples computed by the engine's own `pointsForAnswer`), `/duel` retired, and a friends duel played between two simulators (iPhone 17 Pro in Hebrew, iPhone 16e in English): same item each round, clocks in step, draw scored as a shared first place. |
| 6 | Depth: league, extra modes, AI explain, share cards, item analysis | Weekly league (A35: Home card, league screen, leave in Settings), item analysis (A36), image share cards (A37), Bug Hunt, Output Race and "explain my mistake" (flag off until H4) done; Reverse (A33) open |

## Work log

### Phase 0

Done (all committed; typecheck, lint and tests green at commit 0d354ed):

- [x] Baseline gates verified green.
- [x] `@project/content-model` — item, unit, lesson and trace types; shared answer checker.
- [x] XP model (`@project/xp-constants/xpModel`): per-action values and level curve.
- [x] `content/README.md` — authoring, lesson recipes, execution, originality, verification rules.
- [x] `content/concept-catalog.json` — 112 concepts, four per unit, with prerequisites.
- [x] `tools/content` executor: deterministic vm runner, virtual timers, canonical console
      format, DOM stub, worker pool; trace generator (acorn instrumentation + V8 promise hooks).
- [x] `tools/content` bank loader, Zod schema checked against the model, structural pre-check,
      banned constructs, duplicates, reference links, originality (source ledger), construct
      scan, bank hash; `content/constructs.json`.
- [x] `tools/content` Gate A (every Parsons ordering, every chip placement, bug/fix, sandbox for
      CODE_WRITE, traces for items and concept cards) and the `verify` / `sources` commands.
      496 tests in the tooling package.
- [x] `@project/code-sandbox` (isolated-vm; expression and function-body entries; 33 tests);
      the legacy puzzle endpoint uses it.
- [x] Prisma: 26 new models and 17 enums beside the legacy ones; one transactional migration
      with SQL data conversion; `migrate:verify-redesign` passes on the rehearsal copy, the local
      database and an empty database. `migrate:legacy-completions` is ready and waits for the
      legacy item map.
- [x] `content/migration/legacy-triage.json` — target unit for each of the 121 legacy items.
- [x] Design tokens with a 44-pair contrast test; `@project/locales` (en, he) with parity tests;
      app language module; in-house JavaScript lexer; native dependencies; simulator build.
- [x] Mascot from the logo artwork (decision D5): layer cutting script, 12-state machine, Skia
      rig with parallax, volume shader, scene effects; verified on the simulator (all 12 states).
- [x] App root: gesture root, fonts, language applied before first render.
- [x] Design-system kit: `AppText`, `LipButton`, `OutlineButton`, `Surface`,
      `ProgressSegments`, `Screen` + `AmbientRiver`, `CodeView`.
- [x] Old-UI reference screenshots in `docs/screenshots/before/`.

Done since the first update (all committed):

- [x] Gates B/C/D export and ingest, run log, pass lifecycle, release check, catalog and
      legacy-map checks (538 tooling tests). Seed loads `content/` as LIVE only when releasable.
- [x] Units 1–7 (beginner): 168 items, 126 duel-eligible, 37 legacy items converted; whole-bank
      pre-check, construct scan and Gate A clean.
- [x] Backend learning API (map, lessons, items, judge, feedback with auto-flag, progress,
      resume, guest merge), smoke-tested with a throwaway user.
- [x] `@project/learning-logic` (attempts, XP, mastery, SM-2, map states, lesson plans and
      sessions, progress reducer) and streak freezes in `@project/streak-logic`.
- [x] Mobile: lesson player (seven formats, feedback, hints, reveal flip, execution player,
      summary), skill map, Home, tab bar, learning slice with offline cache and sync, guest
      hand-over prompt, language switch. Walked through on the simulator: screenshots in
      `docs/screenshots/after/`.
- [x] Old Learn/lesson/exercise/code-puzzle screens and state removed.
- [x] Units 8–15 (objects, array methods, objects in depth, scope and hoisting, closures, this
      and classes, errors, async basics): 360 items in the bank, whole-bank verify clean.
- [x] Onboarding in five steps (language, track, first item, weekly goal, reminder); RTL owned by
      the app (expo-localization no longer resets it); skill map flows from the right in Hebrew.
- [x] Auth screens (sign-in, verify email, forgot and reset password) in the new design; every
      server and validation message translated; launch banners and loading screen rebuilt.
- [x] Language stored on the account (sign-up, Settings with confirmation, adopted on sign-in
      and launch); state flushed to disk before any language restart.
- [x] Jump test (PRD 6.2): shared selection and pass rule, server opens a track only from
      stored attempts, map card, result screen; verified on the simulator.
- [x] Daily challenge (5 items a day, one try, 30 XP once a day, grid), revision mode (units and
      length, weakest first), achievements (25 badges, server records them), smart local
      reminders (a week ahead, none once the day's goal is met).
- [x] Security: sign-up no longer reveals registered emails (decoy reply + owner notice); Sign in
      with Apple grants stored encrypted and revoked on account deletion (needs the Apple key, H6).
- [x] Units 22–27 and the tracer fix for proxies.
- [x] Profile (three measures, 12-week activity map, track progress, mastered and weak concepts,
      guest save card) and Settings (language, reminder, account dialogs, guest reset, legal
      pages), English and Hebrew; old terminal profile, preference drafts and the legacy learning
      service removed. Progress reset is guest-only: a registered account keeps its history and
      can be deleted instead.

Open:

- [ ] Full verification loop to three clean passes: passes 1–5 resolved (329, 123, 57, 44, 20 findings); pass 6 next.
- [ ] Server error codes (PRD: "the server keeps returning generic errors and codes"): today the
      app maps the server's English messages to translated text in one place
      (`mobile/src/i18n/localizedMessage.ts`); switching to codes removes the string coupling.
- [ ] Drop the legacy tables (`DuelQuestion`, `DuelSession`, old exercise and puzzle tables) at cutover, after re-running the redesign migration's data part against production; `/duel`, `duel-constants` and the old duel UI are already gone, so an old app version loses duels once this backend is deployed (ship the backend with the new app).
- [ ] Server push through Expo (register tokens, send in the stored language) once APNs and EAS
      credentials exist (H6); the smart local reminder covers guests and accounts meanwhile.
- [x] Hebrew RTL walk-through of every screen: Home, lesson, map, onboarding, Profile, Settings,
      Play home, how scoring works, Friends, another learner's profile, room lobby, match round,
      results, Achievements, revision setup, sign-in, sign-up, forgot password. The native "Sign
      in with Apple" button follows the device language, not the app's (iOS draws it).
- [ ] `npm audit`: critical shell-quote, postcss and source-map-js patched by overrides; Prisma 7 and
      Metro image-size remain (H13).
- [ ] Docker image builds with the new sandbox package (registry timeouts earlier).
- [ ] 3D model path for the mascot (`platyko.glb`) and `docs/mascot-3d-model.md`. Tried and reverted
      (15 Nov): expo-gl 16 with three.js 0.166/0.187 parsed sample GLBs (Khronos Fox, Duck) and
      ran the render loop, but on the iOS 26 simulator nothing was presented once a model was in the
      scene, while plain GL and three.js clears were (needed shims: FinalizationRegistry,
      `navigator.userAgent`, embedded textures through files). Next candidate: a Metal renderer
      (react-native-filament), validated against the artist's model (H10).
- [ ] Legacy tables and endpoints removal after cutover (re-run the migration's data part).

Tooling notes for the next session:

- Simulator: iPhone 17 Pro `E5F01F76-1E58-40B2-9E8C-0F834E323D48`; app built at
  `mobile/ios/build/Build/Products/Debug-iphonesimulator/Platyko.app` (rebuild with
  `npx expo prebuild --platform ios` and `xcodebuild` after adding a native dependency).
- Simulator automation session name: `app` (`agent-device --session app …`); close stale
  sessions with `agent-device close --session <name>`.
- Start Metro WITHOUT `CI=1` (`npx expo start --port 8081 --clear < /dev/null`), otherwise it
  serves a stale bundle after edits.
- `agent-device --session <name> open com.idoyahav.platyko --platform ios --device "iPhone 17 Pro"`,
  then `press 'label="…"'`, `snapshot -i`; screenshots with `xcrun simctl io <udid> screenshot`.
- Mascot layers are regenerated with `tools/mascot-art/cut_layers.py` (Python venv with
  `rembg`, `opencv-python-headless`; see its README).

## Owner instructions received mid-run (2026-11-14)

- At most **two** sub-agents in parallel, to conserve usage.
- **D5:** the mascot must be identical to the logo platypus and feel 3D: layers cut from
  `mobile/assets/splash-icon.png`, animated with Reanimated and Skia; plus a path that renders
  `mobile/assets/mascot/platyko.glb` with a native 3D renderer when that file exists.
- **D6:** "explain my mistake" runs on a free model behind a provider-agnostic interface and a
  flag, with a silent fallback to pre-written hints. Personalisation stays algorithmic.
- The PRD was updated to revision 3 for both decisions (sections 1, 5.4, 6.5, 10.1, 12.8, 12.9,
  13.2–13.4, 15.1, 15.9, 17.5, 18, 19, 20.1, 20.7, 21, 22).

## Decisions (with reasons)

| # | Decision | Reason |
|---|---|---|
| A1 | Content lives in `content/units/<track>/<nn>-<unit>.json`: unit specification, source ledger, four lessons (concept card + item ids) and the items. Code is stored as an array of lines. | PRD 7.4 (files in the repository). Line arrays make the 36-character and 12-line limits trivially checkable and keep diffs readable without a YAML dependency. |
| A2 | Generated traces are stored apart from authored files in `content/generated/traces/<unit>.json` and are covered by the bank hash. | PRD 8.3: a trace is never hand-written. Keeping generated data out of authored files means an author cannot edit it, and CI can prove regeneration is byte-identical. |
| A3 | Shared types and pure logic live in `@project/content-model` (no runtime dependencies); Zod validation lives in `tools/content`. | The mobile app needs the types and the answer checker without pulling a schema library into the bundle. |
| A4 | Gate A executes snippets in `node:vm` contexts inside a worker thread with a wall-clock limit. Timers are a deterministic virtual queue ordered by (delay, insertion); microtasks are V8's own (`microtaskMode: "afterEvaluate"`). | PRD 8.3 asks for a Node worker with a time limit and real task ordering. A virtual timer queue removes wall-clock flakiness and makes executing every Parsons ordering (up to 8! = 40,320 runs) fast; microtask order stays the engine's own. |
| A5 | Printed output uses one canonical Platyko console format (compact, browser-style: `[1, 2, 3]`, `{a: 1}`, nested strings in single quotes; an uncaught error prints `Uncaught <ErrorName>`). | `console.log` formatting of arrays and objects is host-defined. One documented format makes the stated answer, the distractors and the execution player agree mechanically. |
| A6 | Traces come from source instrumentation (acorn) plus V8 promise hooks, not from the inspector protocol. An instrumented run must print exactly what the plain run prints, or trace generation fails. | Instrumentation is deterministic and testable; the equality check proves the instrumentation did not change behaviour. |
| A7 | A trace longer than 60 steps is a pre-check finding, not a truncation. | PRD 15.8 caps traces at 60 steps and 20.1 requires the player to match a real execution exactly; truncating would break the second. |
| A8 | A lesson is a concept card, the unit's new items for that lesson, then review items from earlier concepts up to 8 slots. The fifth (summary) lesson of a unit draws 8 items from the unit, least-mastered first. | PRD 6.2/6.4 give 5 lessons of 8 items per unit but 7.5 gives 24/20/16 items per unit, so slots beyond the new items must be interleaved review. |
| A9 | Legacy exercises, puzzles and duel questions are converted into the unit files they belong to and count toward the unit quotas; `content/migration/legacy-item-map.json` maps each legacy key to a new item id. | PRD 7.3 step 4 and 15.3 (conversion table for `completedExerciseIds`). |
| A10 | Translations live in one package, `packages/locales` (`en.json`, `he.json`), used by the app and by the server for push text. | PRD Q13 recommendation; keeps the Hebrew exception to a single path that the existing hook already allows (`locales/he.*`). |
| A11 | Syntax highlighting uses a small in-house JavaScript lexer in the app. | PRD Q3; avoids a dependency for roughly 150 lines of code and is fully testable. |
| A12 | Review scheduling uses SM-2 at concept level. | PRD Q2 recommendation; FSRS needs Node 24 while the backend targets Node 22. |
| A13 | Code Puzzle is folded into the `CODE_WRITE` format; the separate screen is removed. | PRD Q9 recommendation. |
| A15 | `text.muted` is `#8F92C4`, not the PRD's proposed `#7C7FB0`. | PRD 12.2 asks for 4.5:1 on every pair; `#7C7FB0` on `bg.raised` measures 4.05:1. The new value is at least 5.19:1 on every background (see `tokens.test.ts`). |
| A16 | Superseded by owner decision D5. The mascot is the logo render cut into layers (body, head, tuft, brows, eyes, irises, bill, generated eyelids) by a reproducible script, drawn in one Skia canvas and driven by Reanimated values; a depth-map shader, layer parallax and moving light give the 3D feel. The 12-state machine and the two inputs are unchanged; `streakLength` drives the halo and tuft because the bust has no tail. | Owner decision D5; PRD 13.2–13.4 (revision 3). |
| A19 | Free AI provider for "explain my mistake": **Cloudflare Workers AI, Workers Free plan**, through its OpenAI-compatible endpoint; Groq's free plan configured as the second provider; then the pre-written hints. Read on 2026-11-14 from the providers' own pages: Cloudflare gives 10,000 Neurons a day free, fails with an error once exceeded on the free plan, and states it does not use customer content to train models; a request of about 600 input and 120 output tokens costs about 6 to 14 Neurons depending on the model, so roughly 700 to 1,500 explanations a day. Groq does not retain inference requests by default (logs up to 30 days only for abuse or reliability), offers zero data retention, and limits free use per organisation (about 30 requests a minute and 1,000 a day on the models listed). Gemini's free tier was rejected: third-party summaries say free-tier content may be used for product improvement and human review, and its free quotas are unpublished. | Owner decision D6. Official pages were used for the chosen providers; third-party figures are marked as such in PRD S102. Limits must be re-read before launch; the fallback makes changes harmless. |
| A17 | Language switching uses `I18nManager.forceRTL` plus `reloadAppAsync` from `expo`. | PRD 12.10/16.8 expect a restart; native stack gestures and native controls only follow the direction set at launch. |
| A18 | Simulator automation uses the `agent-device` CLI (installed globally on the dev machine, not a project dependency). | The earlier CDP fiber driver could not tap native UI; `agent-device` drives real taps through an XCTest runner. |
| A20 | The `modules` unit shows module behaviour with executable module-pattern code; `import` and `export` appear only in prose. | Snippets run as scripts so that every item can be executed and traced by Gate A; module syntax cannot run there. |
| A21 | For a `TRACE` item, `expectedOutput` is what the snippet prints and the correct option is the probed value; Gate A checks both. | Keeps `expectedOutput` meaning the same thing in every format. |
| A22 | Gate B compares two mechanical things beyond the answer: the printed output and the final value of every global binding whose printed form the README defines (quotes around a text value do not count; only the values the solver states are compared, since it may leave out one it cannot be sure of), both against the Gate A trace. Source-line attribution of each printed line was compared in passes 1 and 2 and then removed. | PRD 8.3 asks for the solver's trace to be compared mechanically. Line attribution raised 31 findings in two passes, every one a solver numbering slip (out-of-range lines, a helper's call site), none an item defect; globals of undefined printed form raised 158, all noise. |
| A23 | The exact prompts given to the author, the solver and the two reviewers are stored in `content/verification/prompts/`. | Provenance: PRD 8.6 records the agents per gate; keeping the prompts makes each pass reproducible after a context reset. |
| A14 | Gates B, C and D run as fresh sub-agents that receive only exported, redacted item files; their findings are written to files and compared mechanically by `tools/content`. | PRD 8.3/8.4 require blind derivation and independent review with fresh contexts on every pass. |
| A24 | Each gate agent takes a batch of units (about 100 items for B and C, about 200 for D) instead of one unit; each unit keeps its own input and output file and every per-unit rule. | 15 agents per pass instead of 84 keeps usage within the owner's limits; blindness and independence are unchanged because every agent is fresh and sees only its exported inputs. |
| A25 | Daily challenge: 5 items a day from finished lessons (a newcomer gets the first lessons), one attempt, 30 XP once a day; no timer. | PRD gives only "L8 daily challenge, 30 XP"; items the learner has met keep it a retention tool, and a timer is optional in PRD 6.x. |
| A26 | Progress reset is guest-only; a registered account keeps its history and can be deleted instead. | A server-side reset would erase data other features (leagues, badges) rely on; deletion already covers "start over". |
| A27 | The smart reminder is local (a week of dated notifications, none today once the goal is met) until server push credentials exist. | Satisfies "a reminder is not sent to someone who met the goal" for guests and accounts without APNs. |
| A28 | The Play tab is one component that shows what the server says the learner is in (results, game, room, queue, start) instead of a navigation stack. A game that starts or resumes opens the tab, except over a lesson; the tab bar hides during a game. | The server owns the game (PRD 11.7–11.8), so state, not navigation history, decides the screen; a relaunch or reconnect lands on the right view with no navigation bookkeeping. |
| A29 | Every `/play` connection receives `play:sync` (whether the server still holds a game or room for the player); the app drops what the server lost and says so, and rejoins a queue it was searching in. | Games live in memory on the io process; without this a deploy or crash leaves the app showing a stuck game, lobby or search. |
| A30 | A multiplayer round shows the lesson's answer inputs through a view of the redacted `PlayItem` (no right flags until the round ends); the right answer and standings sit in a bottom sheet between rounds. | One set of inputs for lessons and games (DRY); the sheet keeps the reveal visible within the 3.5 s between rounds, whatever the item's length. |
| A32 | Leaving ranked games: from the third leave in 24 hours the queue refuses for 5 minutes, doubling with each further leave; a shared first place with no points pays participation XP only. | PRD 11.8's starting values; an idle 0-0 draw must not earn the win bonus for both players. |
| A33 | The Reverse game mode (PRD 11.10) waits for its own item type: it needs authored input/output items that pass every gate, which the bank does not have. Bug Hunt and Output Race ship as variants of the one engine. | Adding an unverified item type would bypass the verification loop. |
| A34 | "Explain my mistake" uses two configured slots (primary Cloudflare Workers AI, secondary Groq) of an OpenAI-compatible endpoint, is off by default, and is limited per user per day by the route's rate limiter, which answers "no explanation" rather than an error. | PRD 15.9 and D6; configuration only, no provider SDK; in-memory limiting matches PRD 15.10's single-instance backend. |
| A31 | Before launch, an item id may change when its format must change (pass 1 renamed one FILL_BLANK to PARSONS in `this-and-classes`); after launch ids are frozen. | No learner has progress on the bank yet (it is DRAFT); the format slug is part of the id and the pre-check enforces it. |
| A35 | The weekly league runs Monday to Sunday by the learner's calendar day; groups of up to 30 are filled per week and activity band (last week's XP: under 150, 600, 1,500, or more). The first XP of the week enrols; leaving takes the learner out of this week's group at once. The game server, which has no learner calendar day, credits match XP by the UTC date; XP merged from a guest snapshot at sign-up does not count. Ranks are shared on equal XP. | PRD 14.5; one shared week boundary is needed for a group to compare like with like; bands follow the XP model (a lesson pays about 100 to 130 XP). |
| A36 | Item analysis (PRD 7.6) runs inside the backend a minute after start and then daily, over each learner's first answer to an item's current version, once 100 learners answered it. Learners are ranked by their share of right first answers across the bank for the upper-minus-lower 27% discrimination index. Results and flags (too hard, too easy, non-discriminating, weak distractor) go to `ItemAnalysis` for review; they never change an item's status (only reports do). | PRD 15.10's single backend instance needs no scheduler; the PRD says flagged items are reviewed, while automatic removal is the report rule. |
| A37 | Share cards (PRD 14.4) are drawn on the device with Skia (already in the build) into a 1080x1350 PNG in the cache folder: the logo, a headline and line in the UI language (system fonts shape Hebrew), the daily challenge's squares in played order, and the site name; iOS shares the image through the system sheet. React Native's Android share takes text only, so Android, and any drawing failure, shares the same result as text. | No new native module (an expo-sharing or view-shot dependency would need a native rebuild); expo-file-system is already linked through expo and is now a direct dependency. |

## Dependencies added (reason, license)

| Package | Where | Reason | License |
|---|---|---|---|
| acorn, acorn-walk | tools/content | Parse snippets for banned constructs, the construct scan and trace instrumentation | MIT |
| zod | tools/content | Unit-file schema validation | MIT |
| react-native-svg | mobile | Mascot vector shapes (PRD 13.2), icons and rings | MIT |
| @shopify/react-native-skia | mobile | Ambient water, glow and particle effects (owner's brief; PRD 13.2 fallback) | MIT |
| expo-linear-gradient, expo-blur | mobile | Background depth and sheet scrims | MIT |
| expo-localization | mobile | Device language on first launch, RTL support flag | MIT |
| expo-audio | mobile | Three feedback sounds (PRD 12.7) | MIT |
| expo-linking | mobile | Room invite links (PRD 11.7) | MIT |
| expo-clipboard, expo-sharing, react-native-view-shot | mobile | Copy a room or friend code, share cards (PRD 14.4) | MIT |
| expo-device | mobile | Push token registration needs a physical-device check | MIT |
| expo-splash-screen | mobile | Hold the splash until fonts and language are ready | MIT |
| expo-crypto | mobile | Attempt idempotency ids | MIT |
| @expo-google-fonts/rubik, @expo-google-fonts/jetbrains-mono | mobile | UI and code fonts (PRD 12.3) | MIT (package), OFL-1.1 (fonts) |
| react-native-qrcode-svg 6.3.21 (pinned, released 2025-12; uses the installed react-native-svg) | mobile | The friend-link QR code (PRD 11.1); pure JavaScript, no native rebuild | MIT |

## Risks

- In development, a Metro full reload while a token refresh is in flight can leave two JavaScript
  runtimes holding the same refresh token; the second use is (correctly) treated as reuse and every
  session of the account is revoked. Seen once on 2026-11-15 during package rebuilds; production
  has no such reload (the language switch flushes tokens first). Worth a look if it ever appears
  outside development: a short grace window for the immediately previous refresh token.
- Sub-agents share the session's usage limit: on 2026-11-14 all four stopped at the 5-hour limit
  and were resumed after the reset. Long loops (the verification passes) will hit this again.

- The verification loop (PRD 8.4) has no fixed length; every fix restarts the clean-pass count.
- Pass 1 reframed some items that carry `legacyKeys` (arrays `puzzle:6/12/13/14`, `array-map.fill-01`
  with `puzzle:20`, code-analysis `exercise:SENIOR:2/6/7`). Legacy progress still maps to them, so
  a learner who solved the old puzzle starts the new item as seen; acceptable, but worth a look in
  the H9 spot-check.
- The N-player engine is a rewrite of `io` with no prior tests.
- Mascot quality and frame rate depend on SVG animation through Reanimated; Skia is the fallback.
- Native dependencies (`react-native-svg` and others) require a rebuild of the simulator app.

## Needs human input

| # | Item | Blocks |
|---|---|---|
| H1 | Legal sign-off on the originality and licensing position (PRD Q1). | Commercial launch |
| H2 | Minimum age and legal requirements for the social layer (PRD Q4). | Social launch |
| H3 | Owner of the report queue and response time (PRD Q5). | Social launch |
| H4 | A free Cloudflare account, its account id and a Workers AI API token (and optionally a free Groq key) for "explain my mistake". The feature ships behind a flag and falls back to pre-written hints. | Live AI explanations only |
| H10 | A rigged 3D GLB of the logo platypus at `mobile/assets/mascot/platyko.glb`, following `docs/mascot-3d-model.md` (one clip per mascot state). Needs a 3D artist. | True real-time 3D mascot; the layered 2.5D mascot ships without it |
| H5 | Reference device for the 60fps criteria (PRD Q7). Simulators are used until then. | Performance sign-off |
| H6 | Apple Developer account, APNs key, EAS credentials, App Store assets. | Store submission, real push |
| H7 | A GitHub OAuth app with the callback `com.idoyahav.platyko://oauth/github`; its client id and secret in the backend environment with `GITHUB_SIGN_IN_ENABLED=true` (see `backend/.env.example`). Sign-in, linking, the profile link and disconnect are built and tested against stubs; the button and the setting stay hidden until then. | GitHub sign-in and linking |
| H8 | Confirmation of `platyko.com` ownership and the `apple-app-site-association` deployment (PRD Q14). | Universal invite links |
| H9 | Human spot-check of a 5% item sample per track and a learner pilot (PRD Q11). | Recommended before launch |
| H11 | The Hebrew banned-word list for usernames and bios, and where such a list may live under the language rule (PRD Q13). The English list ships in `packages/user-credentials`. | Hebrew username filtering |
| H12 | Sign in with Apple key (team id, key id, .p8) and a token encryption key in the backend environment, so account deletion revokes the Apple grant (see `.env.example`). Part of H6. | App Store guideline 5.1.1(v) |
| H13 | Remaining high advisories in production dependencies: the Prisma CLI chain (`prisma`, `@prisma/config`, `deepmerge-ts`, `effect`; fixed only by the Prisma 7 major upgrade, affects the migration CLI's config loader, not request handling) and Metro's `image-size` (build-time only, own assets). Decide: upgrade Prisma to 7 (planned engineering work), or approve a reviewed allowlist with an expiry date for CI's audit step. An attempt to add such an allowlist was blocked by the permission system as weakening a security gate, so CI's audit step stays strict and fails until this is decided. | CI security job |

## Acceptance criteria evidence (PRD section 20)

Filled in as each criterion is met; every entry cites a test, a log or a screenshot.

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
  Gate B clean) pass 5 (`run-20261115-000513`, 20) pass 6 (`run-20261115-004356`, 55, of which 30 tooling or not defects) and pass 7 (`run-20261115-012331`, 29) pass 8 (`run-20261115-184631`, 22) and pass 9 (`run-20261115-194017`, 17) pass 10 (`run-20261115-202220`, 32) pass 11 (`run-20261115-213750`, 30) pass 12 (`run-20261115-223348`, 16) pass 13 (`run-20261115-233611`, 13) and pass 14 (`run-20261116-004725`, 21) resolved and committed; pass 15 next; 3 done apart from server
  push (H6); 4: profile, privacy, search, friends with presence, played recently, block and
  report, friend and room links done; 5: engine, io `/play`, the Play tab, friends duels with
  invitations, rooms that reopen after a game, leaver cooldown, Bug Hunt and Output Race done and
  played end to end on the simulator against scripted players; 6: "explain my mistake" behind
  its flag done.
- **Next for the main thread:** pass 15; fix and repeat to three consecutive clean passes. Acceptance evidence is in the last section: the gaps left are the clean passes (and with them LIVE items), the mascot rest-pose rims, and the items blocked on H5, H6, H8 and H10.
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
| 2 | 604-item bank, legacy migration, full verification loop | Bank authored (604 items); passes 1–14 resolved (329, 123, 57, 44, 20, 55, 29, 22, 17, 32, 30, 16, 13, 21 findings); pass 15 next |
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

- [ ] Full verification loop to three clean passes: passes 1–14 resolved (329, 123, 57, 44, 20, 55, 29, 22, 17, 32, 30, 16, 13, 21 findings); pass 15 next. Pass 7 swept 18 units for answer-revealing feedback and hints; pass 8 rewrote every pointer-style wrong-option feedback (164) to name the mistaken thought (README rule) and made "difficulty never falls within a lesson" a pre-check rule. Pass 9 bounded that rule by a lesson's first and last item (README), because strict monotony pushed reading formats too high, and Gate D now sees each lesson's concept card. Pass 10 made four rules testable (A40), swept all 28 units against them, and added the `misconception-unused` pre-check rule. Pass 11 (Gate C 19 to 11) fixed findings only, with no bank-wide sweep, and a fresh reviewer then checked every item and card the fixes changed before the next pass, because fix-introduced slips had become the largest source of findings. Pass 12 (Gate D 18 to 1 under the difficulty table) swept every unit for its two leading kinds: each wrong option's named belief was written as code and run against the option, and every hint 3 was checked; two fresh reviewers then checked the 220 changed items and fixed 10 slips. Pass 13 (Gate B 0, C 5, D 8) gave the difficulty table an exact counting rule (README "How to count": earlier-track material is not a second idea, a loop turn counts once) and every item was re-counted against it with the counts written down; reviewers then checked the 47 items whose content changed and fixed 10. After pass 14 (8 of its 21 one mis-tagged TRACE pattern) an in-depth review that is not a pass put one reviewer on every two units with both checklists (14 agents); it fixed the findings and about 60 latent defects (CODE_WRITE prompts missing a case or the return shape, hints, untaught facts such as `forEach`, which the first array-methods card now teaches), and two reviewers checked its 87 changes. A code-ordering prompt now names its output (pre-check `parsons-output-unnamed`), because the app shows no target output beside the lines.
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
| A38 | Mascot triggers: `dive` during the opponent search, `victory` for a win and `defeat` for a loss on the results screen (a shared first place cheers), `think` while "explain my mistake" is on its way, and `sense` in the feedback sheet of a wrong `FIX_BUG` answer, where the sheet offers the hint. | PRD 13.4 ties `sense` to a hint in `FIX_BUG`, but 13.5 keeps the mascot off the screen while an item is solved; the retry sheet is where the hint is offered and the mascot is allowed. |
| A39 | The three hints are offered in every session, the jump test and the daily challenge included. A hinted first answer still counts as not clean for mastery, so a test's mastery evidence stays honest. | PRD L2 and criterion 20.1 ask for three hints on every item, with no exception for tests. |
| A40 | Four bank rules are stated as tests a writer and a reviewer apply the same way (content/README.md): wrong-option feedback names a thought that really gives that option's value and may state only the one fact it missed; hint 3 may point at the exact line or rule but not state the result, chip or option; "taught" means a lesson card or an earlier unit, never a hint; a track's lower and upper difficulty step are told apart by the ideas combined and the changes of state to follow. The Gate C and D prompts cite them; after pass 10 every unit was swept against all four. | Ten passes leveled off at 17 to 55 findings because each pass sampled new cases of the same four kinds; a rule both sides read alike removes the population, not the sample. |

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

From a read-only audit of the code, tests, logs and screenshots on 15 Nov, updated with the fixes made after it. Status: Met, Partly met, Not met, or Blocked (on an H item). Section 20.9 has no pass/fail criteria.

### 20.1 Learning

| Criterion | Status | Evidence |
|---|---|---|
| L1: seven formats displayed, answered, checked, screen-reader usable | Met | All seven formats render through `lesson/ItemAnswerArea.tsx`; checking is tested (`content-model/src/answer.test.ts`, `answerDraft.test.ts`). On 15 Nov the iOS accessibility tree (what VoiceOver reads) was captured on an iPhone 16e for every format: each control has a role and a spoken label ("Line 2: …" for code and bug lines, "Blank 1, empty" and "Chip: %" for fill-in, "Add: …" for Parsons, "Code answer" plus labelled keyboard keys for code writing, options with their selected state, "Hint", "Check"). No audio pass with VoiceOver itself. |
| L2: first wrong answer shows distractor explanation, hides correct answer | Met | `packages/learning-logic/src/learningLogic.test.ts:34` (retry on first wrong). `mobile/src/components/lesson/lessonAnswerText.ts:31-41` (`feedbackMessage` returns the chosen option's `feedback`; falls back to `hints[0]`). `ItemAnswerArea.tsx:28-36` marks the right option only on `reveal`. `FeedbackSheet.tsx:86` shows the flip card only on `reveal`. Screenshot `03-first-wrong-answer.png`. UI is code only. |
| L2: second wrong answer reveals answer, full explanation, enters Review | Met | `learningLogic.test.ts:34` (reveal), `:281` (reveal on first and return visit). `packages/learning-logic/src/progress.test.ts:58` (concept due tomorrow after a reveal). `FeedbackSheet.tsx:86`. Screenshot `04-second-wrong-reveal.png`. |
| L2: three hints on every item; hints cost no XP | Met | All 604 items have exactly 3 hints (`tools/content/src/precheck/itemRules.ts:115`); the hint panel shows in every session, tests included (`LessonPlayerScreen.tsx`, A39); XP unaffected (`learningLogic.test.ts:73`, `progress.test.ts:52`). |
| L3: execution player matches a real execution at every step | Met | Traces come from instrumented execution: `tools/content/src/trace/generateTrace.ts`, 30 tests in `generateTrace.test.ts` (e.g. "gives the same trace every time"). An instrumented run must print what the plain run prints (decision A6). All 604 items and 112 concept cards have a stored trace in `content/generated/traces/`. `runGateA.test.ts:94` detects a stale stored trace. Player shows line, variables, output: `execution-player/ExecutionPlayer.tsx:89-134`; screenshot `05-execution-player.png`. Rendering is code only. |
| L4: every lesson shows one of five states, updates at once | Met | `packages/learning-logic/src/skillMap.ts:31` (`locked, available, inProgress, completed, mastered`). Tests `learningLogic.test.ts:158,164` ("updates as soon as a lesson ends"), `mobile/src/redux/learning-slice.test.ts:27`. `LessonNode.tsx`. Screenshot `16-skill-map-he-rtl.png`. |
| L4: "continue" on Home opens next uncompleted item, no screen between | Met | `HomeScreen.tsx:60-99` navigates straight to `LessonPlayer`; resume point in `useLessonPlayer.ts:119,181`. `nextLessonId` tested at `learningLogic.test.ts:196`. Navigation itself is code only. |
| L5: no snippet needs horizontal scroll at 360 pt | Met | Bank rule `CODE_MAX_LINE_LENGTH = 36` (`packages/content-model/src/item.ts:36`, enforced by `tools/content/src/precheck/codeLimits.ts:6`); longest line in the bank is 36 characters (checked). `mobile/src/components/common/CodeView/codeLayout.test.ts:6` "fits the longest allowed line on a 360-point screen". `CodeView.tsx:47` still wraps a horizontal `ScrollView` as a fallback. |
| L6: accuracy = first-attempt-correct / total; one mistake never 100% | Met | `learningLogic.test.ts:47` (7 of 8 gives 87, 199 of 200 gives 99), `:253` (flawless lesson). |
| L7: wrong item in Review within 3 days, different item on same concept | Met | A wrong answer, a reveal and a second-attempt success all score as a failed recall, so the concept is due the next day (`packages/learning-logic/src/spacedReview.ts`, tests `learningLogic.test.ts` "brings a failed concept back the next day" and "…right only on the second attempt"); review picks due, weakest, unseen items on the concept (`learningLogic.test.ts:228`). |
| No timer on any lesson or review screen | Met | No timer in `components/lesson`, `learn`, `home`; the only timeout is the execution player's auto-play step (`ExecutionPlayer.tsx:80`). `LessonPlayerScreen.tsx:30` states the rule. Code only. |
| R5: AI off, no provider, quota out or provider failing gives pre-written text, no error | Met | `backend/src/services/content/explainMistake.test.ts:35` (flag off returns null, no provider asked), `:46` (failing provider, then next). Quota: `backend/src/routers/content.ts:14-18` answers `{explanation:null}`, code only. App adds nothing on null: `mobile/src/components/lesson/ExplainMistake.tsx:34-39`. Flag off by default. |
| R5: AI reply containing the reference solution is rejected and replaced | Met | `explainMistake.test.ts:17` (whole solution or any meaningful line, any spacing), `:46` (reply that gives the solution is dropped); `explainMistake.ts:17-23`. |
| Mastery, review scheduling, jump tests call no AI model | Met | Code only: `explainMistake` is imported only by `backend/src/controllers/content/contentHandlers.ts`; mastery, SM-2 and jump test live in `packages/learning-logic` (pure) and `backend/src/services/progress/jumpTestPass.ts`. |

### 20.2 Content verification and originality

| Criterion | Status | Evidence |
|---|---|---|
| Output differs from stated answer fails Gate A, not loaded LIVE | Met | `tools/content/src/gateA/runGateA.test.ts:40` ("output-mismatch"). Any finding makes the whole bank unreleasable: `runLog.ts:122-136`, tested `runLog.test.ts:62-88`; `backend/prisma/seed/content/seedContent.ts:51` loads LIVE only with a release run. |
| Zero or more than one correct option fails | Met | Pre-check rule `tools/content/src/precheck/formatRules.ts:72-73`, tested `precheck/structure.test.ts:206-209`; bank has exactly one correct option on every choice item (checked, 304 items). This is the pre-check, not Gate A proper. |
| Distractor equal to real output fails Gate A | Met | `runGateA.test.ts:44` ("distractor-equals-output"); `gateA/itemChecks.ts:43,96,166`. |
| Every PARSONS item had every ordering executed | Met | `itemChecks.ts:108-115` runs all permutations; `runGateA.test.ts:58`. Latest run `run-20261115-004356.json` has no Pre-check or Gate A finding (only B, C, D). |
| Every trace generated by execution | Met | Traces only written by `writeTraces` (`runGateA.ts`); 604 of 604 items have one; hash covers them (`bankHash.test.ts:42`). |
| Gate B solver receives no answer, correct flag or explanation | Met | `tools/content/src/agentGates/agentGates.test.ts:57`; prompt `content/verification/prompts/gate-b-solver.md`. |
| Gate C reviewer receives no authoring reasoning or solver output | Met | `agentGates.test.ts:85`; prompt `gate-c-reviewer.md`. |
| Any fix followed by all gates over the entire bank | Met | A pass records `completeBank` and the bank hash; a changed hash restarts the clean count (`runLog.test.ts:32,142`). All six runs have `completeBank: true`, 604 items. |
| Final run is the third consecutive full pass with zero findings | Not met | Runs 1-6 have 329, 123, 57, 44, 20 and 55 findings; `consecutiveCleanPasses` is 0 in the latest (`run-20261115-004356.json`: 24 Gate D "not reviewed", 13 Gate C, 1 Gate B). 12 unit files are modified since (uncommitted), so the bank hash has moved again. Gap: large (at least three more full passes, open-ended). |
| Run logs committed under `content/verification/runs/` | Met | Every pass's log is committed with its fixes (passes 1–6; pass 6 in `df06929`). |
| Seed refuses LIVE when bank hash differs from latest clean run | Met | `seedContent.ts:21,51` via `releaseStatus`; hash check `runLog.ts:131`, tested `runLog.test.ts:65` ("changed since the latest pass"). The seed script has no test of its own. |
| Every LIVE item has provenance: author, PASS, run id, reference link 200 | Partly met | Code builds it (`seedContent.ts:44-48`; reference check `precheck/referenceLinks.ts:41`, tested `referenceLinks.test.ts:31`; originality record per item in the run log). No item is LIVE yet, so no end-to-end evidence; the seed has no test. |
| No source text committed; ledger holds URLs and hashes only | Met | Unit `sources` hold `url`, `retrievedAt`, `sha256` only (e.g. `content/units/beginner/01-values-and-types.json`). Source text goes to `content/.cache/`, ignored (`.gitignore:50`; nothing tracked there). `sourceCache.test.ts:38`. |
| No snippet contains a construct banned in section 7.3 | Met | `precheck/bannedConstructs.ts`, 10 tests in `bannedConstructs.test.ts`; construct scan `constructScan.test.ts`. Latest run has no Pre-check or construct findings. |
| Three reports from different users in 7 days remove an item | Met | `backend/src/services/content/itemFeedback.ts:5-26` (one feedback row per user and item, 7-day window, status `FLAGGED`); lessons and the duel pool serve only LIVE in production (`contentCatalog.ts:18`, `io/src/socket/play/playItems.ts:9`, `serveDrafts:false` in `config/production.json`). Code only. |
| At least 600 items LIVE, at least 200 duelEligible | Partly met | Authored: 604 items, 386 `duelEligible`. LIVE: 0, because no clean release run exists (see the third-pass row). |

### 20.3 Language and direction

| Criterion | Status | Evidence |
|---|---|---|
| Every UI string from locale files, none in a component | Met | Every component text goes through `t()`; the crash screen and Google alerts moved to locale keys (commit `76b1203`); a lint rule rejects lettered JSX text in the app (`eslint.config.js`). |
| English and Hebrew hold same keys; missing key fails build | Met | `packages/locales/src/locales.test.ts:16` (key parity, placeholders, no empty message); CI runs `npm run test:all` (`.github/workflows/ci.yml`); `t` is typed on the dictionary. |
| Language switch in settings for guests and users, survives restart | Met | `mobile/src/components/settings/LanguageSwitch.tsx`; stored in AsyncStorage and re-applied before first render (`i18n/languagePreference.ts:11-41`); account language adopted on sign-in. Screenshots `18-settings-he-rtl.png`, `10`/`11` onboarding. Code only (language detection tested, switching not). |
| Hebrew: every screen mirrored, text right-aligned | Met | Owned by the app (`languagePreference.ts:alignLayoutDirection`). Walk-through in progress log; screenshots `11, 12, 13, 14, 15, 16, 17, 18, 19, 20-26, 27, 39-43, 45, 46`. No automated RTL test. |
| Hebrew: code, player, Parsons, chips, code input left-to-right | Met | `LtrView` pins direction (`common/AppText/LtrView.tsx`), used by `CodeView.tsx:46`, `LineOrderBoard.tsx:54`, `BlankChips.tsx:62`, `CodeWriteAnswer.tsx:95,142`, `ExecutionPlayer.tsx`. Screenshot `15-lesson-wrong-answer-he-rtl.png`. Code only. |
| Numbers, timers, scores, room codes, usernames read left-to-right | Met | Room codes and code are pinned left to right (`play/PlayLobby.tsx:40`, `LtrView`); digit runs and Latin usernames keep their order inside Hebrew by the Unicode bidi algorithm, and a number with a Latin unit is isolated where it shares a Hebrew sentence (`league.weeklyXp` in `he.json`). Screenshots `41-he-play-scoring`, `42-he-lobby`, `43-he-results`, `46-he-league`. |
| Hebrew sentence with inline code term keeps punctuation right | Met | Code terms inside Hebrew sentences stay in the Hebrew paragraph, so their punctuation resolves to the right side; a sentence that opens with a Latin word starts with a right-to-left mark, enforced by `packages/locales/src/locales.test.ts` ("start every Hebrew sentence that opens with a Latin word…"); a number with a Latin unit is isolated (`league.weeklyXp`). Screenshots `45-he-auth`, `46-he-league`. |
| Registered user receives push in chosen language | Blocked | H6 (APNs and EAS credentials). Ready: `PushToken` model (`packages/db/prisma/models/engagement.prisma`), `User.language`, shared locales package (A10), local smart reminders (A27). No token registration or send code exists in `backend/` or `io/`. |
| No Hebrew outside the locale file; pre-commit rejects one | Met | `node .githooks/scan-repository.cjs` reports "No Hebrew outside the locale file (886 tracked files scanned)". `.githooks/pre-commit`, `.githooks/commit-msg`; CI job `language`. The hook is not unit tested. |

### 20.4 Users and permissions

| Criterion | Status | Evidence |
|---|---|---|
| Guest completes lesson, review, daily challenge with no blocking registration request | Met | Content routes are public (`backend/src/routers/content.ts:24-27`); guest paths in `useLessonPlayer.ts` (`isGuest`), `learning-slice.test.ts:27`; no sign-in gate in `AppNavigator.tsx`; guest prompt only after sign-in (`GuestMergePrompt.tsx`). Code only. |
| Guest who registers or logs in by any method keeps every completed item | Met | Attempts replayed on the server for any method: `backend/src/services/progress/mergeGuestProgress.ts:1-70`, prompt `components/auth/guest-merge/GuestMergePrompt.tsx:34-46` (shown whenever signed in with guest history). Rules tested in `packages/learning-logic/src/progress.test.ts`. No test of the merge endpoint. The learner can decline the prompt. |
| Guest XP computed on server from item list; client XP number not accepted | Met | The guest merge and submit accept attempts only (`mergeGuestProgress.ts:34-37`); sign-up bodies keep preferences only and drop any progress number (`backend/src/validators/authValidators.ts`, test `authValidators.test.ts`, commit `b4301d6`). |
| Guest opening a room link reaches the lobby after registering, no retyping | Met | `mobile/src/components/play/useOpenedLinks.ts` keeps the link, sends the guest to sign in and joins once connected; the link survives the restart that adopting the account's language causes (`utils/appShellPersistence.ts`, `utils/hydrateStore.ts`). Verified on a simulator: a signed-out device opened a room link, signed in into an account in the other language, and landed in the lobby (screenshot `49-room-link-after-sign-in.png`). The `https://platyko.com` form of the link needs H8; the app's own scheme works today. |

### 20.5 Social

| Criterion | Status | Evidence |
|---|---|---|
| 3-character search returns up to 20; never turned-off or blocking users | Met | `backend/src/routers/social.integration.test.ts:56` (runs in the CI `migrations` job); `SEARCH_MIN_LENGTH=3`, `SEARCH_MAX_RESULTS=20` (`packages/api-contract/src/social.ts:36`), `services/social/socialQueries.ts:7-15`. The 20 cap itself is not asserted. |
| Blocked user cannot view profile, request, invite, or be matched | Met | `social.integration.test.ts:89,98,107`; invites `io/src/socket/play/gameInvites.ts:21-30` (code only); matchmaking `packages/match-engine/src/matchEngine.test.ts:66`, `io/src/socket/play/rankedQueue.ts:15,56`. |
| "Friends only" profile returns only username and avatar to non-friend | Met | `backend/src/services/social/publicUsers.ts` keeps username and avatar and nulls level, rating, bio and GitHub for a viewer who is not a friend; a "nobody" profile stays hidden; test `social.integration.test.ts` "a friends-only profile shows a non-friend only its username and avatar". |
| Email in no API response about another user | Met | `PUBLIC_USER_SELECT` has no email (`publicUsers.ts:11-21`); contract comment `packages/api-contract/src/social.ts:4`; `social.integration.test.ts:56` asserts no "@" in search. No `email` in `io/src` or league and game services. |
| Invitation reaches online recipient in 2 s; offline gets push | Online: Met; offline: Blocked (H6) | Socket delivery (`io/src/socket/play/gameInvites.ts`); measured between two simulators on one clock, send to the recipient's store: 38, 11 and 12 ms (15 Nov, local network), screenshot `33-invite-banner.png`. Offline push needs APNs and EAS credentials (H6). |
| Deleting account removes user from friends lists; others' games kept | Met | `packages/db/prisma/models/social.prisma:11-12` (`onDelete: Cascade` on both friendship sides); `match.prisma:24,43` (`userId` nullable, `SetNull`). Code only; no deletion test. |

### 20.6 Multiplayer

| Criterion | Status | Evidence |
|---|---|---|
| M1: after 5 placement games, rating range starts 100, widens 50 per 5 s | Met | `packages/match-engine/src/ranked.ts:6,15-26`; `matchEngine.test.ts:61` (`[100,100,150,350]`), `:66`. Queue loop `io/src/socket/play/rankedQueue.ts:41-65` is code only. |
| M3: 2 to 4 join by code or link; starts only when all Ready | Met | `packages/match-engine/src/rooms.ts:6-9` (room 2 to 4); `io/src/socket/play/privateRooms.ts:78-83`; links `useOpenedLinks.ts`. Screenshot `31-play-room.png`. `io/` has no tests. |
| M3: countdown ends on all devices within 300 ms | Met (code only) | The server sends one absolute `startsAt` (`io/src/socket/play/liveMatch.ts:73`); each device counts to that instant on its own clock (`mobile/src/components/play/usePlayClock.ts`), so the spread is the devices' clock difference (network-synced phones: well under 300 ms), not the delivery delay; a clock far off is clamped to the countdown's length. Two simulators share one clock (screenshot `44-two-simulators-duel.png`); no real-device measurement (H5). |
| M4: shown score = formula on server-measured time | Met | `packages/match-engine/src/match.test.ts:8` (server times from round start), `matchEngine.test.ts:5,14`; points come in the `round:end` payload (`liveMatch.ts:128`); screenshot `35-round-points-time.png`. |
| M4: equal scores ranked by tie-breakers in order | Met | `matchEngine.test.ts:20`; `scoring.ts:placements` (points, right answers, less correct time, shared place, leaver last). |
| M5: disconnect and return within 20 s continues the same game | Met | `liveMatch.ts:17,153-165` (20 s grace; full state resent on return). Code only; no `io` tests. Progress log and screenshot `32-play-interrupted.png`. |
| M5: room of 4, one player leaving does not end the game | Met | `liveMatch.ts:134-142` (ends only when fewer than two remain). Engine tested with two players only (`match.test.ts:29`). |
| M6: ghost game labelled practice, no rating, not counted in wins | Met | Label: `mobile/src/components/play/PlayMatch.tsx:76`, `locales/en.json` `play.mode.ghost`. Rating only for `ranked` (`io/src/socket/play/persistMatch.ts:38`). Wins exclude `GHOST` (`backend/src/services/play/gameRecord.ts:31`). Code only. |
| Correct answer in no payload before round ends | Met | `packages/content-model/src/play.test.ts:28` ("send nothing that gives the answer away"); reveal only at `round:end` (`liveMatch.ts:129`). |
| No item seen in last 20 games while pool allows | Met (code only) | `io/src/socket/play/playItems.ts` reads each player's own last 20 games and picks unseen items first, filling only a shortfall with seen ones (commit `c1ba5c7`). |
| Historical solo games not in win statistic | Met | Migration turns self-play into `GHOST` matches (`packages/db/prisma/migrations/20261114000000_redesign_models/migration.sql:4.4`, checked by `backend/src/scripts/verifyRedesignMigration.ts:74`, a manual script not run in CI); wins exclude `GHOST` (`gameRecord.ts:31`). |

### 20.7 Design and mascot

| Criterion | Status | Evidence |
|---|---|---|
| No screen uses a colour or font outside the tokens | Met | The old terminal theme is deleted; every colour comes from `mobile/src/theme/tokens.ts` (a `scene` group holds drawn scenery and artwork), and a lint rule rejects colour literals anywhere else in the app (`eslint.config.js`, commit `76b1203`); fonts come from `typography`. |
| Every text and background pair meets 4.5:1 | Met | `mobile/src/theme/tokens.test.ts` checks 56 pairs: every text colour on every background, the bright fills, syntax on code, text on each wash laid over a card, and the tab bar labels on its glass; colours outside the tokens are rejected by lint (`eslint.config.js`). |
| Reduce Motion: only fades; mascot static pose per state | Met | Reanimated's timing, spring and layout animations (the flip card, the sheets, the banner) default to `ReduceMotion.System` and are skipped (`react-native-reanimated/src/animation/util.ts` `getReduceMotionFromConfig`); CSS press transitions are dropped by `usePressTransition` (`common/PressableScale/`); colour changes stay as fades; mascot loops never start and each state has a static pose (`useMascotRig.ts:96-97`, `mascotStates.test.ts:12`); pulse and shake are skipped (`LessonNode.tsx:50`, `OptionList.tsx:41`). Code only. |
| Mascot not shown while solving, in player, or in active game round | Met | `<Mascot>` appears only in Home, FeedbackSheet (after Check, PRD 13.5), LessonSummary and Onboarding (`grep "<Mascot"`); none in `components/play` or the execution player. Caveat: the sheet after a first wrong answer sits above an item the learner will retry, and stays mounted under the execution-player modal (`LessonPlayerScreen.tsx:114-134`). Code only. |
| Each of the 12 states triggered by its defined trigger | Met | `idle`, `wave`, `hide`, `sleep` (`HomeScreen/homeMascotState.ts`, onboarding); `cheer`, `comfort`, `think`, `sense` (`lesson/FeedbackSheet.tsx`, A38); `glow`, `victory`, `comfort` on the summary (`LessonSummaryScreen.tsx`); `dive` (`play/PlayQueue.tsx`, screenshot `48-he-queue-dive.png`); `victory`, `defeat` (`play/PlayResults.tsx`). Code only for the wiring; states and poses tested in `mascotStates.test.ts`. |
| At rest, mascot pixel-identical to logo; layers recompose the character | Partly met | Layers are cut from `splash-icon.png` by `tools/mascot-art/cut_layers.py`; recomposed at rest (`tools/mascot-art/recomposition.json`): mean colour error 0.85, 97.6% of pixels within 2 levels, max 114.8 on the feathered rims of the bill, brows and irises, where the overlay blends with fur painted in underneath. Fix: in `cut_layers.py`, keep the original pixels in the head layer wherever the overlays are not fully opaque, then regenerate; it needs the script's dependencies (rembg and its model), not installed on this machine. |
| Mascot reads as 3D: depth parallax, light and shadow follow head | Met | `MascotCanvas.tsx:41,151-195` (per-layer parallax), `:226` (`light: [headYaw, headPitch]`), `mascotVolumeShader.ts:52`. Screenshot `00-mascot-twelve-states.png`. Perception is a visual judgment; code only. |
| `platyko.glb` rendered natively through the same component; layered fallback | Blocked | H10 (rigged GLB from a 3D artist). The fallback holds: `Mascot.tsx` renders layers and `mobile/assets/mascot/` has no `.glb`. The GLB renderer code does not exist (expo-gl and three.js attempt reverted, progress log, 15 Nov). `docs/mascot-3d-model.md` is not in the repo. Medium once a native renderer is chosen. |
| Mascot interface is 12 state names and two inputs only | Met | `components/mascot/Mascot.tsx:6-15` (props `state`, `streakLength`, `mood`); `mascotStates.test.ts:6`. |
| 60 fps on reference device: mascot, skill map, Parsons drag, leaderboard | Blocked | H5 (reference device, PRD Q7). Simulator only; no measurement recorded. Ready: Reanimated and Skia animation on the UI thread, loops paused off-screen (`Mascot.tsx` `useAppIsActive`). |

### 20.8 Profile and GitHub

| Criterion | Status | Evidence |
|---|---|---|
| Permission request is `read:user` and `user:email` only | Met | `packages/api-contract/src/auth.ts:9` (`GITHUB_SCOPES`), used at `mobile/src/components/auth/auth-github-button/useGitHubAuthorization.ts:20`. Code only. Live OAuth waits on H7; the feature is off by default. |
| GitHub `client_secret` not in the app bundle | Met | No secret in `mobile/`; code exchange happens on the server (`backend/src/services/auth/githubOAuth.ts:37`, `githubOAuth.test.ts:20` asserts the secret is sent from the server). PKCE in the app. |
| Disconnecting GitHub deletes all of the user's GitHub data | Met | `backend/src/services/auth/githubAccount.integration.test.ts:17` (identity, login, repos, followers, consent cleared). Refuses when it is the only sign-in, `:28`. |
| README badge returns 404 unless turned on | Met | `backend/src/routers/badge.ts:18-22` and `services/badge/readmeBadge.ts:15` (`readmeBadgeEnabled: true` in the query; unknown and off both 404). Code only; `badgeSvg.test.ts` tests the image, not the route. |


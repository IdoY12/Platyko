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

- **Phase:** 0 — Foundations and trust (most of it done; see the open list below), with phase 1
  (mobile learning core) and phase 2 (bank authoring) started in parallel.
- **Baseline (2026-11-14, HEAD 4bff66a):** typecheck, lint, 28 tests and knip all green.
- **Local data before migration:** 2 users, 3 `UserProgress`, 2 `DuelSession`, 90 `Exercise`,
  21 `CodePuzzle`, 10 `DuelQuestion`.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Item model, attempts, user-level XP, verification pipeline, CI, bug fixes, tokens, fonts, i18n | In progress |
| 1 | Learning core: lesson player, 7 formats, feedback, code view, execution player, map, Home, onboarding, mascot | Not started |
| 2 | 604-item bank, legacy migration, full verification loop | Not started |
| 3 | Retention: review (SM-2), daily challenge, revision, weekly goal, freeze, push, achievements | Not started |
| 4 | Social: profile, privacy, search, friends, block/report, presence, GitHub, badge | Not started |
| 5 | Multiplayer: contract, N-player engine, scoring, Glicko-2, ghost, rooms, reconnect | Not started |
| 6 | Depth: league, extra modes, AI explain, share cards, item analysis | Not started |

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

Open in phase 0:

- [ ] `tools/content` agent gates B/C/D (export, ingest, comparison), run log, pass commands,
      release check, catalog and legacy-map checks — sub-agent running (brief: gates B/C/D).
- [ ] Pilot unit `values-and-types` — sub-agent running; then fan out the other 27 units, two
      authors at a time, from `content/verification/prompts/unit-author.md`
      (per-unit briefs are generated from the template, the catalog and the triage file).
- [ ] CI workflow, repository-wide Hebrew scan.
- [ ] Backend: content, lesson, attempt and progress endpoints on the new models; seed from
      `content/`; guest snapshot by item ids; merge on any login; section 2 bug fixes.
- [ ] knip is red only for the new mobile kit and mascot, which no screen imports yet; it turns
      green when the phase 1 screens land (do not suppress).
- [ ] Docker image builds with the new sandbox package could not be verified (registry
      timeouts); re-run `docker build -f backend/Dockerfile .` and `-f io/Dockerfile .`.
- [ ] 3D model path for the mascot (`platyko.glb` through a native 3D renderer) and
      `docs/mascot-3d-model.md`.

Tooling notes for the next session:

- Simulator: iPhone 17 Pro `E5F01F76-1E58-40B2-9E8C-0F834E323D48`; app built at
  `mobile/ios/build/Build/Products/Debug-iphonesimulator/Platyko.app` (rebuild with
  `npx expo prebuild --platform ios` and `xcodebuild` after adding a native dependency).
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
| A22 | Gate B compares three mechanical things beyond the answer: the printed output, the source line that printed each output line, and the final value of every global binding, all against the Gate A trace. | PRD 8.3 asks for the solver's trace to be compared mechanically; a full step-by-step comparison would raise false findings from step-granularity differences, while these three are well-defined. |
| A23 | The exact prompts given to the author, the solver and the two reviewers are stored in `content/verification/prompts/`. | Provenance: PRD 8.6 records the agents per gate; keeping the prompts makes each pass reproducible after a context reset. |
| A14 | Gates B, C and D run as fresh sub-agents that receive only exported, redacted item files; their findings are written to files and compared mechanically by `tools/content`. | PRD 8.3/8.4 require blind derivation and independent review with fresh contexts on every pass. |

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

## Risks

- Sub-agents share the session's usage limit: on 2026-11-14 all four stopped at the 5-hour limit
  and were resumed after the reset. Long loops (the verification passes) will hit this again.

- The verification loop (PRD 8.4) has no fixed length; every fix restarts the clean-pass count.
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
| H7 | GitHub OAuth app (client id and secret). Feature ships behind a flag. | GitHub sign-in |
| H8 | Confirmation of `platyko.com` ownership and the `apple-app-site-association` deployment (PRD Q14). | Universal invite links |
| H9 | Human spot-check of a 5% item sample per track and a learner pilot (PRD Q11). | Recommended before launch |

## Acceptance criteria evidence (PRD section 20)

Filled in as each criterion is met; every entry cites a test, a log or a screenshot.

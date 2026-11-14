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

- **Phase:** 0 — Foundations and trust (in progress).
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

- [x] Baseline gates verified green.
- [x] `@project/content-model` — item, unit, lesson and trace types; shared answer checker (7 tests).
- [x] XP model (`@project/xp-constants/xpModel`): per-action values and level curve (3 tests).
- [x] `content/README.md` — authoring, execution, originality and verification rules.
- [ ] `tools/content` executor, canonical formatter, DOM stub, worker pool, trace generator — sub-agent running.
- [ ] `tools/content` bank loader, schema, pre-check, originality, construct scan, bank hash — sub-agent running.
- [ ] `tools/content` Gate A, gates B/C/D export and ingest, run log, CLI — after the two above.
- [ ] `@project/code-sandbox` (isolated-vm, expression and function-body entries) — sub-agent running.
- [ ] Prisma: new models beside the old ones, SQL data conversion, verification script — sub-agent running.
- [ ] Legacy content (90 + 21 + 10) converted to items and passing pre-check and Gate A.
- [x] Design tokens (`mobile/src/theme/tokens.ts`) with a 44-pair contrast test.
- [x] `@project/locales` (en, he): lookup, plural forms, key and placeholder parity tests (9 tests).
- [x] App language module (`mobile/src/i18n`): device default, stored choice, RTL via reload.
- [x] In-house JavaScript lexer for the code view (11 tests).
- [x] Native dependencies installed, iOS project regenerated, simulator build succeeds.
- [x] Old-UI reference screenshots in `docs/screenshots/before/`.
- [ ] Fonts loaded at startup; base components; mascot rig.
- [ ] CI workflow, repository-wide Hebrew scan.
- [ ] Section 2 bug fixes (accuracy, progress loss on login, solo wins, XP loopholes).

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
| A16 | The mascot is a stack of static SVG layers, each inside an animated view; motion is view transforms and opacity only. | Transforms and opacity run on the UI thread without re-rendering SVG each frame, which is what keeps 60fps realistic. Still vector shapes and code only, with `react-native-svg` as the single mascot dependency (PRD 13.2). |
| A17 | Language switching uses `I18nManager.forceRTL` plus `reloadAppAsync` from `expo`. | PRD 12.10/16.8 expect a restart; native stack gestures and native controls only follow the direction set at launch. |
| A18 | Simulator automation uses the `agent-device` CLI (installed globally on the dev machine, not a project dependency). | The earlier CDP fiber driver could not tap native UI; `agent-device` drives real taps through an XCTest runner. |
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
| H4 | AI provider key and monthly budget for "explain my mistake" (PRD Q6). Feature ships behind a flag. | Live AI explanations |
| H5 | Reference device for the 60fps criteria (PRD Q7). Simulators are used until then. | Performance sign-off |
| H6 | Apple Developer account, APNs key, EAS credentials, App Store assets. | Store submission, real push |
| H7 | GitHub OAuth app (client id and secret). Feature ships behind a flag. | GitHub sign-in |
| H8 | Confirmation of `platyko.com` ownership and the `apple-app-site-association` deployment (PRD Q14). | Universal invite links |
| H9 | Human spot-check of a 5% item sample per track and a learner pilot (PRD Q11). | Recommended before launch |

## Acceptance criteria evidence (PRD section 20)

Filled in as each criterion is met; every entry cites a test, a log or a screenshot.

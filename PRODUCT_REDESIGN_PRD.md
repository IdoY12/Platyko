# Platyko — Product Redesign PRD

- **Date:** 14 November 2026 (revision 2)
- **Status:** Draft for product-owner approval. Specification only; no application code has been changed.
- **Basis:** Full code scan of `mobile/`, `backend/`, `io/`, `packages/` (HEAD `a514004`) and web research carried out on the date above.

## How to read this document

Every claim and requirement carries one of these tags:

| Tag | Meaning |
|---|---|
| **[VERIFIED]** | Existing state confirmed in the code, with a file reference |
| **[REQUIRED]** | Explicitly requested by the product owner |
| **[DECIDED]** | A decision the product owner made on 14 November 2026 |
| **[RECOMMENDATION]** | Professional recommendation of the specification team |
| **[ASSUMPTION]** | Needs verification before implementation |
| **[REJECTED]** | Considered and recommended against, with the reason |

Research sources are numbered in section 22 and cited as (S1), (S2) and so on. A source read only through a search-result summary, not the page itself, is marked "snippet" there.

## Standing rules and owner decisions

| # | Rule or decision | Where it applies |
|---|---|---|
| R1 | **Scope:** there is no "later" bucket. Everything specified here is in scope. The phases in section 19 are a dependency order. Only items tagged **[REJECTED]** are out of scope. | Whole document |
| R2 | **Language:** no Hebrew anywhere in the repository — code, comments, docs, commit messages, branch names, PR text. The only exception is the Hebrew UI locale resource files, which hold user-facing front-end strings only. The rule is recorded in `CLAUDE.md` and enforced by a pre-commit check. | Whole repository |
| R3 | **File length:** the 80-line limit in `CLAUDE.md` is waived for this PRD and for the work it describes, where needed to reach the goal. | This PRD and its implementation |
| D1 | The app supports **English and Hebrew with RTL**. The user chooses the language in settings. Code is always shown left-to-right. | Section 12.10 |
| D2 | The name stays **Platyko** and the platypus mascot stays. | Sections 12, 13 |
| D3 | The mascot is **designed and animated by the AI agent**, keeping all 12 states. | Section 13 |
| D4 | The question bank is **written and verified by the AI agent** under a zero-defect standard. | Sections 7, 8, 9 |

---

## 1. Executive Summary

**What exists today.** Platyko is a working React Native app on solid engineering: full authentication (email with OTP, Google, Apple), guest mode, lessons, Code Puzzles in a secure sandbox, and a live Socket.IO duel. The weakness is the product, not the engineering:

- The content bank is small: 90 lesson exercises, 21 puzzles and only 10 duel questions.
- 84 of the 90 exercises are static multiple-choice questions.
- A wrong answer shows only "Try again." with no explanation and no hint.
- The mascot does not appear on any screen inside the app.
- There is no social layer: no friends, search, invitations, rooms or public profile.
- "Weekly Goals" do not exist in the code. There is only a daily minutes goal.

**What changes.** Four changes that together make the product a different experience:

1. **Active learning in place of a quiz.** Seven question formats (predict output, trace, reorder lines, fill blank, fix bug, write code, concept question), an explanation tailored to each mistake, and a visual execution player that shows how the code runs.
2. **A trustworthy question bank.** One unified, original bank. No item goes live until the whole bank passes every verification gate in three consecutive clean runs (section 8), and every item passes an originality check (section 9).
3. **The platypus as a living character.** A 2D vector mascot with 12 animated states, whose behaviours come from real platypus traits: an electro-sensing bill that finds bugs, a dive while searching for an opponent, a glow on milestones.
4. **Social play.** Friends, invitations, skill-rated duels, friend duels and private rooms for 2–4 players with a live leaderboard.

The app ships in English and Hebrew with RTL **[DECIDED]**.

**What stays.** All the infrastructure: Express, Prisma, PostgreSQL, Socket.IO, isolated-vm, the token model, guest mode and the shared streak logic. No architecture replacement is recommended.

**Three critical caveats to know up front:**

- **A real-time 3D mascot is rejected.** The research found favours 2D characters, and the performance and production cost is not justified (section 13).
- **An agent-made mascot will be simpler than the current icon art.** It will be a flat vector character, not the 3D-style render used in the app icon (section 13.2).
- **XP as it stands is not trustworthy.** It can be collected without learning (section 2.6), so no ranking or league may rest on it before the fix in phase 0.

---

## 2. Current State Analysis (As-Is)

Everything in this section is **[VERIFIED]** in the code.

### 2.1 Architecture

| Layer | State |
|---|---|
| Mobile | React Native 0.81.5, Expo 54, React 19.1, Redux Toolkit, React Navigation 7, Reanimated 4.1. No Lottie, Rive, Skia, SVG or audio library. |
| Backend | Express 5, Prisma, PostgreSQL 16, Zod, JWT HS256. No backend tests (`"No tests configured yet"`). |
| Real-time | Separate `io/` service, Socket.IO 4.8, single `/duel` namespace, about 1,230 lines, no tests. |
| Deployment | Planned as one EC2 server with Docker Compose (Caddy, backend, io, Postgres). Per `HANDOFF.md`, production is not deployed yet. No CI, no Redis, no monitoring. |

### 2.2 Screen map

- **Navigation:** four tabs — Home, Learn, Duel, Profile (`MainNavigatorTabs.tsx`). Code Puzzle is reachable only from a Home tile.
- **Onboarding:** three steps — level (JUNIOR/MID/SENIOR), goal, daily minutes (10/15/25). Runs once per device. **The chosen goal affects nothing afterwards.**
- **Permissions:** only Duel is blocked for guests, through `guardDuelAccess` (`utils/formatHelpers.ts:20-30`), which shows a native `Alert`.

### 2.3 Home screen

- Daily minutes goal, streak with a 7-dot row, level and XP bar, and three entry tiles.
- **There are no Weekly Goals.** Searching the code for `week` returns nothing. The 7-dot row is not tied to weekdays and disappears once the streak passes 7 (`utils/dailyXpStreakCore.ts:9-18`).
- "Continue Learning" only switches to the Learn tab; it does not resume.

### 2.4 Learning experience

| Topic | Existing state |
|---|---|
| Structure | 3 blocks per level, 10 exercises per block. Block titles are hardcoded in the client (`useLearnRoadmapData.ts:12-28`). |
| Roadmap | Each block has only a "Start" button. No completion, lock, progress or "current block" state. |
| Exercise types | `MCQ` and `PUZZLE` only. The lesson "PUZZLE" is pick-a-word from 4 options, not code writing. |
| Code display | Regex highlighting for 13 keywords, strings and numbers. No line numbers, height capped at 170px, line wrapping based on an assumed character width. |
| "Live Output" | A panel showing a fixed placeholder. Code is never executed; after a correct answer it types out the explanation. |
| Wrong answer | "Try again." only. No explanation, hint, attempt limit or answer reveal. |
| Correct answer | Green colour, MatrixBurst animation and a Next button. |

**Bugs found:**

- **Accuracy and stars are always 100% and 3 stars.** Wrong attempts are never counted (`usePickOneLessonExercise.ts:52-56`).
- **A guest who logs in by email to an existing account loses local progress.** Only register, Google and Apple migrate it (`services/auth.ts:24`, `dispatchSignInSuccess.ts:41-51`).
- **The "Lessons" profile stat is never updated on the client**, and on the server it is really `currentExerciseIndex`.

### 2.5 Code Puzzle

- 21 puzzles, all beginner one-line expressions, with no level, explanation or hint.
- A single-line input with no code keyboard and no token chips. The screen shows no code snippet, only a prompt.
- Evaluation is on the server, for guests too: match against `acceptedAnswers`, otherwise run 3 test cases in isolated-vm (32MB, 100ms, a fresh isolate per case).
- "Reveal answer" shows the answer at no cost.

### 2.6 XP, level, streak and daily goal

- 250 XP per correct answer, and level = `floor(xp/250)+1`. So **every correct answer is exactly one level**, and the level means nothing.
- **XP and streak are stored on the `UserProgress` row per experience level**, not per user. Switching level shows a different XP and streak.
- **XP can be collected without learning:**
  - Each puzzle pays XP for up to 10 repeat solves (2,500 XP per puzzle).
  - The "solo" duel pays XP with no opponent and no cap.
  - A guest snapshot is accepted from the client as sent, up to 100,000 XP (`guestSnapshotMigration.ts`).
- Streak: pure shared logic in `@project/streak-logic`. No freeze or repair.
- Daily goal: only today's practice seconds are stored, with no history, and no endpoint returns them. The 19:00 reminder is always sent, even when the goal was met.

### 2.7 Live Duel

| Topic | Existing state |
|---|---|
| Structure | 5 rounds, 60 seconds per round, 3 attempts, 4 seconds between rounds. |
| Scoring | One point to whoever answers correctly first. Speed does not matter. No tie-breaker. |
| Matchmaking | Plain FIFO queue. No skill matching, no rating. |
| "Solo" after 25 seconds | There is no bot. The user is paired with a copy of themselves, sees their own name as the opponent, earns XP, and the game is saved as a win. **Win statistics are inflated.** |
| Pool | Only 10 questions, with no level or topic. A match draws 5 of them, so repetition is very high. |
| Disconnect | No server-side grace period. Once the server detects the drop (9–12 seconds) the player forfeits, unless they have another open socket. |
| Security | The correct answer is not sent before the round ends; the timer is server-authoritative; every payload is validated. The token is checked at connect only. |
| State | All in process memory. A service restart wipes live matches. |
| Two players | The assumption is hard-coded everywhere: types, scoring, events, the `DuelSession` table, the client. |

**Bugs found:** the Replay bars always show player 1 as "me"; `xp_earned` at match end can under-report; rematch bypasses the "already in a match" check; `DuelSession.startedAt` is really the end time.

### 2.8 Profile, social and mascot

- Profile: avatar, username, email, level, win ratio, preferences, account deletion.
- **Absent:** friends, user search, public profile, achievements, badges, leaderboards, match history, privacy settings, report and block, remote push notifications.
- **Mascot:** a static 3D-style render of a brown-orange platypus, present only in the app icon, the splash screen and emails. No vector, no poses, no animations. **It never appears in the UI.**
- **Brand gap:** brand assets are navy, orange and yellow. The UI is "CYBERDECK" — warm black, yellow, magenta and cyan, in the system font.
- **Language:** every string is hardcoded English; there is no translation infrastructure and no RTL support.

### 2.9 Strengths to keep

- Mature authentication and security: refresh-token rotation, `tokenVersion`, OTP, errors that never leak.
- An isolated sandbox that does not block the event loop.
- All XP and streak writes in SERIALIZABLE transactions with retry.
- Full guest mode and progress migration on sign-up.
- "Reduce Motion" honoured in 10 components, and haptics.
- Code discipline: short files, shared packages, knip.

### 2.10 Summary: problems, risks and opportunities

| Category | Finding | Severity |
|---|---|---|
| Pedagogy | A wrong answer teaches nothing | Critical |
| Content | Small bank, no tagging, no automated checks | Critical |
| Trust | XP collectable without learning; inflated solo wins | High |
| Motivation | Meaningless level; accuracy always 100% | High |
| UX | No progress state on the map; "Continue" does not resume | High |
| Brand | Mascot absent; UI does not match the branding | High |
| Multiplayer | No skill matching, no reconnect grace, 10 questions | High |
| Social | Does not exist | — (new build) |
| Operations | No CI, no tests for backend or io, no monitoring | Medium |
| App Store | Report and block, username and avatar filtering, Apple token revocation — listed as missing in `AGENT_TASKS.md` | Blocks social launch |

---

## 3. Product Vision & Target Audience

### 3.1 Vision

> An app that a student in their first week of JavaScript opens and understands at once, that feels like a game, and that teaches the language deeply enough for an experienced developer to come back to it.

**Guiding principle: understand first, compete second.** Every game mechanic must reward demonstrated understanding, not screen time.

### 3.2 Audiences

| Persona | Who | Needs | Put off by |
|---|---|---|---|
| **Noa — first-year student** (primary) **[REQUIRED]** | Learning JavaScript for the first time in a course or bootcamp | Clear explanations, small steps, exam practice, an interface in her own language | Jargon overload, failure with no explanation, typing code on a phone |
| **Omer — self-learner** | Changing careers, studies in the evenings | A clear path, a sense of progress, a daily habit | Lack of direction, shallow content |
| **Dana — experienced developer** | Works in JS, wants to sharpen up and compete | Truly hard questions, a rating, games against friends | Trivia questions, animations that slow her down, childishness |

### 3.3 Learning tracks **[REQUIRED]**

The existing code holds three separate levels (`JUNIOR`/`MID`/`SENIOR`). **[RECOMMENDATION]** Replace them with four tracks on **one continuous skill map**, so the user sees the whole road and is not locked into a chosen level.

| Track | For | Mapping from existing |
|---|---|---|
| Beginner | From zero | JUNIOR |
| Intermediate | Knows the basics | MID |
| Advanced | Writes JS in practice | SENIOR |
| Expert | Experienced developer | New |

The units in each track are listed in section 6.2.

### 3.4 What we will not be

- Not a video course and not a textbook. The product is active practice.
- Not a full development environment. Code writing is limited to expressions and short functions.
- Not a social network. No feed, no free chat.

---

## 4. Competitive Research

Research limits: the evidence on Duolingo is deep and based on the company's own publications. On Brilliant it is moderate. On Mimo, Sololearn, LeetCode, Kahoot and Clash of Code some official pages blocked access, so some details rest on search summaries and are marked as such in section 22. **None of the measured effects was measured in a programming-education setting.**

### 4.1 Duolingo

- **What works, per the company's publications:**
  - The North Star metric was current-user retention rate (CURR), with five times the impact on DAU of the next metric (S1).
  - Weekly leagues raised learning time by 17% (S1).
  - Separating the streak from the XP goal, so that one lesson is enough, raised day-14 retention by 3.3% (S2).
  - Friend Streak: learners with at least one shared streak are 22% more likely to complete a daily lesson (S4).
  - A new streak animation raised 7-day retention of new users by 1.7% (S5).
- **Notifications:** the rule was "protect the channel" — keep volume fixed and improve timing and wording (S1).
- **A key lesson:** copying a mechanic from another game (a moves counter) was "completely neutral". Check why a mechanic works in its original product before borrowing it (S1).
- **Criticism:** the Energy system that replaced hearts in 2025 met wide resistance; in a reader poll of 18,012 votes, 62% disliked it (S7). In 2026 the company said it would refocus on user growth and teaching and reduce free-tier friction (S8).
- **What we take:** a streak that is cheap to extend, an evening reminder when the streak is at risk, a weekly league, a small friend streak. **What we do not take:** hearts or energy.

### 4.2 Brilliant

- Weekly leagues of 30 participants across 10 tiers (S9).
- The character Koji is built in Rive as one rig for all platforms, reacts differently to a struggling learner and to one breezing through, and does a flip on a perfect lesson (S10).
- **What we take:** a mascot that responds to the learner's state, not only to right and wrong.

### 4.3 Mimo and Sololearn

- Both offer short lessons and a mobile code editor (S11, S12).
- User reviews repeat complaints about hearts, paywalls and opaque timers (S11, S13).
- **Not verified:** their exact code-input widgets (chips, custom keyboard). Hands-on inspection of the apps is needed.
- **What we take:** full transparency about any limit; repeating content must count toward the streak.

### 4.4 LeetCode

- Elo-based contest rating, with Knight and Guardian badges for the top percentiles (S14, snippet).
- "Time Travel" tickets repair a daily streak, are capped at 3 per month, and do not change the true best streak (S15, snippet).
- **What we take:** a serious developer profile; limited streak repair that does not rewrite the record.

### 4.5 Codewars

- Ranks from 8 kyu to 8 dan. Score per kata rises from 2 to 1,097, so easy kata stop advancing rank (S16).
- "Honor" is a participation currency separate from rank (S17).
- Community quality control: kata approval needs 70–80% satisfaction; two issue reports unpublish a beta kata (S18, S19).
- **What we take:** separating skill rating from participation points; a satisfaction vote and a report button on every question.

### 4.6 Exercism

- Every concept exercise includes an introduction, instructions, hints, tests and an exemplar, and a dependency graph decides what unlocks (S20).
- The JavaScript repository is MIT-licensed (S21).
- **What we take:** a concept graph with prerequisites; one uniform structure for every item.

### 4.7 CodeCombat

- Code is the only input to the game, including a competitive ladder where your code plays against others (S22).
- **What we take:** the principle that the code itself is the game action — not a wrapper around a quiz.

### 4.8 Kahoot

- Documented scoring formula: `points = round(max × (1 − (response time / timer) / 2))`. A correct answer at the last moment still earns half (S23).
- Joining by PIN, link or QR, with no account (S24, snippet).
- **What we take:** scoring that rewards accuracy first and speed second; joining a room by a short code.

### 4.9 Clash of Code and QuizUp

- Clash of Code: three modes — Fastest, Shortest, Reverse; private rooms by link (S25, snippet).
- QuizUp played against a real player's recorded answers when no live opponent was available (S26, snippet).
- **What we take:** a recorded "ghost" opponent in place of the existing self-play; Reverse as an extra mode.

### 4.10 Comparison table

| Capability | Duolingo | Brilliant | Mimo / Sololearn | LeetCode | Codewars | Kahoot | Platyko today | Platyko after |
|---|---|---|---|---|---|---|---|---|
| Short mobile lessons | Yes | Yes | Yes | No | No | — | Yes | Yes |
| Explanation tailored to the mistake | Partial | Yes | Not verified | No | No | No | **No** | Yes |
| Code execution visualisation | — | Yes | Not verified | No | No | — | **No** | Yes |
| Animated mascot | Yes | Yes | None found | No | No | No | **No** | Yes |
| Live multiplayer | No | No | No | Contests | No | Yes | 1v1 only | 1v1, friends, rooms |
| Skill rating | Leagues | Leagues | Leaderboards | Yes | Yes | — | **No** | Yes |

**Platyko's differentiation:** none of the competitors examined combines structured JavaScript learning on mobile with live multiplayer. This is the one place where the product can be first, not a follower.

---

## 5. Product Requirements

Priority: **P0** — the redesign is not achieved without it. **P1** — completes the experience. Everything is in scope.

### 5.1 Learning

| # | Requirement | Origin | Priority |
|---|---|---|---|
| L1 | Seven question formats (section 6.3) | [REQUIRED] + [RECOMMENDATION] | P0 |
| L2 | An explanation tailored to each wrong answer, three-level hints, solution reveal after two attempts | [REQUIRED] | P0 |
| L3 | Visual execution player (variables, current line, output, event-loop queues) | [REQUIRED] | P0 |
| L4 | One skill map with a state per lesson: locked, available, in progress, completed, mastered | [REQUIRED] | P0 |
| L5 | Readable code display and a mobile code keyboard (section 12.5) | [REQUIRED] | P0 |
| L6 | Real accuracy measurement and mastery per concept | [RECOMMENDATION] | P0 |
| L7 | Spaced review | [REQUIRED] | P0 |
| L8 | Daily challenge | [REQUIRED to evaluate] → [RECOMMENDATION]: yes | P1 |
| L9 | Exam revision mode | [REQUIRED to evaluate] → [RECOMMENDATION]: yes | P1 |
| L10 | Optional placement test in onboarding | [RECOMMENDATION] | P1 |

### 5.2 Content

| # | Requirement | Origin | Priority |
|---|---|---|---|
| C1 | One unified item model for lessons, puzzles and duels | [RECOMMENDATION] | P0 |
| C2 | Zero-defect verification: gates A–D, repeated until three consecutive clean full passes (section 8) | [DECIDED] | P0 |
| C3 | Originality check and licensing record per item (section 9) | [DECIDED] | P0 |
| C4 | A learning reference for every item | [REQUIRED] | P0 |
| C5 | Report and vote on every question, with automatic removal of a problem item | [RECOMMENDATION] | P0 |
| C6 | Launch bank: at least 600 items, at least 200 of them duel-eligible | [RECOMMENDATION] | P0 |

### 5.3 Social and multiplayer

| # | Requirement | Origin | Priority |
|---|---|---|---|
| S1 | Public profile with privacy settings | [REQUIRED] | P0 |
| S2 | User search, friend requests, friends list | [REQUIRED] | P0 |
| S3 | Report and block, username filtering | [RECOMMENDATION] (App Store requirement) | P0 |
| S4 | Presence: online, in a game, offline | [REQUIRED] | P0 |
| S5 | Push notifications and game invitations | [REQUIRED] | P0 |
| M1 | Random Duel with rating-based matchmaking | [REQUIRED] | P0 |
| M2 | Friends Duel by invitation | [REQUIRED] | P0 |
| M3 | Private room for 2–4 players with code, link, lobby and Ready | [REQUIRED] | P0 |
| M4 | Transparent scoring, live leaderboard, tie-breakers | [REQUIRED] | P0 |
| M5 | Reconnect grace period and leaver handling | [REQUIRED] | P0 |
| M6 | Ghost opponent in place of self-play | [RECOMMENDATION] | P0 |
| M7 | Match history | [REQUIRED] | P1 |
| M8 | Extra game-mode pack (section 11.10) | [REQUIRED, separate from core] | P1 |

### 5.4 Brand, language, profile and retention

| # | Requirement | Origin | Priority |
|---|---|---|---|
| B1 | New design system matching the branding | [REQUIRED] | P0 |
| B2 | Animated vector mascot with a 12-state machine, made by the agent | [DECIDED] | P0 |
| I1 | English and Hebrew UI with RTL, chosen in settings; code always LTR | [DECIDED] | P0 |
| P1 | Achievements and badges | [REQUIRED] | P1 |
| P2 | GitHub sign-in and account linking | [REQUIRED to evaluate] → [RECOMMENDATION]: yes | P1 |
| R1 | New user-level XP and level model | [RECOMMENDATION] | P0 |
| R2 | Streak freeze and smart reminders | [RECOMMENDATION] | P1 |
| R3 | Weekly goal (practice days per week) | [RECOMMENDATION] — the owner believed it existed | P1 |
| R4 | Weekly league | [REQUIRED to evaluate] → [RECOMMENDATION]: yes, after R1 | P1 |
| R5 | "Explain my mistake" with AI | [REQUIRED to evaluate] → [RECOMMENDATION]: limited scope | P1 |

---

## 6. Learning Experience

### 6.1 Pedagogical principles

| Principle | Research basis | In the product |
|---|---|---|
| Read and trace before writing | Novices are weak at predicting output; tracing and explaining correlate with writing ability (S27, S28). Correlation, not causation. | Every concept opens with prediction and tracing; writing comes last |
| PRIMM: predict, run, investigate, modify, make | PRIMM learners outperformed the control group on a post-test, 493 students in 13 schools (S29) | Item order inside a lesson |
| Elaborated feedback | Elaborated feedback: effect size 0.49; right/wrong only: 0.05 (S30) | An explanation per distractor, not just "wrong" |
| Misconception-based distractors | Each distractor should encode one real misconception (S31) | A `misconception` field per distractor |
| Parsons without distractors for novices | Faster than writing with similar learning gains (S32); distractors cut completion by 26% with no transfer benefit (S33) | Line reordering with no extra lines in the Beginner track |
| Retrieval and spacing | The only two techniques rated "high utility" (S34). In programming courses the measured effect is modest, about 1–2% on exam scores (S35). | Review mode; no promise of miracles |
| Avoid seductive details | Appealing but irrelevant details hurt learning, mostly for novices (S36, snippet) | The mascot is off screen while solving |
| Time pressure | Evidence is mixed, and no study of novices in practice was found (S37) | **No timer in lessons.** Timers only in multiplayer and the daily challenge |

### 6.2 The skill map

Structure: **track → unit → lesson → item.** A lesson is 8 items, about 5 minutes. A unit is 4 lessons and a summary lesson.

The early topic order (values, operators, control flow, functions, arrays and objects) is agreed across javascript.info, MDN, freeCodeCamp and Eloquent JavaScript. The split into four tracks is our synthesis; no source defines those boundaries **[RECOMMENDATION]**.

**Beginner — 8 units**

1. Values and types: numbers, strings, booleans, `typeof`
2. Variables: `let`, `const`, assignment
3. Operators and comparisons: `===` versus `==`, truthy and falsy
4. Conditionals: `if`, `else`, the ternary operator
5. Loops: `for`, `while`, `break`
6. Functions: definition, parameters, `return`
7. Arrays: index, `length`, `push`, looping over an array
8. Objects: properties, access, update

**Intermediate — 8 units**

1. Array methods: `map`, `filter`, `reduce`, `find`
2. Objects in depth: destructuring, spread, reference versus copy
3. Scope and hoisting: block, function, TDZ
4. Closures
5. `this` and classes
6. Errors: `try`/`catch`, error types
7. Basic async: callbacks, Promise, `async`/`await`
8. DOM and events **[REQUIRED]**

**Note on the DOM [RECOMMENDATION]:** the sandbox does not run a DOM, and the sources disagree on where the topic belongs. The unit is taught with prediction, line reordering and concept questions against a drawn DOM tree, with no executed code writing.

**Advanced — 7 units**

1. Promises in depth: chaining, combinators, error handling
2. Event loop: call stack, microtasks, macrotasks
3. Prototypes and inheritance
4. Iterators and generators
5. Modules
6. `Map`, `Set`, `WeakMap`, `Symbol`
7. Performance and memory: debounce, memoization, leaks

**Expert — 5 units**

1. Type coercion and language edge cases
2. `Proxy`, `Reflect` and metaprogramming
3. Debugging: finding a bug in longer code
4. Code analysis: complexity, refactoring, reading unfamiliar code
5. Patterns and architecture — **through code only**, not definitions

**Critical note:** the existing Senior content (block 7: SOLID and pattern definitions) is definition recall. It will not be carried over as is; it is rewritten as code-analysis questions.

**Unlocking [RECOMMENDATION]:**

- Inside a track: a unit unlocks when the previous one is completed.
- Between tracks: every track can be entered through a **jump test** of 10 items. Passing 8 skips ahead. Novices are not overwhelmed and experienced users are not bored.
- A "free practice" mode always exists for every unlocked unit, to avoid Duolingo's mistake of removing choice from the learner (S6).

### 6.3 The seven question formats

| # | Format | What the user does | Input | Suits | Duel-eligible |
|---|---|---|---|---|---|
| 1 | `PREDICT_OUTPUT` | Sees code and predicts what is printed | Pick 1 of 3, or type a short value | All tracks | Yes |
| 2 | `TRACE` | Steps through and answers what a variable holds at a given step | Tap a value | Beginner, Intermediate | No |
| 3 | `PARSONS` | Reorders shuffled lines into a correct program | Drag | Beginner, Intermediate | Yes |
| 4 | `FILL_BLANK` | Completes a missing part of the code | Token chips | All tracks | Yes |
| 5 | `FIX_BUG` | Taps the buggy line and picks a fix | Tap and pick | Intermediate and up | Yes |
| 6 | `CODE_WRITE` | Writes an expression or short function checked against test cases | Code keyboard | Intermediate and up | No |
| 7 | `CONCEPT_MCQ` | Answers an understanding question, always anchored in code | Pick 1 of 3 | All tracks | Yes |

Notes:

- **Three options, not four or five.** Reported as the optimal number (S38, secondary source), and it saves screen space.
- **`ORDER_OUTPUT`** is a `PARSONS` variant in which the user orders the printed lines. It is the main format of the Event Loop unit.
- `CODE_WRITE` replaces the existing Code Puzzle and uses the same sandbox.
- `FIX_BUG` builds on the "pick a line" mode that already exists in the duel client (`DuelActiveAnswerZone.tsx:15-28`).

### 6.4 Lesson structure

A lesson of 8 items follows PRIMM:

1. Item 1: a short concept card with a worked example (not graded).
2. Items 2–3: `PREDICT_OUTPUT`.
3. Item 4: `TRACE` with the execution player.
4. Items 5–6: `FILL_BLANK` or `PARSONS`.
5. Item 7: `FIX_BUG` or `CODE_WRITE` (by track).
6. Item 8: a review item from an earlier concept (interleaving).

An item answered wrongly returns once at the end of the lesson.

### 6.5 Feedback, hints and solution reveal

**Correct answer:**

- Green mark, success haptic, a one-line explanation ("why this is right").
- A "see it run" button opens the execution player. Optional.

**Wrong answer — first attempt:**

- A bottom sheet with the explanation **of the chosen distractor** ("You assumed `var` is block-scoped. It is function-scoped.").
- The correct answer is not revealed yet. A "try again" button.

**Wrong answer — second attempt:**

- The correct answer is revealed with a full explanation and the execution player.
- The item enters the Review queue and is marked "not mastered".

**Hints — three levels, at the user's request:**

1. Pointer: "Look at line 3".
2. Concept: "`const` prevents reassignment, not changes to the object's contents".
3. Near-solution: narrows to two options.

Using a hint does not reduce XP, but the item does not count as a "clean first attempt" for mastery. A hint is a learning tool, not a penalty.

**"Explain my mistake" (AI) [RECOMMENDATION, P1]:** detailed in section 15.9.

### 6.6 The visual execution player

The goal: to show the "notional machine" — what the computer does on each line.

- **View:** the code on top with the current line marked; below it a variables table whose values update with animation; an output strip at the bottom.
- **Controls:** previous, next, auto-play, and a speed slider.
- **Event Loop view:** three columns — Call Stack, Microtasks, Macrotasks — with tasks moving between the queues. Inspired by Loupe, which has no license, so its code must not be used (S39).
- **Data source [RECOMMENDATION]:** the trace is not computed on the device. It is produced once in the content pipeline by running the snippet, and stored as JSON on the item (section 7.2). No code runs on the device, and the view is identical for everyone.
- **Reduce Motion:** steps change instantly with no animation.
- **RTL:** the player's code, variables table and output always stay left-to-right; only the surrounding labels follow the UI language.

### 6.7 Mastery and review

- **Concept mastery:** a 0–100 score per concept from clean first attempts over its last 10 items.
- **Review scheduling [RECOMMENDATION]:** the SM-2 algorithm, whose formula is fully published (S40), at concept level, not item level, so the user gets a different item on the same concept and does not memorise an answer.
- **Why not FSRS:** `ts-fsrs` (MIT license) declares a Node 24 requirement (S41), and the backend runs on Node 22. See open question Q2.
- **On Home:** a "Review today: 6 items" card appears only when items are due.
- **Review counts toward streak and XP**, to avoid the documented Sololearn complaint (S13).

### 6.8 XP, levels and streak

**[RECOMMENDATION]** A new model in place of "250 XP = one level":

| Action | XP |
|---|---|
| Item correct on first attempt | 10 |
| Item correct on second attempt | 5 |
| Lesson completed | 20 |
| Lesson with no mistakes | 10 extra |
| Review item correct | 5 |
| Daily challenge | 30 |
| Multiplayer game | 10 for taking part, 20 more for a win or first place |

- **Level:** a rising curve — level `n` needs `50 × n × (n+1) / 2` cumulative XP. Level 2 after 150 XP, level 10 after 2,750.
- **XP and streak move to the user** from the experience-level row.
- **Converting existing data:** `new XP = old XP / 25`, so 250 becomes 10. No user loses relative progress.
- **XP is paid once per item.** Re-solving pays only through Review. This closes the 10-repeat-solve loophole.
- **Streak:** unchanged — one qualifying action per day. A **streak freeze** is added: one is earned after 7 consecutive days, and up to 2 are held.
- **Daily goal:** moves from minutes to **lessons** (1, 2 or 3 a day), because lessons are measured on the server and minutes only on the device.
- **Weekly goal [RECOMMENDATION]:** the user picks 3, 5 or 7 practice days a week. It suits students better than a rigid daily goal.

**Three separate measures**, inspired by Codewars' split between rank and Honor (S16, S17):

| Measure | What it measures | Where shown |
|---|---|---|
| XP and level | Activity and persistence | Home, profile, league |
| Mastery | Understanding per concept | Skill map, profile |
| Duel rating | Competitive skill | Multiplayer, profile |

---

## 7. Question Bank Strategy

### 7.1 Founding principles

- **Agent-authored [DECIDED].** The AI agent writes every item and runs the verification. The verification standard is section 8; the originality and licensing standard is section 9.
- **One bank.** Lessons, the daily challenge, revision and multiplayer all draw from the same items.
- **Written from a unit specification**, never from a source's wording (section 9.2).
- **English only.** Under rule R2, item text (prompts, options, explanations, hints) lives in the content files and is English. Only the UI chrome is translated. See open question Q10.

### 7.2 Item data structure **[REQUIRED]**

```ts
type Item = {
  id: string;                 // stable and readable: "int.closures.loop-var.predict-01"
  track: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  unit: string;               // "closures"
  concept: string;            // "closure-captures-variable"
  prerequisites: string[];    // concepts the item may rely on
  format: "PREDICT_OUTPUT" | "TRACE" | "PARSONS" | "FILL_BLANK"
        | "FIX_BUG" | "CODE_WRITE" | "CONCEPT_MCQ";
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  code?: string;              // up to 12 lines, up to 36 characters per line
  options?: {
    text: string;
    correct: boolean;
    feedback: string;         // explanation specific to this option
    misconception?: string;   // id of the misconception it encodes
  }[];
  solution: {
    expectedOutput?: string;  // PREDICT_OUTPUT, TRACE
    lineOrder?: number[];     // PARSONS
    blanks?: string[][];      // FILL_BLANK: accepted answers per blank
    bugLine?: number;         // FIX_BUG
    tests?: { input: unknown; expected: unknown }[]; // CODE_WRITE
  };
  explanation: string;
  hints: [string, string, string];
  trace?: TraceStep[];        // generated by execution, never hand-written
  reference: { title: string; url: string; source: "MDN" | "ECMA-262" };
  duelEligible: boolean;
  timeLimitSec?: number;      // duel-eligible items only
  status: "DRAFT" | "LIVE" | "FLAGGED" | "RETIRED";
  provenance: {
    author: string;                 // authoring agent id and model
    version: number;
    originality: { result: "PASS" | "FAIL"; maxSimilarity: number; checkedAt: string };
    verificationRunId: string;      // the clean run that made this version LIVE
  };
};
```

### 7.3 Authoring process

1. **Unit specification.** For each unit: the concept list, prerequisite concepts, common misconceptions, and MDN and specification references. No peer-reviewed study of JavaScript-specific misconceptions was found, so the list is built from teaching experience and corrected from distractor data after launch **[ASSUMPTION]**.
2. **Drafting** from the specification, including an explanation per distractor. Authoring rules:
   - Every code snippet is new: invented names, values and structure (section 9.2).
   - Only behaviour defined by the ECMAScript specification is used. Banned in snippets: `Math.random`, the current date and time, locale-dependent formatting, `Intl`, the text of error messages, engine-specific APIs, and timer races that depend on exact delays.
   - Snippets stay within 12 lines and 36 characters per line.
   - `PARSONS` items have at most 8 lines, so every ordering can be executed.
3. **Verification loop** (section 8) and **originality check** (section 9.3).
4. **Migration of the existing content.** The 90 exercises, 21 puzzles and 10 duel questions are converted to the new model, tagged, and pass the same gates and the same originality check as new items. Their origin is not recorded anywhere, so any that fail the originality check are rewritten. Block 7 is rewritten in any case.

### 7.4 Storage

**[RECOMMENDATION]** Items are stored as files in the repository (a `content/` folder), checked in CI, and loaded into the DB by the seed. This continues the existing pattern (`backend/prisma/seed/`), gives full version history, and needs no content-management system. Verification run logs live beside them (section 8.6).

### 7.5 Launch bank size

| Track | Units | Items per unit | Total |
|---|---|---|---|
| Beginner | 8 | 24 | 192 |
| Intermediate | 8 | 24 | 192 |
| Advanced | 7 | 20 | 140 |
| Expert | 5 | 16 | 80 |
| **Total** | 28 | | **604** |

At least 200 of them are marked `duelEligible`.

### 7.6 Post-launch monitoring

This is the safety net for the residual risk described in section 8.7.

- **Report:** a "something is wrong with this question" button on every item, with four reasons.
- **Vote:** thumbs up or down after the explanation.
- **Automatic removal:** 3 reports from different users within 7 days move an item to `FLAGGED`, which removes it from lessons and from the duel pool at once. Inspired by Codewars (S19).
- **Return to service:** a `FLAGGED` item is fixed and can become `LIVE` again only through a new full clean verification run.
- **Item analysis**, after 100 answers per item:
  - Difficulty index: the share answering correctly. Outside 20%–95% is flagged for review.
  - Discrimination index: 0.20 or below is flagged as non-discriminating.
  - A distractor chosen by under 5% is flagged as non-functioning.
  - The thresholds come from medical education, not programming (S58), so they are recalibrated once data exists **[ASSUMPTION]**.

---

## 8. Question Verification Standard (zero defect) **[DECIDED]**

### 8.1 Rule

**No item is `LIVE` unless 100% of the bank passed every gate in the same final run, and that run's log is stored in the repository.** There is no partial release of a bank that still has open findings.

The loop is run under `/goal` (or an equivalent loop) with the exit condition in section 8.5 as the goal, and it repeats until that condition holds.

### 8.2 Pre-check (structural)

Run first, on every pass. A failure is a finding like any other.

| Check | What is tested |
|---|---|
| Schema | Valid structure; three hints; a reference; code-size limits |
| Banned constructs | None of the constructs banned in section 7.3 appears in a snippet |
| Duplicates | Normalised-code hash and text similarity against the whole bank |
| Reference link | The reference URL returns 200 |
| Originality | The check in section 9.3 |

### 8.3 The four gates

**Gate A — execution (mechanical).** Every snippet is executed, and the actual result decides.

| Format | What is executed and required |
|---|---|
| `PREDICT_OUTPUT`, `TRACE` | Actual output exactly equals the stated answer. Every distractor differs from the actual output. Exactly one option is correct. |
| `PARSONS` | The stated order runs and gives the expected output. **Every** ordering of the lines is executed; any other ordering that gives the same output is either recorded as accepted or the item is rewritten. |
| `FILL_BLANK` | Each accepted fill gives the expected output. Each distractor fill gives a different output or an error. |
| `FIX_BUG` | The buggy code gives a wrong result. The stated fix gives the right result. Each distractor fix still fails. |
| `CODE_WRITE` | The reference solution passes every test. A set of deliberately wrong solutions each fails at least one test. |
| `CONCEPT_MCQ` | The item must carry a snippet that demonstrates the claim; that snippet is executed and must show the behaviour the correct option states. Exactly one option is correct. |
| All formats | The `trace` is generated from this execution and stored; it is never written by hand. |

**How items are executed [RECOMMENDATION]:** authored snippets are trusted code, so the pipeline runs them in a Node worker with a time limit, which gives real microtask and macrotask ordering for async items. The isolated-vm sandbox stays reserved for untrusted user code; it has no timers (**[VERIFIED]** it bridges only `Math` and `Object` helpers).

**Gate B — logic (blind re-derivation, mechanical comparison).** A solver agent receives the item **without** the stated answer, the correct-option flag or the explanation. It derives the answer by hand-trace and records its own trace steps. The comparison is then mechanical: its answer against the stated answer, and its trace against the execution-generated trace from Gate A. Any difference is a finding — it means the item reads differently from how it runs.

**Gate C — clarity (independent review).** A separate reviewer agent that has **not** seen the authoring reasoning or the solver's work checks each item for:

- ambiguity in the prompt;
- more than one defensible answer;
- trick wording that tests reading and not JavaScript;
- outdated or engine-specific behaviour;
- an explanation that misleads or contradicts the answer;
- **the accuracy of every wrong-option explanation**;
- hints that give away the answer too early or point the wrong way.

**Gate D — difficulty and track fit (independent review).** The reviewer checks that the item belongs in its unit, matches its difficulty level, and relies only on its declared prerequisite concepts. A mechanical part supports this: the snippet is scanned for language constructs that are not in the item's prerequisites.

### 8.4 The loop

1. Run the pre-check and gates A, B, C, D over the **entire** bank. This is one full pass.
2. Any failure sends the item back for fixing.
3. After fixing, **all gates run again from the start, over the entire bank** — not only on the fixed items, because a fix can create a duplicate or break a prerequisite elsewhere.
4. Repeat until a full pass produces **zero findings**.
5. Then run **at least two additional consecutive clean full passes**. Gates B, C and D use fresh agent contexts on each pass.
6. If any of those passes produces a finding, return to step 2 and the count of clean passes restarts.

### 8.5 Exit condition

All of the following, together:

- 100% of items pass the pre-check and all four gates in the same final run.
- That final run is the third consecutive clean full pass.
- The bank content hash recorded in the run log equals the hash of the content being loaded.
- The run logs are committed to the repository.

### 8.6 Run log

- Stored under `content/verification/runs/<runId>.json`.
- Holds: run id, start and end time, pass number, bank content hash, model and agent ids per gate, a result per item per gate, and every finding with its resolution.
- The seed refuses to mark items `LIVE` when the content hash does not match the latest clean run. Any edit to any item therefore invalidates the run and requires the loop again.
- CI runs the pre-check and Gate A on every change. Gates B, C and D run in the verification loop.

### 8.7 What this proves, and what it does not

| Gate | Nature | What it establishes |
|---|---|---|
| Pre-check, A | Mechanical | Proven for the engine used: the stated answer is what the code produces, distractors are wrong, and exactly one option is right. |
| B | Mechanical comparison of an independent derivation | A second, blind derivation agrees with the execution. Disagreement is always caught; agreement is strong evidence that the item reads as it runs. |
| C, D | Review-based | Judgment by an independent agent. This lowers the risk of ambiguity, misleading explanations and poor level fit. **It cannot prove their absence.** |

**Residual risk, stated plainly:**

- **Correlated blind spots.** The author, solver and reviewer are AI agents, likely of the same model family. An ambiguity that one misses, another may miss too. Fresh contexts and withheld reasoning reduce this; they do not remove it.
- **One engine.** Gate A proves behaviour on V8 (Node). The ban on engine-specific constructs covers other engines by rule, not by execution.
- **Explanations and hints are prose.** Their accuracy is reviewed in Gate C, not executed.
- **Pedagogical quality is not correctness.** A question can be correct, clear and still teach poorly. Only learner data shows that.

**Mitigations:**

- The report-and-remove mechanism and item analysis in section 7.6 catch defects that reach users and remove them without manual action.
- **[RECOMMENDATION]** A human spot-check of a random 5% sample per track before launch, and a pilot of each unit with real learners. These are not part of the exit condition; they are the only checks that do not share the agents' blind spots. See open question Q11.

---

## 9. Question Originality and Licensing **[DECIDED]**

**This section is not legal advice.** The licensing position should be confirmed by a lawyer before commercial launch (open question Q1).

### 9.1 Rule

Every question must be original and safe to publish commercially. The style should match real university and quiz-style JavaScript questions; the content is never copied or closely paraphrased.

### 9.2 Authoring rules

- **Sources are used for topic coverage and ordering only, never for wording.** This applies to MDN, ECMA-262 and course syllabi alike.
- **No snippet is taken from a copyrighted source.** To keep the rule simple and checkable, no snippet is taken from any source at all, including permissively licensed ones.
- **Every item changes code, names, values and structure** relative to anything the author has seen: its own identifiers, its own literal values, its own program shape.
- **Items are written from the unit specification** (concept plus misconception), not from an existing question.
- **Short universal idioms** — for example the result of `typeof null` — are facts about the language. Facts and ideas are not protected by copyright, although the way they are expressed may be (S42; U.S. law only). The surrounding prompt, code and explanation are still written fresh.
- **The reference link** points to the place to learn more, on MDN or in the ECMAScript specification. It is a pointer, not a source of text.

### 9.3 Automated similarity check

- **Source ledger.** Every source consulted while writing a unit is recorded in the unit specification by URL and retrieval date.
- **No source text in the repository.** Source text is fetched into a local cache that is not committed; the ledger stores only the URL and a hash of the fetched text.
- **Prose check.** Prompt, explanation, hints and option feedback are compared against the ledger sources by overlapping word sequences.
- **Code check.** Snippets are compared against code blocks in the ledger sources after normalising whitespace and renaming identifiers, so that renaming variables alone does not hide a copy.
- **Bank check.** The same comparison runs against every other item, as the duplicate check.
- **Result.** Each item records `PASS` or `FAIL` and its highest similarity score. A `FAIL` blocks the item in the pre-check.
- **Thresholds [ASSUMPTION]:** starting values are fixed during phase 0 by measuring known-original and known-copied samples.

### 9.4 Per-item record

Stored in `provenance` (section 7.2): author, originality check result and score, verification run id, and the reference link.

### 9.5 Sources and their licenses

| Source | Teaches JavaScript? | License | Use in this product |
|---|---|---|---|
| MDN Web Docs and MDN Curriculum (S43, S44) | Yes | Prose CC BY-SA; code samples CC0 | Topic coverage, ordering, reference links |
| ECMA-262 (S45) | The language specification | Permissive notice on the living draft | Authority for behaviour; reference links |
| MIT 6.102 (S46) | TypeScript, not a JS language course | CC BY-SA 4.0 | Topic coverage only |
| javascript.info (S47) | Yes, the most complete outline | Based on CC BY-NC | Topic ordering only |
| Eloquent JavaScript, 4th ed. (S48) | Yes | Text CC BY-NC; code MIT | Topic ordering only |
| The Odin Project (S49) | Yes | CC BY-NC-SA 4.0 | Topic ordering only |
| freeCodeCamp (S50) | Yes | Curriculum: all rights reserved, no open license in the current README | Topic ordering only |
| Harvard CS50x (S51) | **Week 8 only** (HTML, CSS, JavaScript) | CC BY-NC-SA 4.0 | Topic ordering only |
| CS50 Web (S52) | Yes, weeks 5–6 | CC BY-NC-SA 4.0 | Topic ordering only |
| Full Stack Open, University of Helsinki (S53) | Yes, React and Node first | CC BY-NC-SA 3.0 | Topic ordering only |
| Stanford CS193X (S54) | Yes | All rights reserved; site from 2023 | Topic ordering only |
| You Don't Know JS Yet (S55) | Yes | CC BY-NC-ND 4.0 | Inspiration for depth only |
| Exercism JavaScript (S21) | Yes | MIT | Inspiration for item structure only |

Almost every academic source forbids commercial use, which is why wording and snippets are never taken from any of them.

### 9.6 Limits of the originality check

- It compares against **the sources recorded in the ledger and the bank itself**. It cannot compare against everything ever published.
- An AI author can reproduce text it was trained on without consulting a source. The rules in section 9.2 — write from the specification, invent the code — are the main defence; the similarity check is the backstop.
- Short, common questions about a language fact will resemble other people's questions on the same fact. The check targets copied expression, not shared facts.

---

## 10. User Types & Permissions

### 10.1 Permission table

| Capability | Guest | Registered |
|---|---|---|
| The whole skill map, all formats, the execution player | Yes **[REQUIRED]** | Yes |
| Review, daily challenge, revision mode | Yes (local) | Yes (synced) |
| XP, level, streak, mastery | Local on the device | On the server |
| Language choice (English or Hebrew) | Yes | Yes |
| Game against a ghost opponent (practice) | Yes **[RECOMMENDATION]** | Yes |
| Joining a private room by code | **No** — see 10.3 | Yes |
| Random Duel, Friends Duel, creating a room | No | Yes **[REQUIRED]** |
| Public profile, friends, invitations | No | Yes **[REQUIRED]** |
| League, achievements, match history | No | Yes |
| "Explain my mistake" (AI) | No | Yes, with a daily quota |

### 10.2 Local progress and migration to an account **[REQUIRED]**

**[VERIFIED]** The mechanism exists: guest state is kept in AsyncStorage and sent as a snapshot on register, Google and Apple.

Required changes:

1. **Fix the progress loss on email login.** When a guest logs in to an existing account, the server merges: the union of completed items, the higher of the two streaks, and XP recomputed.
2. **Do not trust numbers from the client.** The snapshot sends only **the list of completed item ids** and activity dates. The server computes XP from them. This closes the 100,000 XP loophole.
3. **Merge confirmation screen:** "We found progress on this device: 42 items, a 5-day streak. Add it to your account?"

### 10.3 Decision: guests in private rooms **[REJECTED]**

Letting a guest join a room by code, as Kahoot does, was considered. It is rejected: a room with anonymous users needs separate moderation, and without an identity nobody can be blocked or reported. Instead, an invite link opened by a guest leads to quick sign-up (Apple, Google or GitHub) and returns them straight to the lobby.

### 10.4 Guest-to-registered conversion moments

No artificial blocks and no native `Alert`. The offer to register appears at three natural moments:

- After the third lesson: "Save your progress".
- On tapping Multiplayer: a screen explaining what you get, with the mascot.
- When an invite link arrives from a friend.

---

## 11. Social & Multiplayer

### 11.1 Friends system **[REQUIRED]**

**Finding friends — three ways:**

1. Search by username (prefix match, at least 3 characters).
2. A personal friend code and a personal share link, with QR.
3. "Played recently": opponents from the last 10 games.

**Friend requests:**

- Send, accept, decline, cancel. Declining is silent: the sender is not notified.
- Limits: up to 20 outgoing pending requests; up to 200 friends **[ASSUMPTION]**.
- After a decline, no new request to that user for 30 days.

**Friends list:** sorted by presence — online, in a game, offline. Per friend: avatar, level, rating, an "invite to duel" button.

**Friend Streak [RECOMMENDATION]:** a shared streak with up to 5 friends that advances when both practised on the same day, with no joint activity needed. Inspired by Duolingo (S4).

### 11.2 Privacy, block and report

**Privacy settings**, defaults in bold:

| Setting | Options |
|---|---|
| Who sees my profile | **Everyone** / friends only / nobody |
| Who can send me a friend request | **Everyone** / only people with my code |
| Appear in search | **Yes** / no |
| Show online status | **To friends** / to nobody |
| Who can invite me to a game | **Friends** / nobody |

**Block:** a blocked user cannot see the profile, cannot send a request or invitation, and is never matched against you in Random Duel.

**Report:** on a username, avatar or in-game behaviour. Reports enter a manual review queue (open question Q5).

**Filtering:** a banned-word list for usernames and bios, covering both English and Hebrew. The word list is data, not source code; where it is stored under rule R2 is part of open question Q13. There is no free chat anywhere in the product **[RECOMMENDATION]**, which greatly reduces the moderation load. In-game communication is limited to 6 preset reactions (mascot emoji).

### 11.3 Presence and notifications

- **Presence:** "online" means the user has an active socket connection. "In a game" means they are in a match or a lobby. The state is sent to friends only, and only on change.
- **Game invitation:** if the recipient is online — an in-app banner. If not — a push notification. In both cases the invitation also appears in the invitations inbox.
- **Expiry:** a duel invitation expires after 60 seconds. A room invitation is valid while the lobby is open.
- **Push notification types**, each can be turned off separately: game invitation, friend request, streak at risk, league results.
- **Language:** a push notification is sent in the recipient's chosen language (section 12.10).
- **Notification budget [RECOMMENDATION]:** at most one retention notification per day. Duolingo describes the rule as "protect the channel" (S1).

### 11.4 One game engine for three modes

**[RECOMMENDATION]** Build one engine that supports 2 to 4 players, and define the three modes as configurations of it. This avoids duplicated logic.

| | Random Duel | Friends Duel | Private Room |
|---|---|---|---|
| Players | 2 | 2 | 2–4 |
| How to enter | Matchmaking queue | Invitation to a friend | Code, link or invitation |
| Rated | Yes | No | No |
| Rounds | 5 | 5 | 5, 7 or 10 (host's choice) |
| Question track | By rating | Inviter's choice | Host's choice |
| XP | Yes | Yes, with a daily cap | Yes, with a daily cap |

**Daily XP cap for unrated games:** 5 games a day earn XP. This prevents farming between two accounts.

### 11.5 Scoring **[REQUIRED: fair and transparent]**

**[VERIFIED]** Today: one point to whoever answers correctly first. That does not work for 3–4 players, and it punishes a player who answered correctly one second after the opponent.

**[RECOMMENDATION]** One system for all modes, inspired by Kahoot's documented formula (S23):

- Each player answers independently. The round ends when everyone has answered or the timer runs out.
- **Correct on the first attempt:** `round(1000 × (1 − (time / timer) / 2))`. That is between 500 and 1,000.
- **Correct on the second attempt:** half of that value.
- **Two attempts at most** (down from 3 today), to prevent guessing.
- **Wrong or no answer:** 0. No negative scoring.
- **Time is measured on the server**, from sending the question to receiving the answer.

**Latency compensation [RECOMMENDATION]:** the server measures each player's ping and subtracts half of it from the response time, up to a cap of 250ms. No primary source describing latency compensation for quiz scoring was found; this is our decision and needs real-world testing **[ASSUMPTION]**.

**Transparency:** after each round every player sees their own time and the points they earned. The formula is explained on a "how scoring works" screen.

**Tie-breakers [REQUIRED]**, in order:

1. Total points.
2. Number of correct answers.
3. Lower cumulative time on correct answers.
4. If still tied: shared place. In a rated game this is a draw, which is a valid Glicko-2 result.

### 11.6 Matchmaking and rating **[REQUIRED]**

**Rating [RECOMMENDATION]:** Glicko-2 for Random Duel only.

- Starting values from the paper: rating 1500, rating deviation 350, volatility 0.06 (S59).
- The algorithm is for two players and is in the public domain (S59).
- **Rooms of 3–4 players are unrated.** Glicko-2 does not support them, and TrueSkill, which does (S60), adds complexity that is not justified for a game among friends.
- The first five games are "placement games" and the rating is not shown until they are done.

**Display tiers:** the numeric rating maps to six river-themed tiers: Stream, Creek, River, Rapids, Delta, Ocean **[RECOMMENDATION]**.

**Matching process:**

1. Search within 100 rating points in each direction.
2. Every 5 seconds the range widens by 50.
3. Blocked users are never matched against each other.
4. After 25 seconds with no opponent: a **ghost opponent** is offered.

**Ghost opponent [RECOMMENDATION]**, replacing the existing self-play:

- A game against a recording of another player's real game: the same questions, and that player's answers and answer times. Inspired by QuizUp (S26).
- Clearly labelled: "Practice against a recording of @username". Nothing is hidden.
- Unrated, not counted as a win or loss, and earns participation XP only.
- Needs the question sequence and timings of real games to be stored (section 15.4).

**Data fix:** every `DuelSession` row where `player1Id` equals `player2Id` is marked "practice" and leaves the win count.

### 11.7 Private room and lobby **[REQUIRED]**

**Creating:** the host picks the track, the number of rounds and the maximum number of players (2–4).

**Room code:** 6 characters from an alphabet with no look-alike characters (no `0`, `O`, `1`, `I`, `L`). Always displayed left-to-right.

**Invite link:** `https://platyko.com/r/<CODE>`. It opens straight in the lobby if the app is installed; otherwise it leads to the store. It needs a verified domain and `associatedDomains` and `intentFilters` configuration (S82). Ownership of the `platyko.com` domain is assumed from the Caddy configuration (open question Q14).

**Lobby:**

- A player list with avatar, level and Ready state.
- Each player marks Ready. The host can start when there are at least 2 players and all are ready.
- The host can remove a player. If the host leaves, the longest-present player becomes host.
- A lobby with no activity closes after 10 minutes.

**Countdown [REQUIRED]:** the server sends a start timestamp 3 seconds ahead. All clients show the countdown from that same timestamp.

**Live leaderboard [REQUIRED]:** after each round an interim ranking is shown with a place-swap animation. During the round only who has already answered is shown, without revealing whether they were right.

**End screen:** a podium with the top three, a full table, and "play again" and "back to lobby" buttons.

### 11.8 Disconnect, reconnect and leaving **[REQUIRED]**

**[VERIFIED]** Today there is no server-side grace period.

| Situation | Behaviour |
|---|---|
| Disconnect mid-game | A 20-second grace period. The game does not pause; timers keep running. |
| Return within the period | The server sends a full snapshot: round, question, time left, scores, attempts left. A missed round scores 0. |
| No return, 2-player game | Technical loss. The opponent wins. |
| No return, room of 3–4 | The player is marked "left" and ranked last. The game continues. If one player remains, the game ends. |
| Deliberate leave | Same as "no return", at once and with no grace period. |
| Disconnect in the lobby | The player is removed after 15 seconds. |

**State recovery [RECOMMENDATION]:** Socket.IO's Connection State Recovery is used as an optimisation only, because the documentation says it "will not always be successful" (S61). The source of truth is the snapshot the server sends on every reconnect.

**Leaver penalty, rated games only:** leaving counts as a loss. Three leaves in 24 hours bring a 5-minute queue cooldown, doubling with each further leave. No industry standard for grace periods or penalties was found; the values are calibrated from data **[ASSUMPTION]**.

### 11.9 Anti-cheat and synchronisation **[REQUIRED]**

| Threat | Measure |
|---|---|
| Reading the answer off the network | **[VERIFIED]** The correct answer is sent only at the end of the round. Kept. |
| Faked time | Time is measured on the server only. The client's `time_taken_ms` is dropped. |
| Memorising questions | A pool of at least 200 items; items the player saw in the last 20 games are not picked; option order is shuffled per player on the server. |
| Answering too fast | A correct answer in under 400ms is flagged. Above a threshold of flags — manual review. |
| XP farming between two accounts | The daily XP cap; in rated play, the same pair of players is rated at most 3 times a day. |
| Several connections for one user | One active game per user; a new connection replaces the old one explicitly, with a message. |
| Expired or revoked token | Expiry and `tokenVersion` are checked at the start of every game and on every reconnect, not only at first connect. |
| Outside help (search, AI) | Cannot be fully prevented. Short timers (20–45 seconds) and items that need code reading reduce the benefit. |
| Event flooding | Rate limits per user, not only per socket, on every event. |

**Synchronisation:** all players receive the same question in the same room emit. The client shows time left from the server's `ends_in_ms`, as today. The server is the only authority (S64).

### 11.10 Extra game modes **[REQUIRED, separate from core]**

Three modes, all configurations of the same engine with no new infrastructure:

| Mode | Description | Needed beyond the core |
|---|---|---|
| **Bug Hunt** | Everyone sees the same buggy code; the first to tap the right line earns the most points | Only `FIX_BUG` items; nothing more |
| **Output Race** | A run of short `PREDICT_OUTPUT` items, 15 seconds each | Nothing more |
| **Reverse** | Only input and output are shown; pick which function produces them. Inspired by Clash of Code (S25) | One more item type derived from `CODE_WRITE` |

**[REJECTED] Weekly tournaments.** A tournament needs a large population of simultaneous players, which does not exist at launch. The weekly league (section 14.5) gives the same motivation without depending on simultaneous presence.

**[REJECTED] Study Groups as a separate feature.** A private room, the friends list and a friends leaderboard cover the need of a group of students from the same course. A separate groups product would add membership management, permissions and moderation with no extra learning value.

---

## 12. UI/UX & Design System

### 12.1 Design direction: "the river at night"

**[VERIFIED]** The existing UI ("CYBERDECK") is a hacker terminal: black, magenta, Matrix rain, a mono font for headings. It does not match the brand assets (navy, orange, yellow) and does not welcome beginners.

**[RECOMMENDATION]** A new language drawn from the brand and from the platypus's world — a river at night:

- **A deep navy background**, like river water at night (already used on the splash screen).
- **Warm orange** — the colour of the mascot's bill — for the primary action.
- **JavaScript yellow** for XP and achievements.
- **Glowing cyan** for special moments only, echoing the platypus's biofluorescence.
- Rounded surfaces, gentle depth, and plenty of air.

This change alone makes the app unrecognisable next to the existing version, as the product owner asked.

### 12.2 Colours

| Token | Value | Use |
|---|---|---|
| `bg.base` | `#080930` | Main background (**[VERIFIED]** the existing splash colour) |
| `bg.surface` | `#12143F` | Cards |
| `bg.raised` | `#1B1E55` | Sheets, raised components |
| `bg.code` | `#0B0C2A` | Code area |
| `brand.primary` | `#FF8A3D` | Primary button, emphasis |
| `brand.js` | `#F7DF1E` | XP, stars (**[VERIFIED]** exists in the theme) |
| `brand.glow` | `#21E6F5` | Glow moments, information (**[VERIFIED]** exists) |
| `state.success` | `#4ADE80` | Correct answer (**[VERIFIED]** exists) |
| `state.danger` | `#FF4D6D` | Wrong answer (**[VERIFIED]** exists) |
| `text.primary` | `#F4F3FF` | Primary text |
| `text.secondary` | `#B6B8DE` | Secondary text |
| `text.muted` | `#7C7FB0` | Labels |

**[ASSUMPTION]** The new values are a proposal. A contrast ratio of at least 4.5:1 must be confirmed for every text and background pair before they are fixed, and the orange matched to the mascot's exact hue.

**Light mode [RECOMMENDATION]:** not at this stage. The app is set to dark only (`app.json`), and a dark code view is what the audience expects. All colours are semantic tokens, so adding a light palette later needs no component changes.

**Colour never carries meaning alone.** Right and wrong are also marked with an icon and text, for colour-blind users.

### 12.3 Typography

**[VERIFIED]** There are no custom fonts; `expo-font` is installed and unused.

| Use | Font | Size / weight |
|---|---|---|
| Screen title | Rubik | 28 / 800 |
| Card title | Rubik | 20 / 700 |
| Body | Rubik | 16 / 500 |
| Label | Rubik | 13 / 600 |
| Code | JetBrains Mono | 15 / 500, line height 24 |

- **One UI family for both languages.** Rubik is a rounded sans with Latin and Hebrew glyphs, which matches the rounded wordmark in the email banner and avoids a second UI font for Hebrew.
- **[ASSUMPTION]** Both fonts are distributed under the OFL, and Rubik covers the Hebrew glyphs needed; both points must be confirmed before adoption.
- **System text size:** scaling up to 130% is supported. Beyond that the layout is capped so that code does not break.

### 12.4 Spacing, radii and depth

- **Spacing:** a scale of 4 — 4, 8, 12, 16, 24, 32, 48. Horizontal screen margins of 20.
- **Radii:** chip 8, button 14, card 20, sheet 28.
- **Depth:** three levels only. The primary button gets a dark 4px "bottom lip" that presses in on tap. This gives a tactile 3D feel without 3D rendering.
- **Minimum touch target:** 48×48.
- **Direction-aware by default:** components use start and end, never left and right, so they mirror in RTL without per-screen work (section 12.10).

### 12.5 Code on mobile **[REQUIRED: special emphasis]**

**Displaying code:**

- JetBrains Mono at size 15, line numbers, `bg.code` background.
- Syntax highlighting from a real lexer in place of the existing regex: keywords, strings, numbers, comments, operators, function names.
- **An authoring rule enforced by the content pipeline:** at most 36 characters per line and 12 lines. So there is no wrapping and no horizontal scrolling on most devices.
- The code area's height fits the content, in place of a fixed 170px.
- Tapping a line highlights it; pinching changes font size.
- **Code is always left-to-right**, in both UI languages **[DECIDED]**.

**Code input — three tiers:**

| Tier | When | Description |
|---|---|---|
| **No keyboard** | Most items | Tap, drag and chips. Five of the seven formats need no typing at all. |
| **Token chips** | `FILL_BLANK`, `CODE_WRITE` in the Beginner track | Chips built from the identifiers in the snippet and relevant tokens. A tap inserts at the cursor. Includes a delete chip. |
| **Code keyboard** | `CODE_WRITE` from Intermediate | The system keyboard with an accessory bar above it: `{ } ( ) [ ] ; = => ' " . ,`, cursor arrows, undo, and identifier chips from the snippet. |

- **Hebrew keyboards:** code fields force a Latin keyboard and left-to-right entry, whatever the UI language.
- **Basis:** research on code input on mobile is thin. The main precedent is Microsoft's TouchDevelop, which used tap-selected tokens and custom keypads, and left the regular keyboard for strings and names (S99). No controlled study comparing chips with a keyboard was found; this must be tested with users **[ASSUMPTION]**.

**[VERIFIED]** Existing problems this solves: the input is not in a mono font, chips only append at the end, and there is no delete chip.

### 12.6 Components

| Component | States |
|---|---|
| Primary button | Default, pressed (lip sinks), disabled, loading |
| Secondary button | Outline, no fill |
| Option card | Default, selected (orange border), correct (green with a tick), wrong (red with a short shake), disabled |
| Token chip | Available, placed, returned |
| Parsons line | Rest, dragged (raised with a shadow), drop target |
| Feedback sheet | Correct, wrong on first attempt, solution reveal |
| Map node | Locked, available (pulsing), in progress (progress ring), completed, mastered (glow) |
| Presence badge | Online, in a game, offline |
| Language switch | English, Hebrew |

### 12.7 Motion language **[REQUIRED]**

**Master rule: every animation must do one of four things** — illustrate a concept, confirm an action, direct attention, or celebrate an achievement. An animation that does none of these does not go in.

| Type | Duration | Use |
|---|---|---|
| Micro | 120ms | Press, selection |
| Transition | 220ms | Card entering, sheet |
| Emphasis | 360ms | Correct answer, a value updating in the player |
| Celebration | Up to 1,200ms | Lesson end, win. Skippable with a tap |

- **One hero rule:** one prominent animation per screen at any moment.
- **Haptics:** light on selection, success on a correct answer, error on a wrong answer (**[VERIFIED]** the error haptic exists in the code but never fires).
- **Sound [RECOMMENDATION]:** three short sounds only — correct, wrong, finish. Off by default in silent mode. Needs an audio library.
- **Removed:** Matrix rain, the typewriter greeting effect, and the decorative `system.log`. They do not meet the master rule.

### 12.8 3D: where yes and where no **[REQUIRED]**

| Place | Decision | Reason |
|---|---|---|
| Real-time 3D mascot | **[REJECTED]** | See section 13.2 |
| 3D backgrounds and scenes | **[REJECTED]** | No learning value; performance cost on weaker devices |
| Buttons with a pressing lip | Yes | Tactile feel at almost no cost |
| Cards that flip (solution reveal) | Yes | A simple 3D transform in Reanimated; conveys "the other side" |
| Gentle parallax on the skill map | Yes | Three layers moving at different speeds; gives depth |
| Achievement badges that tilt with device motion | **[REJECTED]** | Decoration only, and a battery cost |

### 12.9 Accessibility and performance **[REQUIRED]**

**Accessibility:**

- **Reduce Motion:** **[VERIFIED]** honoured today in 10 Reanimated components. It extends to every new component. The mascot is built on Reanimated, whose animations follow the system setting by default (S74); under Reduce Motion the mascot shows a static pose for each state.
- **Screen reader:** a label and role on every interactive component (**[VERIFIED]** missing today on option cards and chips). Code is read line by line. Labels are translated with the UI.
- **Alternative to dragging:** in every drag item the user can also tap a line and then a target.

**Performance budget:**

- 60 frames per second on a weak reference device (open question Q7).
- Animations run on the UI thread only.
- At most one mascot instance is animated on a screen at a time.
- The mascot ships as code and vector shapes, with no image sequence and no binary animation file.

### 12.10 Language and direction **[DECIDED]**

**[VERIFIED]** Today every string is English and written directly in the code; there is no translation infrastructure and no RTL support.

**Decision:** the app supports **English and Hebrew**, with full RTL in Hebrew. The user chooses the language in settings. Code is always shown left-to-right.

**Language choice:**

- **First launch:** the app starts in the device language when it is Hebrew, otherwise in English. The first onboarding screen carries a visible language switch.
- **Settings:** a language setting with two options. It is available to guests and registered users.
- **Storage:** on the device for guests; on the account for registered users, so it follows them across devices and decides the language of push notifications.
- **Switching [ASSUMPTION]:** React Native applies a change of layout direction only after the app reloads, so switching between English and Hebrew shows a short "restart to apply" step. To be confirmed on both platforms.

**What is translated:**

- All UI chrome: navigation, buttons, labels, settings, onboarding, error and empty states, accessibility labels.
- Mascot speech bubbles.
- Push notification text.
- Achievement names and descriptions.

**What is not translated:**

- **Code**, always.
- **Question content** — prompts, options, explanations, hints — which is English only under rule R2 (section 7.1). A Hebrew-language user therefore sees a Hebrew interface around English questions. See open question Q10.
- Usernames, room codes, and JavaScript terms (`closure`, `Promise`), which stay in English inside Hebrew sentences, as is normal in the field.

**Resource files:**

- One locale folder with an English file and a Hebrew file, keyed identically. The Hebrew file is the **only** place in the repository where Hebrew is allowed (rule R2).
- No string is written directly in a component.
- A check fails the build when a key exists in one language and not the other.
- Where push text and other server-sent strings live is open question Q13; the recommendation is one shared locale package used by the app and the server, so the exception stays a single location.

**RTL behaviour:**

| Element | In Hebrew |
|---|---|
| Screen layout, tab order, back arrows, lists | Mirrored |
| Progress bars, lesson segments, map path | Fill and flow from right to left |
| Text alignment | To the start (right) |
| **Code blocks, the execution player, Parsons lines, token chips, code input** | **Stay left-to-right, left-aligned** |
| Option cards whose content is code | Content left-to-right inside a mirrored card |
| Numbers, scores, timers, room codes, usernames | Left-to-right |
| Mixed sentences (Hebrew with an English term or `code`) | Each inline code span is isolated so punctuation does not jump |
| Mascot | Not mirrored; its position on the screen follows the layout |
| Swipe and drag gestures | Horizontal "back" follows the mirrored layout; vertical drag in Parsons is unchanged |

**Affected screens:** every screen. The ones needing explicit design attention, because they mix directions, are the lesson player, the feedback sheet, the execution player, the match round, the lobby, the leaderboard and the profile.

---

## 13. Mascot & Animation Strategy

### 13.1 What the research says

- **No controlled study comparing "with a mascot" against "without"** on user retention was found, and neither Duolingo nor Brilliant publishes a measured effect of the mascot itself.
- **The one hard number:** Duolingo's new streak animation raised 7-day retention of new users by 1.7% (S5). That is the effect of a celebration moment, not of a constant presence.
- **Pedagogical agents:** a 2021 meta-analysis found a small learning benefit, with an advantage for 2D agents (0.38) over 3D ones (0.11) (S66, snippet).
- **The persona effect:** a lifelike character improves **perceived** learning, not measured learning (S67, snippet).
- **Distraction risk:** appealing but irrelevant details hurt learning, mostly for novices and in lessons under 5 minutes (S36, snippet).

**Conclusion:** the mascot is a tool for emotion and brand identity, not a teaching tool. Its place is the transition moments — before and after thinking, not during it.

### 13.2 Decision: an agent-made vector mascot **[DECIDED]**

The product owner decided that the AI agent designs and animates the mascot. This section states the best achievable approach and its limits.

**Options considered:**

| Option | Decision | Reason |
|---|---|---|
| **Vector character in SVG, animated with Reanimated, driven by a small state machine** | **Chosen** | The agent can write it entirely as code; Reanimated is already installed; it honours Reduce Motion by default; nothing binary to produce |
| Rive file with a state machine | Not achievable by the agent | A Rive file is made in the Rive editor, a visual tool. The agent cannot operate it or produce the binary file. Used by Duolingo and Brilliant (S68, S10), so it remains the upgrade path |
| React Native Skia | Fallback | More drawing power (blur, shaders) but adds about 6MB on iOS and 4MB on Android (S90, snippet). Used only if SVG proves too slow |
| Lottie | Rejected | Plays fixed clips; the agent cannot author them either; no interactive state machine |
| Real-time 3D | **[REJECTED]** | The research favours 2D; no independent performance benchmarks exist for any 3D library in React Native; high production cost |
| Image sequence from the existing render | Rejected | Heavy files, no interactivity, and only a bust exists |

**How it is built:**

- **The character** is a full-body platypus drawn as layered vector shapes: body, head, bill, eyes and eyelids, cheeks, front feet, back feet, tail. Each part is a separate, named shape with its own pivot point.
- **Animation** is a set of numeric values per part (rotation, position, scale, opacity, path shape between two poses) driven by Reanimated on the UI thread.
- **The state machine** is plain TypeScript: 12 named states, the allowed transitions between them, and two continuous inputs (`streakLength`, `mood`).
- **Idle life** comes from several independent loops with different periods (breathing, blinking, tail sway), so the motion does not look repeated. This mirrors the approach Duolingo describes (S69).
- **One component** exposes the mascot to the rest of the app: it takes a state and the two inputs and nothing else.

**Required new dependency:** `react-native-svg`. That is the only one for the mascot. **[ASSUMPTION]** that animating SVG properties through Reanimated holds 60fps on the reference device for a character of this complexity; this is tested first, with Skia as the fallback.

**Honest limits of an agent-made mascot:**

- **It will not look like the current icon.** The icon is a 3D-style render with fur, lighting and soft shading. The in-app character will be a flat, geometric vector drawing in the same colours. The two will read as the same animal, not as the same artwork.
- **The agent works without an artist's eye.** It can check its output through simulator screenshots, but judging charm, appeal and timing is a human strength. Expect a clean, competent character, not studio-grade character animation.
- **Technique limits.** Hand-coded rigs have no bones or mesh deformation. Motion is built from rotating, moving, scaling and blending shapes. Squash-and-stretch and overlapping motion are possible; fluid, organic deformation is not.
- **The glow is simulated** with layered translucent shapes and gradients, not a true blur.
- **The icon, splash and email art stay as they are**, since the agent cannot redraw a 3D render. This leaves a visible style gap between the app icon and the in-app character.

**Upgrade path [RECOMMENDATION]:** the component's interface — the 12 state names and the two inputs — is defined so that a professionally made Rive file can replace the vector rig later with no change to any screen. The current Rive runtime for React Native requires React Native 0.78+ and Expo SDK 53+, which the project meets (S72).

### 13.3 What makes it distinctive: behaviours from a real platypus

What separates this mascot from an owl or a generic character is that its behaviours come from real biology. Every trait is documented by the Australian Museum (S70), except the glow (S71, snippet).

| Real trait | Behaviour in the product | Where |
|---|---|---|
| **The bill is an electro-sensing organ** used to find prey | **"Bug sense":** the bill trembles and gives off small sparks when a bug is near | Hint in `FIX_BUG`; Bug Hunt mode |
| **Dives with eyes, ears and nostrils closed**, 30–140 seconds | **Dive:** dives into the water with eyes shut and surfaces with the result | Opponent search, loading |
| **Cheek pouches** for storing food | **Full cheeks:** collects XP in its cheeks during the lesson and spits it out at the end | Lesson summary screen |
| **A tail that stores fat** as a reserve | **The streak tail:** the tail thickens as the streak grows; a streak freeze is "stored in the tail" | Home, streak screen |
| **Lives in a burrow** in the riverbank | **The burrow:** peeks from the burrow, hides in it, sleeps in it | Empty state, streak at risk, late night |
| **Glows green-cyan under UV light** | **Glow state:** the fur glows in `brand.glow` | Milestones only: perfect lesson, unit mastered, tier promotion |
| **Webbed front feet** | **Wave:** waves a webbed hand | Welcome, win |

This answers the product owner's request directly (walks, moves, waves on a win, hides), and each motion also teaches something true about the animal and belongs to Platyko alone.

**Note on the glow:** the finding rests on a small sample of museum specimens and its function is unknown (S71). It is used as design inspiration, not as a scientific claim inside the product.

### 13.4 The state machine — 12 states

| State | Trigger | Description |
|---|---|---|
| `idle` | Default | Breathing, blinking, a light tail sway |
| `wave` | Entering the app, opening onboarding | Waves a webbed hand |
| `think` | Waiting for the AI or the server | Head tilted, bill moving |
| `sense` | Hint in `FIX_BUG` | Bill trembling with sparks |
| `cheer` | Correct answer (short), lesson end (full) | A small hop; in the full version, XP spat from the cheeks |
| `comfort` | Solution reveal after two attempts | An encouraging look and a nod. **Not sad and not disappointed** |
| `dive` | Opponent search | Dive, bubbles, surfacing with the opponent's avatar |
| `glow` | Milestone | The fur glows cyan |
| `hide` | Streak at risk; empty state | Peeks from the burrow |
| `sleep` | Late night | Asleep in the burrow |
| `victory` | Game won | A victory dance with a wave |
| `defeat` | Game lost | A sporting shrug |

**Continuous inputs:** `streakLength` (controls tail thickness) and `mood` (driven by the run of answers: Brilliant describes a character that reacts differently to a struggling learner and to one breezing through, S10).

### 13.5 Appearance rules **[REQUIRED: natural, not in the way]**

**Appears:**

- Onboarding: accompanies the steps.
- Home: at the top of the screen, in a state that reflects the streak.
- The feedback sheet: small, in the corner, with a short reaction.
- The lesson summary screen: the full animation.
- Opponent search, win and loss.
- Empty states and network errors.
- The in-game reaction emoji.

**Does not appear:**

- **While an item is being solved.** The screen belongs to the code alone.
- In the execution player.
- During an active game round.
- In settings, forms and authentication screens.

**Tone rules:** the mascot does not blame, does not guilt-trip over a broken streak, and does not speak in long sentences. Speech bubbles are at most 8 words, in the user's chosen language. The tone is warm and a little dry — right for an experienced developer too.

---

## 14. Profiles & GitHub Integration

### 14.1 Developer profile **[REQUIRED]**

**Screen structure, top to bottom:**

1. **Header:** avatar, username, bio (up to 160 characters), GitHub link if connected, presence badge.
2. **The three measures:** level and XP; duel tier and rating; current and best streak.
3. **Activity map:** a 12-week board in the GitHub style, each cell a practice day. Familiar and professional for the audience.
4. **Track progress:** four progress bars with mastery percentage.
5. **Strengths and areas to improve:** the three strongest and three weakest concepts, by mastery score. Shown to the profile owner only.
6. **Achievements:** up to 6 chosen badges.
7. **Games:** wins, losses, draws, and the last 10 games.
8. **Friends:** count, and mutual friends.

**Another user's profile** shows the same structure subject to privacy settings, with "add friend", "invite to duel", "block" and "report" buttons.

**Data fix:** deleting an account today deletes all of the user's `DuelSession` rows, and with them the opponent's history (**[VERIFIED]** `deleteAccountHandler.ts:18-28`). In the new model the deleted participant becomes "deleted user" and the game is kept for the others.

### 14.2 Achievements and badges **[REQUIRED]**

**Principle:** badges for **demonstrated skill**, not for presence. Few and meaningful. A clean geometric emblem style, not a cartoon sticker, to stay professional.

| Group | Examples |
|---|---|
| Mastery | Unit mastered; track completed; 50 `FIX_BUG` items on the first attempt |
| Persistence | Streak of 7, 30, 100 days |
| Competition | 10 rated wins; reaching a tier; winning a room of 4 |
| Social | A 14-day Friend Streak |
| Rare | A perfect lesson in every unit of a track |

About 25 badges at launch. An unearned badge shows as a silhouette with the condition to earn it.

### 14.3 GitHub **[REQUIRED to evaluate]**

**Recommendation: yes, with minimal scope.**

| Capability | Decision | Permissions |
|---|---|---|
| Sign in with GitHub | Yes | `read:user`, `user:email` |
| Link GitHub to an existing account | Yes | Same permissions |
| Show the link and username | Yes | — |
| Show public repository and follower counts | Yes, with explicit consent | Public data only |
| **A badge for a README file** | Yes **[RECOMMENDATION]** | — |
| Share an achievement as an image | Yes | — (the system share sheet) |
| Access to repositories, private or public | **[REJECTED]** | No need |
| Writing to GitHub (gist, commit) | **[REJECTED]** | No need; a trust risk |

**Permissions:** `read:user` reads profile data and `user:email` reads email addresses (S76). `user:email` is needed to obtain a verified address for creating the account. No other permission is requested.

**Implementation:**

- **The code-for-token exchange must happen on the server.** GitHub supports PKCE, but `client_secret` is still required in the exchange (S77). The secret is not stored in the app.
- GitHub provides no ID token as Google and Apple do. The server calls `/user` and `/user/emails` and uses only a primary, verified address.
- The GitHub token is **not stored** after the profile is read. Refreshing public data uses a call with no user token.
- New OAuth apps get expiring tokens by default (S78); this does not affect us because the token is not kept.
- **App Store:** guideline 4.8 requires a privacy-preserving sign-in option beside any third-party sign-in (S80). Sign in with Apple already exists, so no new obligation is expected **[ASSUMPTION]**.

**README badge [RECOMMENDATION]:** a public URL that returns an SVG image with the username, track, tier and streak, for embedding in a GitHub profile. Active only when the user turns it on. It is a distribution tool developers use by choice, and it is professional, not childish.

**Data model:** **[VERIFIED]** today there is a separate column per provider (`googleId`, `appleSub`), and no automatic account linking. **[RECOMMENDATION]** Move to an `AuthIdentity` table (section 15.3), which allows several providers per account without a new column for each.

### 14.4 Sharing

- An image card generated on the device: an achievement, a game result or the daily challenge result.
- Sharing through the system sheet. No direct integration with social networks.
- The daily challenge result is shared as a grid of squares that does not reveal the questions.

### 14.5 Weekly league **[RECOMMENDATION]**

- Groups of 30 users, ranked by XP earned that week. Inspired by Duolingo and Brilliant (S1, S9).
- Automatic enrolment after the first lesson of the week. The league can be left in settings.
- Grouping by similar activity level, so a beginner does not compete with a heavy user.
- **Hard precondition:** the new XP model (section 6.8) and the closing of the farming loopholes. A league on the existing XP would reward exploiting them.
- **Risk:** no independent study on leaderboard pressure was found. So the league can be turned off and is not shown on Home to anyone who left it.

---

## 15. Technical Architecture

**Principle:** no architecture replacement. Every recommendation extends what exists.

### 15.1 Frontend

| Change | Detail | Complexity |
|---|---|---|
| New design tokens | Replace `theme/theme.ts`; load two fonts through the already-installed `expo-font` | Low |
| Base components | Button, card, sheet, chip — replacing `TerminalFrame`, `TerminalHeader`, `MatrixRain`, `MatrixBurst`, `TypewriterText`, which are deleted | Medium |
| Localisation | Locale files for English and Hebrew, a translation lookup, the language setting, direction-aware layout | Medium |
| Item player | One component per format, under a shared lesson player | High |
| Dragging | `react-native-gesture-handler` is already installed; `GestureHandlerRootView` is missing | Medium |
| Code view | A lexer in place of regex; line numbers; forced left-to-right | Medium |
| Execution player | Displays a ready `trace`; no code runs on the device | Medium |
| Skill map | Replaces `LearnRoadmapScreen` | Medium |
| Mascot | Vector shapes with `react-native-svg`, animated with Reanimated, one wrapping component | High — the agent draws and animates it |
| Social screens | Friends, search, public profile, invitations inbox, lobby | High |
| Redux | New slices: `social`, `match` (replaces `duelLive`), `review`, `settings` (language); `lesson` is rebuilt | Medium |

**New navigation:** four tabs — Home, Learn, Play, Profile. Code Puzzle stops being a separate screen and becomes the `CODE_WRITE` format inside lessons and the daily challenge (open question Q9).

**New dependencies:**

| Dependency | For | Notes |
|---|---|---|
| `react-native-svg` | The mascot's vector shapes | Required |
| A translation library, or a small in-house lookup | English and Hebrew strings | The choice is an implementation decision; a small lookup avoids a dependency |
| A JavaScript lexer | Syntax highlighting | Open question Q3 |
| An audio library | Three feedback sounds | Optional with sound |
| `expo-notifications` | Remote push | Already installed |

Each new dependency needs explicit approval before installation. None has been installed.

### 15.2 Backend

**New routes:**

| Area | Routes |
|---|---|
| Content | `GET /api/content/map` (the map with the user's state); `GET /api/content/lessons/:id` |
| Progress | `POST /api/progress/attempts` (record an attempt, right or wrong); `GET /api/review/due` |
| Social | `GET /api/users/search`; `GET /api/users/:username`; `POST`/`PATCH`/`DELETE /api/friends/requests`; `GET`/`DELETE /api/friends`; `POST`/`DELETE /api/blocks`; `POST /api/reports` |
| Profile | `PATCH /api/user/profile` (extended with bio, privacy and language); `GET /api/user/matches` |
| Notifications | `POST`/`DELETE /api/push-tokens` |
| GitHub | `POST /api/auth/github`; `POST`/`DELETE /api/user/identities/github` |
| Public | `GET /api/public/badge/:username.svg` |
| Game | `POST /api/rooms` (create a room and return a code); `GET /api/rooms/:code` (existence check) |
| League | `GET /api/league/current` |
| AI | `POST /api/items/:id/explain` |

**A change of principle:** the server records **every attempt**, including wrong ones. Today only a registered user's correct answer reaches the server. Without this there is no mastery, no review and no item analysis.

**Answer checking in lessons [RECOMMENDATION]:** stays on the client, with the answers in the payload, as today. This allows instant feedback and offline use, and the risk is low because lesson XP is limited to once per item. In games, checking is on the server only, as today.

**Error messages:** the server keeps returning generic errors and codes. The app turns a code into text in the user's language, so no translated text lives in the backend.

### 15.3 Database

**New models** (an outline, not a final schema):

```prisma
model Item {              // replaces Exercise, ExerciseOption, CodePuzzle, DuelQuestion
  id           String  @id      // stable id from the content file
  track        Track
  unit         String
  concept      String
  format       ItemFormat
  difficulty   Int
  payload      Json            // prompt, code, options, solution, hints, trace, reference
  provenance   Json            // author, originality result, verification run id
  duelEligible Boolean
  status       ItemStatus
  version      Int
  @@index([track, unit])
  @@index([duelEligible, track, status])
}

model ItemAttempt {       // every attempt, right or wrong
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  correct   Boolean
  attemptNo Int
  optionIdx Int?            // which distractor was chosen
  usedHint  Int
  createdAt DateTime @default(now())
  @@index([userId, itemId])
  @@index([itemId, createdAt])
}

model ConceptMastery {    // mastery and review scheduling
  userId   String
  concept  String
  score    Int
  interval Int
  ease     Float
  dueAt    DateTime
  @@id([userId, concept])
  @@index([userId, dueAt])
}

model Friendship {        // one row per pair
  id          String   @id @default(cuid())
  requesterId String
  addresseeId String
  status      FriendshipStatus   // PENDING, ACCEPTED, DECLINED
  createdAt   DateTime @default(now())
  @@unique([requesterId, addresseeId])
  @@index([addresseeId, status])
}

model Block  { blockerId String; blockedId String; @@id([blockerId, blockedId]) }
model Report { id String @id; reporterId String; targetUserId String; reason String; context Json?; createdAt DateTime }

model AuthIdentity {      // replaces googleId and appleSub
  provider String         // GOOGLE, APPLE, GITHUB
  subject  String
  userId   String
  @@id([provider, subject])
  @@index([userId])
}

model Match {             // replaces DuelSession
  id        String   @id
  mode      MatchMode        // RANKED, FRIEND, ROOM, GHOST
  track     Track
  rounds    Int
  itemIds   String[]         // for replay and ghost recordings
  startedAt DateTime
  endedAt   DateTime
}

model MatchParticipant {
  matchId      String
  userId       String?       // null after account deletion
  placement    Int
  score        Int
  correct      Int
  answers      Json          // per round: answer, time, points
  ratingBefore Float?
  ratingAfter  Float?
  left         Boolean
  @@id([matchId, userId])
  @@index([userId])
}

model PushToken    { token String @id; userId String; platform String }
model Achievement  { userId String; code String; earnedAt DateTime; @@id([userId, code]) }
model ItemFeedback { itemId String; userId String; vote Int?; reportReason String?; @@id([itemId, userId]) }
```

**Changes to `User`:** add `xpTotal`, `level`, `streakCurrent`, `streakBest`, `streakFreezes`, `bio`, `language`, privacy settings, `rating`, `ratingDeviation`, `ratingVolatility`, `githubLogin`, `friendCode`, `weeklyGoalDays`.

**Migration — principles:**

- Add before removing: the new models are created beside the old ones, data is copied, and the old ones are deleted only after verification.
- XP: the sum of all the user's `UserProgress` rows, divided by 25. Streak: the highest across the rows.
- `completedExerciseIds` map to the new item ids through a conversion table produced by the content migration.
- `DuelSession` is copied to `Match` and `MatchParticipant`; solo games are marked `GHOST`.
- **Risk:** `DuelQuestion` ids change on every seed (**[VERIFIED]**), so the question history of old games cannot be recovered. History will hold results only.

**Indexes for user search:** a prefix index on lower-cased `username`. No search engine is needed.

### 15.4 Socket.IO architecture

**[VERIFIED]** Socket.IO 4.8 is the existing technology, and it fits. Replacing it is not recommended.

**New structure:**

- **One namespace, `/play`,** in place of `/duel`, handling both presence and games. One connection per user.
- **A shared event contract:** a new package `packages/realtime-contract` with the types of every event and payload, used by `io` and `mobile`. Today the events are untyped and there is no shared contract (**[VERIFIED]**).
- **Generalised match state:** `MatchState` with `participants: Map<userId, ParticipantState>` in place of `player1`/`player2`. This is the most expensive change: the two-player assumption appears in about 15 files across `io`, the backend and the client.

**Events:**

| Direction | Events |
|---|---|
| Client → server | `queue_join`, `queue_leave`, `invite_send`, `invite_respond`, `room_join`, `room_leave`, `room_ready`, `room_start`, `room_kick`, `answer_submit`, `match_leave`, `rematch_request`, `reaction_send` |
| Server → client | `presence_update`, `invite_received`, `invite_result`, `queue_status`, `room_state`, `match_countdown`, `round_start`, `answer_result`, `round_result`, `match_end`, `participant_status`, `match_snapshot`, `ghost_offer` |

**State storage:**

- State stays in process memory, behind a `MatchStore` interface, so the implementation can be swapped without touching the logic.
- **Graceful shutdown [RECOMMENDATION]:** on a version update the service stops accepting new games and waits for the active ones to finish, up to 6 minutes. Today a restart wipes live games.

**Scaling to several instances:** see section 15.10.

**Tests:** `io` has no tests today. The new engine must have a test suite before the modes are built: scoring, tie-breakers, disconnect and reconnect, leaving, and host handover.

### 15.5 Safe code execution

**[VERIFIED]** isolated-vm with a fresh isolate per test case, 32MB and 100ms, with no call back into the host.

- **Kept** for all user-submitted code. It works and it is secure.
- **Extension:** `CODE_WRITE` also supports a multi-line function body, not only one expression. The time limit rises to 250ms per case **[ASSUMPTION]**.
- **Content verification runs separately.** Authored snippets are trusted, so Gate A executes them in a Node worker with a time limit (section 8.3). This is build-time tooling, not part of the running service.
- **Risk:** isolated-vm is in maintenance mode, and the maintainer commits to support "as long as is technically feasible" (S83).
- **Fallback plan:** `quickjs-emscripten` — QuickJS in WebAssembly, with no host access by default and memory and time limits. The library states it has not been security-audited (S84). The sandbox should sit behind one interface so a swap is possible.
- **Execution on the device [REJECTED]:** a result computed on the device cannot be trusted for XP or scoring. No citable source was found for this; it is an engineering conclusion.

### 15.6 Push notifications

- `expo-notifications` is already installed and used for local notifications.
- Needed: registering a push token on the server, and sending through Expo's push service.
- Push is not available in Expo Go on Android from SDK 53 and needs a development build (S81).
- **Smart daily reminder:** moves from a fixed local notification at 19:00 to one sent only when the goal is not met.
- **Language:** the server sends each notification in the recipient's stored language, taking the text from the shared locale files (open question Q13).

### 15.7 Security, privacy and permissions

| Topic | Requirement |
|---|---|
| Another user's data | Every route that returns another user goes through one function that filters by privacy and block. Email is never exposed. |
| Search | Rate limit per user; at least 3 characters; up to 20 results; users who turned off search or blocked the searcher do not appear. |
| User enumeration | **[VERIFIED]** Register and login reveal today whether an email exists. Fix together with search. |
| Room codes | 6 characters from an alphabet of 31; a per-user limit on join attempts; a room closes after 10 minutes of inactivity. |
| Public badge | Off by default; reveals only what the user approved; cached. |
| GitHub | Secret on the server only; the token is not stored; verified email only. |
| Account deletion | Deletes friendships, blocks, push tokens and identities; the match participant becomes anonymous. |
| Rate limiting | **[VERIFIED]** In memory and per IP. Social routes need limits per user. |
| Apple | **[VERIFIED]** Apple token revocation on deletion is missing; listed in `AGENT_TASKS.md`. Blocks launch. |

### 15.8 Performance and resource use

- **Content payload:** the skill map loads without item content. A lesson loads on demand and is cached on the device. Today all of a level's exercises load in one request.
- **`trace`:** capped at 60 steps per item.
- **Presence:** updates go to online friends only, not to the whole namespace. **[VERIFIED]** Today `queue_status` is broadcast to everyone on every connect and disconnect.
- **Recording attempts:** sent as a batch at the end of a lesson, not one request per answer.
- **Mascot:** one animated instance per screen; idle loops pause when the screen is not focused.

### 15.9 "Explain my mistake" (AI) **[RECOMMENDATION]**

**Basis:** a study published in PNAS in 2025 found that unrestricted access to a language model harmed performance once removed, and that a hint-only tutor reduced the harm but did not beat the control group (S85, snippet). So there is no free chat and no "solve it for me".

**Scope:**

- **First layer, no live AI:** the three hints and the explanation per distractor are written in advance and pass the verification gates. The bank is finite, so this covers most cases at no running cost.
- **Second layer, live AI:** only in `CODE_WRITE` items, where the answer is free code and no explanation can be written in advance. The model receives the item, the reference solution and the user's code, and returns a short explanation **without writing the solution**.
- **Limits:** registered users only; 10 requests a day; a reply of up to 80 words.
- **Language:** the explanation is returned in the user's chosen language, with code left as is.
- **Cost:** the system instructions and item details are kept in a prompt cache; a cache read costs a tenth of the regular input price (S87).
- **Risk:** the model may reveal the solution despite the instruction. CS50 reports a similar "instruction dilution" effect (S86, snippet). An automated check that the reply does not contain the reference solution is required.

### 15.10 Scalability

**Position: do not add infrastructure before it is needed.**

| Component | Today | What blocks scaling | When to act |
|---|---|---|---|
| Backend | One instance, almost stateless | In-memory rate limiting | When a second instance is needed: move to DB- or Redis-based rate limiting |
| `io` | One instance, in-memory state | Queue, games and rooms in memory; no adapter | See below |
| Postgres | One instance on the same server | — | When load justifies it: move to a managed service |

**Scaling `io` — three steps, only when needed:**

1. The Redis Streams adapter for broadcasts across instances. It also supports Connection State Recovery, unlike the classic Redis adapter (S61, S62).
2. Moving queue, room and presence state to Redis. The adapter synchronises broadcasts only, not application state.
3. Sticky sessions, or limiting the server to WebSocket only; the client is already set that way (**[VERIFIED]** `duelSocketIo.ts:16`). Sticky sessions are needed because of HTTP long-polling (S63).

**Trigger to scale [ASSUMPTION]:** sustained use above 60% of the `io` CPU, or a need for version updates with no downtime. No citable capacity figures for a single Socket.IO instance were found; this must be measured with a load test.

| Technology decision | Benefits | Drawbacks | Risk |
|---|---|---|---|
| Unified `Item` model | One source of truth; a large duel pool at once | Migration of four tables | Medium — data migration |
| N-player game engine | One engine for all modes | Rewriting most of `io` | High — no existing tests |
| Agent-made SVG mascot | No external artist; code-only; honours Reduce Motion | Simpler look than the icon; style gap | Medium — visual quality and performance |
| User-level XP | A meaningful level; a trustworthy league | Migration; changes to shared packages | Medium |
| `AuthIdentity` | Several providers, account linking | Migration of existing identities | Low |
| Two languages with RTL | Serves the primary audience | Every screen needs direction testing; restart on switch | Medium |
| No Redis at this stage | Operational simplicity | Single instance; a restart interrupts games | Low, with graceful shutdown |

---

## 16. User Flows & Screen Specifications

### 16.1 New screen map

```
Onboarding (5 steps) ──► Home
Tabs:  Home | Learn | Play | Profile

Home    ─► Lesson Player ─► Lesson Summary
        ─► Review Session
        ─► Daily Challenge
Learn   ─► Skill Map ─► Unit Sheet ─► Lesson Player
                     ─► Jump Test
                     ─► Revision Setup ─► Revision Session
Play    ─► Ranked Queue ─► Match ─► Results
        ─► Friends ─► Friend Profile ─► Invite ─► Match
        ─► Create Room ─► Lobby ─► Match ─► Podium
        ─► Join Room (code)
        ─► Invitations Inbox
Profile ─► Edit Profile | Privacy | Achievements | Match History
        ─► Friends ─► Search | Requests
        ─► Settings (language, notifications, sound, GitHub, account)
```

In Hebrew the tab order and every horizontal flow are mirrored; the map above shows the English layout.

### 16.2 Flow: first launch (guest)

1. **Welcome screen.** The mascot waves (`wave`). A language switch (English / Hebrew) in the corner, preset from the device language. A "let's start" button and a small "I have an account" link.
2. **"How much JavaScript do you know?"** Four options: never written any; I know the basics; I write JavaScript; experienced developer.
3. **A first item at once.** An easy `PREDICT_OUTPUT`, before any further question. The user experiences the product within 20 seconds.
4. **Weekly goal:** 3, 5 or 7 days.
5. **Notifications:** a permission request with an explanation; can be skipped.
6. **Home**, with the first lesson ready.

Anyone who chose a level other than "never" is offered a jump test. **No registration is required at any step** **[REQUIRED]**.

### 16.3 Flow: a lesson

1. Tapping "continue" on Home opens the next lesson **directly** (today it switches tab).
2. A top progress bar with 8 segments. The exit button saves the position.
3. Per item: read, act, "check", feedback sheet, "continue".
4. A wrong item returns at the end.
5. **Summary screen:** the mascot spits XP from its cheeks (`cheer`); real accuracy; XP earned in the lesson; the concepts practised; the streak update.
6. Primary button: "next lesson". Secondary: "back to the map".

### 16.4 Flow: a wrong answer

1. The user picks a distractor and taps "check".
2. The card turns red with a short shake and an error haptic.
3. A bottom sheet rises: the mascot small in the corner, the title "almost", and the explanation of the chosen distractor.
4. Two buttons: "try again" (primary) and "hint".
5. **Second wrong attempt:** the card flips and reveals the correct answer, with a full explanation and a "see it run" button. The mascot is in `comfort`.
6. The item enters Review.

### 16.5 Flow: adding a friend

1. Profile → Friends → Search.
2. Typing at least 3 characters shows results with avatar, level and tier.
3. Tapping a result opens the profile; "add friend".
4. The button becomes "request sent" with a cancel option.
5. The recipient gets a notification and a red dot on the Profile tab.
6. On the Requests screen: "accept" or "decline".
7. On accept: both sides see each other in the list; the sender gets a notification.

### 16.6 Flow: Friends Duel

1. Play → Friends → tap an online friend → "invite to duel".
2. Pick a track, then "send".
3. The inviter sees a waiting screen with a 60-second countdown and a cancel option.
4. The invitee sees a banner: "@noa invites you to a duel · Intermediate", with "accept" and "decline".
5. **Accept:** both move to a VS screen with a 3-second countdown, then to the game.
6. **Decline or expiry:** the inviter sees "@omer is not available right now". Decline and expiry are not told apart, to avoid awkwardness.

### 16.7 Flow: a private room

1. Play → Create Room: track, number of rounds, number of players.
2. **Lobby.** The room code in large characters, a "share link" button, and an "invite friends" button that opens the list of online friends.
3. Players join. Each marks Ready.
4. When everyone is ready, the host's "start" button becomes active.
5. A synchronised 3-second countdown.
6. **Round:** question, timer, and a row of avatars showing who has already answered.
7. **Between rounds:** the leaderboard with a place-swap animation, 4 seconds.
8. **End:** podium, full table, "play again" and "back to lobby".

### 16.8 Flow: changing language

1. Profile → Settings → Language.
2. Two options: English, Hebrew. The current one is marked.
3. Choosing the other shows a confirmation: the app restarts to apply the change.
4. After the restart the whole UI is in the new language and direction. Lesson position, progress and login are unchanged.
5. Code, question text, usernames and room codes look the same in both languages.

### 16.9 Wireframes

The wireframes show the English layout. In Hebrew the layout is mirrored and labels are translated, while every code block stays as drawn.

**Home**

```
┌──────────────────────────────┐
│ Hi, Noa            🔥 12  ⚡ 340│
│        (platypus, idle)      │
│  Week: ● ● ● ○ ○ ○ ○   3/5   │
├──────────────────────────────┤
│ CONTINUE                     │
│ Closures · Lesson 2 of 4     │
│ ▓▓▓▓▓▓▓░░░░░░  [ Continue ▶ ]│
├──────────────────────────────┤
│ Review due: 6 items   [Start]│
├──────────────────────────────┤
│ Daily Challenge  ·  ends 14h │
├──────────────────────────────┤
│ Play:  [Ranked] [Friends] [Room]
└──────────────────────────────┘
```

**A PREDICT_OUTPUT item**

```
┌──────────────────────────────┐
│ ✕   ▓▓▓▓░░░░                 │
│ What does this print?        │
│ ┌──────────────────────────┐ │
│ │1 let count = 0;          │ │
│ │2 for (let i=0; i<3; i++){│ │
│ │3   count += i;           │ │
│ │4 }                       │ │
│ │5 console.log(count);     │ │
│ └──────────────────────────┘ │
│ [ 3 ]                        │
│ [ 6 ]                        │
│ [ 2 ]                        │
│              💡 Hint         │
│ [          Check           ] │
└──────────────────────────────┘
```

**Feedback sheet — wrong, first attempt**

```
┌──────────────────────────────┐
│ (platypus)  Almost.          │
│ You added 1+2+3. The loop    │
│ starts at i = 0, so it adds  │
│ 0+1+2.                       │
│ [ Try again ]      [ Hint ]  │
└──────────────────────────────┘
```

**Execution player**

```
┌──────────────────────────────┐
│  1 let count = 0;            │
│▶ 3   count += i;      step 5 │
├──────────────────────────────┤
│ Variables                    │
│  count   1  →  3             │
│  i       2                   │
├──────────────────────────────┤
│ Output:  (empty)             │
│  ◀ Prev    ▶ Play    Next ▶  │
└──────────────────────────────┘
```

**Lobby**

```
┌──────────────────────────────┐
│ Room  K7M3PQ      [ Share ]  │
│ Intermediate · 7 rounds      │
├──────────────────────────────┤
│ ★ Noa (host)         ✓ Ready │
│   Omer               ✓ Ready │
│   Dana               … Waiting│
│   + Invite friend            │
├──────────────────────────────┤
│ [   Ready   ]                │
│ Waiting for everyone...      │
└──────────────────────────────┘
```

**A game round**

```
┌──────────────────────────────┐
│ Round 3/7            ⏱ 0:18  │
│ (N✓) (O✓) (D…) (Y…)          │
│ Which line has the bug?      │
│ ┌──────────────────────────┐ │
│ │1 function sum(arr) {     │ │
│ │2   let total;            │ │
│ │3   for (const n of arr)  │ │
│ │4     total += n;         │ │
│ │5   return total;         │ │
│ └──────────────────────────┘ │
│ Tap a line. 2 attempts.      │
└──────────────────────────────┘
```

### 16.10 Empty and error states

| State | Display |
|---|---|
| No friends | The mascot peeks from the burrow (`hide`); "quiet here so far"; "find a friend" and "share my code" buttons |
| No review due | "Nothing to review today" |
| No network in a lesson | The lesson continues from the cached copy; attempts are stored and sent when the network returns |
| No network in Play | The mascot in a paused `dive`; "no connection"; a "practise against a recording" button if one is cached on the device |
| Search with no results | "We could not find @xyz"; an offer to share a friend code |
| Wrong or expired room code | "The room was not found or has closed" |

---

## 17. Edge Cases & Security

### 17.1 Learning

| Case | Behaviour |
|---|---|
| Leaving mid-lesson | Position and attempts are saved; "continue" returns to the same item |
| An item is removed (`FLAGGED` or `RETIRED`) mid-lesson | The lesson skips it; earlier attempts are kept |
| An item's version changed | Old attempts stay tied to the old version and do not enter the new version's analysis |
| `CODE_WRITE` with an infinite loop | The sandbox stops at the time limit; message: "The code ran too long. Check the stopping condition" |
| A correct `CODE_WRITE` not in the answer list | The test cases decide, not text comparison. **[VERIFIED]** This is how it works today |
| `PARSONS` with more than one correct order | Gate A executes every ordering; all correct ones are accepted |
| The device clock is changed | **[VERIFIED]** `trustedCalendarDate` accepts a client date only within one day of the server. Kept |
| Two devices on one account | The server is the source of truth; attempts are merged by unique id |
| Offline use | Cached lessons work; XP is computed on the server at sync |

### 17.2 Language and direction

| Case | Behaviour |
|---|---|
| A key is missing from the Hebrew file | The build fails; at runtime the English string is the fallback |
| A Hebrew sentence containing a code term or an English word | The term is direction-isolated so punctuation stays in place |
| A username in Hebrew letters | Allowed as user data in the database; it is never written into the repository |
| An English-language user receives an invitation from a Hebrew-language user | Each side sees the notification in their own language; the username is shown as stored |
| The device language is neither English nor Hebrew | The app starts in English |
| Language switched mid-lesson | The lesson position is saved before the restart |
| A long Hebrew translation overflows a button | Buttons size to their text; no fixed widths |

### 17.3 Social

| Case | Behaviour |
|---|---|
| Two users send each other a request | The second request accepts the first automatically |
| Blocking a friend | The friendship is deleted; pending invitations are cancelled |
| Blocking mid-game | The game continues; the block applies from the next game |
| Deleting an account with pending requests | Everything is deleted; the user disappears from others' lists |
| Changing username | Old profile links stop working; the friend code stays fixed |
| Friend-request flooding | At most 20 pending; rate limit; a 30-day wait after a decline |
| An offensive username | Blocked by the word list on register and on change; can be reported |
| An invitation to a user already in a game | "@user is in a game right now"; the invitation is not sent |

### 17.4 Multiplayer

| Case | Behaviour |
|---|---|
| Two players answer in the same millisecond | It does not matter: each is scored on their own time |
| An answer arriving after the timer ends | Rejected; the server decides |
| A player disconnects during the countdown | 2-player game: cancelled with no rating effect. Room: starts without them if 2 remain |
| The host leaves the lobby | The longest-present player becomes host |
| The host leaves mid-game | The game continues; the role matters only in the lobby |
| Everyone leaves | The game closes; it is saved with what was played |
| The app goes to the background mid-round | Treated as a disconnect after 5 seconds; the grace period applies |
| Server restart | Graceful shutdown waits for games. On a crash: the game is cancelled with no rating effect, and clients are told |
| The eligible item pool is smaller than the number of rounds | A room cannot be created in that configuration; the track is marked unavailable |
| A user on two devices | The new connection takes the game; the old one gets "you continued on another device" |
| A rematch when one player is already in another queue | **[VERIFIED]** Not checked today. In the new engine every entry into a game passes the "one active game" check |
| A draw in a rated game | A draw result in Glicko-2; both players get participation XP |
| A room-code collision | The code is generated on the server and checked against active rooms |

### 17.5 Security and privacy

- **Minimum information:** a public profile holds no email, exact registration date or internal id.
- **Minors [ASSUMPTION]:** the audience includes students, but users under 18 are possible. A minimum age must be set and the relevant legal requirements checked before the social layer launches. See Q4.
- **User-generated content:** username, bio and avatar only. No chat. **[VERIFIED]** There is no filtering or moderation of avatars today.
- **GitHub:** disconnecting deletes all stored GitHub data.
- **AI:** the user's code is sent to the model provider. This must be stated in the privacy policy, and no personal identifiers are sent.
- **Logs:** **[VERIFIED]** logs redact emails, passwords and answers. Extend to room codes and push tokens.
- **Repository language rule:** a pre-commit check rejects any staged file containing Hebrew characters outside the Hebrew UI locale file, and rejects a Hebrew branch name. User-entered Hebrew lives only in the database.

---

## 18. Feature Prioritization

### 18.1 Ranking the ideas from the brief

A score of 1–5 per dimension; for complexity and upkeep, 5 means cheap.

| Idea | Learning value | Effect on experience | Complexity | Upkeep and cost | Total | Decision |
|---|---|---|---|---|---|---|
| Revision Mode | 5 | 3 | 5 | 5 | 18 | **Yes** — cheap and a strong fit for students |
| Code Execution Visualization | 5 | 5 | 3 | 4 | 17 | **Yes — core** |
| Skill Tree (skill map) | 4 | 5 | 4 | 4 | 17 | **Yes — core** |
| Spaced Repetition | 5 | 3 | 4 | 5 | 17 | **Yes — core** |
| Learning Analytics (strengths and weaknesses) | 4 | 3 | 5 | 5 | 17 | **Yes** — derived from attempt data |
| Daily Challenges | 3 | 4 | 5 | 4 | 16 | **Yes** |
| Achievements & Badges | 2 | 4 | 4 | 5 | 15 | **Yes**, limited |
| Adaptive Learning | 4 | 4 | 3 | 4 | 15 | **Yes, light version:** review by mastery, and jump tests. Not a full adaptation engine |
| Personalized Learning Path | 3 | 3 | 3 | 4 | 13 | **Merged** into the row above; no separate path per user |
| Weekly League | 2 | 4 | 3 | 3 | 12 | **Yes**, after the XP fix |
| AI Tutor | 3 | 3 | 3 | 2 | 11 | **Yes, limited** (section 15.9) |
| Weekly Tournaments | 1 | 3 | 2 | 2 | 8 | **[REJECTED]** — the league covers it |
| Study Groups | 2 | 2 | 2 | 2 | 8 | **[REJECTED]** — rooms and friends cover it |

### 18.2 What is rejected and why — summary

| Idea | Reason |
|---|---|
| Real-time 3D mascot | Research favours 2D; performance and production cost |
| Hearts or energy | Documented user resistance; contradicts "real learning" |
| A timer in lessons | No research basis for novices |
| Free chat | Heavy moderation load with no learning value |
| Guests in private rooms | An anonymous user cannot be blocked or reported |
| Access to GitHub repositories | No need; harms trust |
| Tournaments; Study Groups | Covered by the league and rooms |
| Running code on the device for scoring | An untrustworthy result |
| Light mode | Not at this stage; the tokens are ready for it |

### 18.3 What sets Platyko apart

1. **A visual execution player** on every item, including the Event Loop.
2. **An explanation for every distractor**, not "wrong".
3. **Live multiplayer on real code** — no competitor examined combines this with a mobile learning path.
4. **A mascot whose behaviours are unique to the animal** and cannot be copied.
5. **A bank proven by execution**, verified to a zero-defect standard, with a reference for every question.
6. **Hebrew and English** with correct handling of code inside a right-to-left interface.

---

## 19. Implementation Roadmap

**Rule R1:** everything is in scope; nothing is deferred to a future version. The phases are a **dependency order**: each phase rests on the ones before it. Phases 1 and 2 run in parallel.

**Critical note:** the specification is complete. The build is large — rewriting the game engine, migrating data, drawing and animating the mascot, writing and verifying about 600 items, and making every screen work in two directions. The verification loop in section 8 has no fixed length: it ends only when its exit condition holds, and each fix restarts the count of clean passes.

### Phase 0 — Foundations and trust

| | |
|---|---|
| **What is built** | Unified `Item` model and migration; `ItemAttempt`; user-level XP and streak with the new curve; the verification pipeline (pre-check and Gate A in CI) and the originality check; CI; the bug fixes from section 2 (accuracy, progress loss on login, solo wins, XP loopholes); design tokens and fonts; the localisation foundation (locale files, direction-aware layout) |
| **Why it matters** | Every other phase rests on the content model, trustworthy XP and the string infrastructure |
| **Infrastructure** | Prisma migrations; the existing sandbox; a CI service |
| **Complexity** | High — data migration |
| **Risks** | Losing user data in migration; breaking the existing client |
| **Success conditions** | All 121 existing items pass the pre-check and Gate A; no user loses progress; `typecheck`, `lint`, `test`, `knip` are green; the pre-commit language check is active |

### Phase 1 — The learning core

| | |
|---|---|
| **What is built** | The lesson player and the seven formats; the feedback sheet and hints; the code view and code keyboard; the execution player; the skill map; the new Home; the new onboarding with the language switch; the mascot (states `idle`, `wave`, `cheer`, `comfort`, `sense`, `glow`, `think`, `hide`, `sleep`); every screen in English and Hebrew |
| **Why it matters** | This is the change the user feels; here the product becomes "completely different" |
| **Infrastructure** | `react-native-svg`; a lexer; phase 0 |
| **Complexity** | High |
| **Risks** | Mascot visual quality and frame rate; smooth dragging on weak devices; mixed-direction layouts |
| **Success conditions** | A new user completes a first item within 30 seconds of opening; 60fps on the reference device; all formats are usable with a screen reader; every screen passes a right-to-left review |

### Phase 2 — Building the bank (parallel to phase 1)

| | |
|---|---|
| **What is built** | 604 items in 28 units; migration of the existing content; rewrite of block 7; the full verification loop |
| **Why it matters** | An excellent interface with a weak bank is a weak product |
| **Infrastructure** | The pipeline from phase 0 |
| **Complexity** | High — and open-ended, because the loop ends on a condition, not a date |
| **Risks** | Correlated blind spots in gates C and D (section 8.7); many loop iterations |
| **Success conditions** | The exit condition in section 8.5 holds; at least 200 items are duel-eligible; every item has a `PASS` originality record |

### Phase 3 — The retention layer

| | |
|---|---|
| **What is built** | Review and SM-2; daily challenge; revision; weekly goal; streak freeze; push and smart reminders; achievements; strengths and weaknesses; report and vote on items |
| **Why it matters** | Turns one-off use into a habit, and activates the post-launch safety net for content |
| **Infrastructure** | Phases 0–2; a push service |
| **Complexity** | Medium |
| **Risks** | Too many notifications |
| **Success conditions** | An item answered wrongly returns within 3 days; a reminder is not sent to someone who met the goal |

### Phase 4 — Social foundation

| | |
|---|---|
| **What is built** | Public profile and privacy; search; friendship; block and report; username filtering; presence; invitations inbox; `AuthIdentity` and GitHub; README badge; Friend Streak; the open App Store items |
| **Why it matters** | A precondition for every social game mode |
| **Infrastructure** | Push from phase 3; the `/play` namespace |
| **Complexity** | High |
| **Risks** | Leaking private information; App Store rejection without report and block |
| **Success conditions** | Automated tests prove that a blocked or private user is not exposed on any route |

### Phase 5 — Multiplayer

| | |
|---|---|
| **What is built** | The `realtime-contract` package; the N-player engine with tests; new scoring; Glicko-2 and rating-based matching; ghost opponent; Friends Duel; rooms, lobby, codes and links; reconnect; match history; the mascot states `dive`, `victory`, `defeat` |
| **Why it matters** | The product's main differentiation |
| **Infrastructure** | Phases 2 and 4; a verified domain for links |
| **Complexity** | Very high — a rewrite of `io` |
| **Risks** | No existing tests for `io`; race conditions; scoring fairness on a slow network |
| **Success conditions** | The test suite covers scoring, ties, disconnect and leaving; 4 players complete a game with one of them disconnecting and reconnecting |

### Phase 6 — Depth

| | |
|---|---|
| **What is built** | Weekly league; the three extra game modes; "explain my mistake"; share cards; automated item analysis |
| **Why it matters** | Deepens engagement once the core is stable |
| **Infrastructure** | All earlier phases; a language-model provider |
| **Complexity** | Medium |
| **Risks** | AI cost; league pressure |
| **Success conditions** | An AI explanation does not contain the reference solution in an automated check; the league can be turned off |

### 19.1 A realistic MVP **[REQUIRED]**

If a first release is needed before everything is complete, the right stopping point is **the end of phase 2**:

- **Includes:** phases 0, 1, 2 — entirely new learning, a verified bank, a new design, two languages and a living mascot — beside the existing duel, which benefits at once from the large bank through `duelEligible`.
- **Why there:** it is the first point where the user gets a whole and completely different product, and it does not depend on rewriting `io`.
- **What it lacks:** the social layer and the new game modes.

This is a recommendation for the case of need only. Under rule R1 the full scope is phases 0–6.

---

## 20. Acceptance Criteria

### 20.1 Learning

- [ ] **L1:** each of the seven formats is displayed, answered and checked correctly, including with a screen reader.
- [ ] **L2:** given a first wrong answer, the explanation of the chosen distractor is shown and the correct answer is **not** revealed.
- [ ] **L2:** given a second wrong answer, the correct answer and full explanation are shown and the item enters Review.
- [ ] **L2:** three hints are available on every item; using a hint does not reduce XP.
- [ ] **L3:** at every step the execution player shows the line, the variable values and the output, matching a real execution of the snippet exactly.
- [ ] **L4:** every lesson on the map shows one of the five states, and the state updates at once when a lesson ends.
- [ ] **L4:** "continue" on Home opens the next uncompleted item, with no screen in between.
- [ ] **L5:** no snippet in the bank needs horizontal scrolling on a screen 360 points wide.
- [ ] **L6:** lesson accuracy equals items answered correctly on the first attempt divided by total items. A lesson with one mistake does not show 100%.
- [ ] **L7:** an item answered wrongly appears in Review within 3 days, as a different item on the same concept when one exists.
- [ ] **No timer** on any lesson or review screen.

### 20.2 Content verification and originality

- [ ] An item whose actual output differs from the stated answer fails Gate A and is not loaded as `LIVE`.
- [ ] An item with zero or more than one correct option fails Gate A.
- [ ] A distractor equal to the real output fails Gate A.
- [ ] Every `PARSONS` item has had every ordering executed.
- [ ] Every `trace` in the bank was generated by execution.
- [ ] Gate B's solver receives no stated answer, correct flag or explanation.
- [ ] Gate C's reviewer receives no authoring reasoning and no solver output.
- [ ] A fix to any item is followed by a run of **all** gates over the **entire** bank.
- [ ] The final run is the third consecutive full pass with zero findings.
- [ ] The run logs are committed under `content/verification/runs/`.
- [ ] The seed refuses to mark items `LIVE` when the bank content hash differs from the latest clean run.
- [ ] Every `LIVE` item has `provenance` with an author, a `PASS` originality result, a verification run id and a reference link that returns 200.
- [ ] No source text is committed to the repository; the ledger holds URLs and hashes only.
- [ ] No snippet contains a construct banned in section 7.3.
- [ ] Three reports from different users within 7 days take an item out of lessons and the duel pool with no manual action.
- [ ] At least 600 items are `LIVE`, and at least 200 of them are `duelEligible`.

### 20.3 Language and direction

- [ ] Every UI string comes from the locale files; no string is written in a component.
- [ ] The English and Hebrew files hold exactly the same keys; a missing key fails the build.
- [ ] The language can be changed in settings by guests and by registered users, and the choice survives a restart.
- [ ] In Hebrew every screen is mirrored, and text is aligned to the right.
- [ ] In Hebrew every code block, the execution player, Parsons lines, token chips and code input are left-to-right and left-aligned.
- [ ] Numbers, timers, scores, room codes and usernames read left-to-right in Hebrew.
- [ ] A Hebrew sentence with an inline code term shows its punctuation in the right place.
- [ ] A registered user receives push notifications in their chosen language.
- [ ] The repository contains no Hebrew character outside the Hebrew UI locale file, and the pre-commit check rejects a commit that adds one.

### 20.4 Users and permissions

- [ ] A guest completes a lesson, a review and a daily challenge with no blocking registration request.
- [ ] A guest who registers or logs in **by any method** keeps every item they completed.
- [ ] A guest's XP is computed on the server from the item list; an XP number sent by the client is not accepted.
- [ ] A guest who opens a room link reaches the lobby after registering, without typing the code again.

### 20.5 Social

- [ ] A 3-character search returns up to 20 results and never returns users who turned off search or blocked the searcher.
- [ ] A blocked user cannot view the profile, send a request or invitation, and is not matched against the blocker.
- [ ] A "friends only" profile returns only username and avatar to a non-friend.
- [ ] Email appears in no API response about another user.
- [ ] A game invitation reaches an online recipient within 2 seconds, and an offline recipient as a push notification.
- [ ] Deleting an account removes the user from every friends list, and other users' past games are kept.

### 20.6 Multiplayer

- [ ] **M1:** after 5 placement games, opponents are matched within a rating range that starts at 100 and widens by 50 every 5 seconds.
- [ ] **M3:** 2 to 4 players join a room by code or link, and a game starts only when all are marked Ready.
- [ ] **M3:** the countdown ends on all players' devices within 300ms of each other.
- [ ] **M4:** the score shown to each player after a round equals the formula applied to the server-measured time.
- [ ] **M4:** two players with the same score are ranked by the tie-breakers in the defined order.
- [ ] **M5:** a player who disconnects and returns within 20 seconds continues the same game with the right score, round and time.
- [ ] **M5:** in a room of 4, one player leaving does not end the game for the other three.
- [ ] **M6:** a game against a ghost opponent is labelled practice, does not change the rating and is not counted in wins.
- [ ] The correct answer appears in no payload sent to a client before the round ends.
- [ ] A player does not get an item seen in their last 20 games, while the pool allows.
- [ ] Historical solo games are not counted in the win statistic.

### 20.7 Design and mascot

- [ ] No screen uses a colour or font not defined in the tokens.
- [ ] Every text and background pair meets a 4.5:1 contrast ratio.
- [ ] With Reduce Motion on, there is no animation beyond a fade, and the mascot is static.
- [ ] The mascot **is not shown** while an item is being solved, in the execution player or during an active game round.
- [ ] Each of the 12 mascot states is triggered by the trigger defined for it.
- [ ] The mascot is built from vector shapes and code only; the only dependency added for it is `react-native-svg`.
- [ ] The mascot component's interface is the 12 state names and the two inputs, and nothing else.
- [ ] 60fps on the reference device with the mascot animating, on the skill map, in Parsons dragging and on the leaderboard.

### 20.8 Profile and GitHub

- [ ] The permission request to GitHub includes `read:user` and `user:email` only.
- [ ] GitHub's `client_secret` is not in the app bundle.
- [ ] Disconnecting GitHub deletes all of the user's GitHub data.
- [ ] The README badge returns 404 for a user who has not turned it on.

### 20.9 Product success measures

Numeric targets are not set here, because there is no baseline: production is not deployed and there is no analytics system (**[VERIFIED]**). **[RECOMMENDATION]** Measure from day one and set targets after 4 weeks of data.

| Measure | Type |
|---|---|
| Current-user retention rate (CURR) | Leading — the metric that drove Duolingo's growth (S1) |
| First-lesson completion rate | Leading |
| Day 1, 7, 14 retention | Leading |
| Correct-on-second-attempt rate after an explanation | Leading — measures feedback quality |
| Share of users with a 7-day streak | Lagging |
| Games per registered user per week | Lagging |
| Guest-to-registered conversion rate | Lagging |
| Reports per 1,000 answers | Content quality |
| Share of sessions in each language | Adoption of the Hebrew interface |

---

## 21. Open Questions & Decisions

Resolved on 14 November 2026 and removed from this list: interface language (D1), app and mascot name (D2), who makes the mascot (D3), who writes and verifies the bank (D4).

| # | Question | Who decides | Blocking? |
|---|---|---|---|
| Q1 | Legal sign-off on the originality and licensing position in section 9. | Legal | Blocks commercial launch |
| Q2 | SM-2 or FSRS? FSRS needs an upgrade to Node 24. Recommendation: SM-2. | Engineering | No |
| Q3 | Syntax-highlighting lexer: an existing library or a small in-house one for JavaScript? | Engineering | No |
| Q4 | Minimum age and legal requirements for young users in the social layer. | Legal | Blocks phase 4 |
| Q5 | Who handles the report queue, and with what response time? | Product owner | Blocks phase 4 |
| Q6 | Provider, model and monthly budget for "explain my mistake". | Product owner | Blocks part of phase 6 |
| Q7 | The reference device for performance tests. | Engineering | Blocks acceptance criteria |
| Q8 | Business model: free, subscription or a mix? Affects AI quotas and any future limit. | Product owner | No |
| Q9 | Keep Code Puzzle as a separate screen? Recommendation: fold it in as the `CODE_WRITE` format. | Product owner | Blocks phase 1 navigation |
| Q10 | Should question content ever be offered in Hebrew? Rule R2 allows Hebrew only in UI string files, so questions are English only. Changing that would mean widening the exception to translated content files and verifying every translation through the gates. | Product owner | No — the current answer is English only |
| Q11 | A human spot-check of a 5% sample and a learner pilot per unit before launch. Recommended, because they are the only checks that do not share the agents' blind spots; not part of the exit condition. | Product owner | No |
| Q12 | Calibration values: grace period, XP caps, report thresholds, latency compensation, similarity thresholds. Starting values are proposed; real-world testing is needed. | Engineering and product | No |
| Q13 | Where translated strings used by the server live (push text), and where the Hebrew banned-word list lives. Recommendation: one shared locale package used by the app and the server, with the word list stored as data outside the repository. | Product owner | Blocks phase 3 push and phase 4 filtering |
| Q14 | Confirm ownership of the `platyko.com` domain for invite links and the README badge. | Product owner | Blocks invite links |

---

## 22. Research Sources

Accessed on 14 November 2026. "Snippet" means the information came from a search-result summary and not from reading the page, so its reliability is lower.

**Mobile learning products**

1. Jorge Mazal, "How Duolingo reignited user growth", Lenny's Newsletter, 2023 — https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth
2. Duolingo Blog, "Improving the streak", 2020 — https://blog.duolingo.com/improving-the-streak
3. Lenny's Newsletter, "Duolingo streaks", 2024 — https://www.lennysnewsletter.com/p/duolingo-streaks
4. Duolingo Blog, "Product lessons: Friend Streak", 2024 — https://blog.duolingo.com/product-lessons-friend-streak/
5. Duolingo Blog, "How Duolingo streak builds habit" — https://blog.duolingo.com/how-duolingo-streak-builds-habit
6. PiunikaWeb, user reaction to the path UI, 2022 — https://piunikaweb.com/2022/12/16/duolingo-app-update-with-path-ui-faces-backlash-from-users/
7. Android Authority, the Energy system and reader poll, 2025 — https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/
8. PYMNTS, Duolingo earnings report, 2026 — https://www.pymnts.com/earnings/2026/duolingo-bets-on-user-growth-to-outpace-ai-disruption/
9. Brilliant Help, "Leagues FAQ" — https://brilliant.org/help-redirect/en/articles/6399120-leagues-faq
10. Rive Blog, Brilliant's character Koji, 2026 — https://framer.rive.app/blog/brilliant-builds-its-math-and-coding-tutor-character-with-rive
11. Mimo, App Store — https://apps.apple.com/us/app/mimo-learn-coding-programming/id1133960732
12. Sololearn, App Store — https://apps.apple.com/us/app/sololearn-learn-to-code/id1210079064
13. Sololearn Discuss, streak lost on repeating a lesson — https://ai.sololearn.com/pl/Discuss/3326014/lost-my-streak-even-though-i-repeated-and-completed-a-lesson

**Coding challenges and multiplayer**

14. LeetCode Discuss, contest rating algorithm (snippet) — https://leetcode.com/discuss/general-discussion/468851/New-Contest-Rating-Algorithm-It's-HERE!/
15. LeetCode Support, "Time Travel Tickets" (snippet) — https://support.leetcode.com/hc/en-us/articles/14677342930835-What-Are-Time-Travel-Tickets
16. Codewars Docs, Ranks — https://docs.codewars.com/gamification/ranks
17. Codewars Docs, Honor — https://docs.codewars.com/gamification/honor
18. Codewars Docs, approval and retirement criteria — https://docs.codewars.com/curation/references/approval-retirement-criteria/
19. Codewars Docs, Kata curation — https://docs.codewars.com/curation/kata
20. Exercism Docs, Concept exercises — https://exercism.org/docs/building/tracks/concept-exercises
21. Exercism JavaScript, LICENSE (MIT) — https://raw.githubusercontent.com/exercism/javascript/main/LICENSE
22. CodeCombat Blog, "Introducing competitive multiplayer programming", 2014 — https://blog.codecombat.com/introducing-competitive-multiplayer-programming
23. Kahoot, the scoring formula. Read from a copy of the official 2023 article — https://z3n-irynaparahailo.zendesk.com/hc/en-us/articles/15168229444113 ; the official page blocked access — https://support.kahoot.com/hc/articles/115002303908
24. Kahoot Support, joining a game (snippet) — https://support.kahoot.com/hc/en-us/articles/360039890713-Kahoot-join-How-to-join-a-Kahoot-game
25. CodinGame Forum, Clash of Code types (snippet) — https://forum.codingame.com/t/clash-of-codes-types/1115
26. GamesBeat, QuizUp (snippet) — https://gamesbeat.com/plain-vanillas-quizup-for-iphone-will-be-the-biggest-trivia-game-in-the-world/
59. Mark Glickman, "Example of the Glicko-2 system" — https://www.glicko.net/glicko/glicko2.pdf ; public-domain status per https://en.wikipedia.org/wiki/Glicko_rating_system
60. Microsoft Research, TrueSkill — https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/
64. Gabriel Gambetta, "Client-Server Game Architecture" — https://www.gabrielgambetta.com/client-server-game-architecture.html
65. FACEIT Support, leaver policy (snippet) — https://support.faceit.com/hc/en-us/articles/20413035342108-AFK-Leaver-noShow-Bans-Elo-FAQ
98. dev.to, Clash of Code — https://dev.to/thelegendski/codingame-clash-of-code-hmb

**Pedagogy and learning science**

27. Lister et al., 2004 — https://www.cs.auckland.ac.nz/~j-hamer/ITiCSE04-wg.pdf
28. Lopez et al., 2008 — https://opus.lib.uts.edu.au/handle/10453/10806
29. Sentance et al., PRIMM, 2019 — https://eprints.gla.ac.uk/229013
30. Van der Kleij et al., elaborated feedback, 2015 — https://scinapse.io/papers/2110661236
31. CS1 concept inventory — https://www.springerprofessional.de/doi/10.1145/2839509.2844559
32. Parsons problems review, 2022 — https://aaltodoc.aalto.fi/items/a77c8afa-0f57-4ef6-85d2-4f982776677c
33. Harms et al., distractors in Parsons problems, 2016 — https://profiles.wustl.edu/en/publications/distractors-in-parsons-problems-decrease-learning-efficiency-for-/
34. Dunlosky, learning techniques, 2013 — https://www.aft.org/ae/fall2013/dunlosky
35. Retrieval and spacing in programming courses, NSF PAR — https://par.nsf.gov/servlets/purl/10544324
36. Washington State University, seductive details, 2020 (snippet) — https://news.wsu.edu/press-release/2020/03/19/seductive-details-inhibit-learning
37. Frontiers in Education, time pressure, 2025 — https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1567709/pdf
38. Rodriguez, 2005, optimal number of options — cited through a secondary source; not verified directly and no link.
39. Loupe (no license) — https://github.com/latentflip/loupe
40. SM-2 — https://super-memory.com/english/ol/sm2.htm
41. ts-fsrs — https://github.com/open-spaced-repetition/ts-fsrs
56. Doughty et al., multiple-choice questions from GPT-4, 2024 — https://arxiv.org/abs/2312.03173v1
57. University of Warwick, AI and human questions compared — https://warwick.ac.uk/fac/cross_fac/eduport/edufund/projects/yang/projects/a-comparative-study-of-ai-generated-gpt-4-and-human-crafted-mcqs-in-programming-education/
58. BMC Medical Education, item analysis, 2024 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11040895/
85. Bastani et al., PNAS, 2025 (snippet) — https://papers.ssrn.com/abstract=4895486
86. CS50 Duck (snippet) — https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf
88. Sailer & Homner, gamification meta-analysis, 2020 — https://link.springer.com/article/10.1007/s10648-019-09498-w
95. Python Tutor, JavaScript — https://pythontutor.com/javascript.html
96. Margulieux and Morrison, subgoal labels, 2020 — https://doaj.org/article/9a2c85d66fd54ec9ab019e9a510bbf17
99. Survey of programming on touch devices, including TouchDevelop — https://arxiv.org/abs/1708.05805

**Curricula and licensing**

42. U.S. Copyright Office, FAQ — https://www.copyright.gov/help/faq/faq-protect.html
43. MDN, attribution and licensing — https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license
44. MDN Curriculum — https://developer.mozilla.org/en-US/curriculum/
45. ECMA-262, copyright notice — https://tc39.es/ecma262/#sec-copyright-and-software-license
46. MIT 6.102 — https://web.mit.edu/6.102/www/sp26/
47. javascript.info, license — https://github.com/javascript-tutorial/en.javascript.info/blob/master/LICENSE.md
48. Eloquent JavaScript — https://eloquentjavascript.net/
49. The Odin Project, license — https://github.com/TheOdinProject/curriculum/blob/main/license.md
50. freeCodeCamp, README — https://github.com/freeCodeCamp/freeCodeCamp/blob/main/README.md
51. Harvard CS50x — https://cs50.harvard.edu/x/ ; license — https://cs50.harvard.edu/x/license/
52. CS50 Web — https://cs50.harvard.edu/web/
53. Full Stack Open — https://fullstackopen.com/en/about
54. Stanford CS193X — https://web.stanford.edu/class/cs193x/
55. You Don't Know JS Yet — https://github.com/getify/You-Dont-Know-JS

**Mascot and animation**

66. Meta-analysis of pedagogical agents, 2021 (snippet) — https://doi.org/10.1007/s10648-020-09587-1
67. Lester et al., the persona effect, 1997 (snippet) — https://chi1997.acm.org/proceedings/paper/jl.html
68. Duolingo Blog, World character visemes, 2022 — https://blog.duolingo.com/world-character-visemes/
69. Rive Blog, Duolingo's character Lily — https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life
70. Australian Museum, Platypus — https://australian.museum/learn/animals/mammals/platypus/
71. Anich et al., biofluorescence in the platypus, 2020 (snippet) — https://doi.org/10.1515/mammalia-2020-0027
72. Rive Docs, React Native runtime — https://rive.app/docs/runtimes/react-native/react-native
73. Rive Docs, Expo (snippet) — https://rive.app/docs/runtimes/react-native/adding-rive-to-expo
74. Reanimated Docs, Accessibility — https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
75. React Native Docs, AccessibilityInfo — https://reactnative.dev/docs/accessibilityinfo
89. Duolingo Blog, streak milestone animation — https://blog.duolingo.com/streak-milestone-design-animation
90. React Native Skia, bundle size (snippet) — https://shopify.github.io/react-native-skia/docs/getting-started/bundle-size ; Expo Docs, Skia — https://docs.expo.dev/versions/latest/sdk/skia/
93. Duolingo Blog, the new home screen, 2022 — https://blog.duolingo.com/new-duolingo-home-screen-design/
94. Rive Blog, creative technologists at Duolingo, 2024 — https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff
97. Rive Blog, animations at Brilliant, 2024 — https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations

**Technology**

61. Socket.IO Docs, Connection state recovery — https://socket.io/docs/v4/connection-state-recovery
62. Socket.IO Docs, Redis Streams adapter — https://socket.io/docs/v4/redis-streams-adapter/
63. Socket.IO Docs, Using multiple nodes — https://socket.io/docs/v4/using-multiple-nodes/
76. GitHub Docs, Scopes for OAuth apps — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
77. GitHub Docs, Authorizing OAuth apps — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
78. GitHub Changelog, August 2026 — https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps
79. GitHub Docs, Rate limits — https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
80. Apple, App Review Guidelines — https://developer.apple.com/app-store/review/guidelines/
81. Expo Docs, Notifications — https://docs.expo.dev/versions/latest/sdk/notifications/
82. Expo Docs, Linking — https://docs.expo.dev/linking/overview/
83. isolated-vm — https://github.com/laverdet/isolated-vm
84. quickjs-emscripten — https://github.com/justjake/quickjs-emscripten
87. Claude Docs, Prompt caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
91. Expo Docs, Authentication — https://docs.expo.dev/guides/authentication/
92. GitHub Docs, GitHub Apps versus OAuth Apps — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps

**Research limits**

- The official pages of Kahoot, LeetCode, CodinGame and the Mimo help centre blocked access; details about them rest on snippets or copies.
- The code-input widgets of Mimo and Sololearn were not verified from a primary source.
- Most academic findings came from summaries, not full texts.
- Not found: a controlled study of a mascot's effect on retention; a study of JavaScript-specific misconceptions; a study of chip input against a keyboard; an industry standard for reconnect windows; capacity figures for a single Socket.IO instance.
- Not verified: Rubik's Hebrew glyph coverage and license; the frame rate of an SVG character animated through Reanimated; whether a language switch needs an app restart on both platforms.

You are the author of ONE unit of the Platyko JavaScript question bank, in the monorepo at /Users/idoyahav/Desktop/git/Platyko (branch redesign/full-implementation). Other agents are authoring other units at the same time; you create and edit exactly one file and nothing else.

## Your unit
- Track: {{TRACK}}   Unit slug: {{UNIT}}   Order in track: {{ORDER}}   Title: {{TITLE}}
- File to create: `content/units/{{FOLDER}}/{{ORDER2}}-{{UNIT}}.json`
- Items to write: {{ITEM_COUNT}} ({{PER_LESSON}} new items in each of 4 lessons)
- `author` value for every item: "claude-fable-5-2/unit-author"; `version`: 1

## Read first (in this order)
1. `content/README.md` — the complete authoring rules: layout, item rules per format, lesson recipes for your track, feedback and hint rules, the execution model and canonical console output, what is banned in snippets, originality rules. Follow it exactly; it is the contract.
2. `packages/content-model/src/item.ts`, `unit.ts` — the exact JSON shape (`UnitFile`, `AuthoredItem`, `ConceptCard`). `code` is an array of lines.
3. `content/concept-catalog.json` — find your unit: its four concepts (id, title, prerequisites) are fixed. Declare exactly these in the unit file, one lesson per concept in catalog order. An item's `concept` is its lesson's concept; `prerequisites` may list only concepts that appear EARLIER in the catalog (earlier units, or earlier concepts of your unit).
4. `tools/content/src/fixtures/content/units/beginner/09-fixture-unit.json` — a small valid unit showing every format. Copy the shape, never the content.
5. `content/constructs.json` — language construct → unit that teaches it. Your snippets may use only constructs whose unit is yours or earlier in the curriculum (`tools/content/src/bank/curriculum.ts` has the order). The verify command reports violations as "Gate D construct scan" findings; fix them by simplifying the snippet.
6. PRODUCT_REDESIGN_PRD.md sections 6.1–6.5 (pedagogy: predict before write, one misconception per distractor, elaborated feedback) — search for "### 6.1".

## Unit specification you must produce inside the file
- `title`, `summary` (one sentence), `concepts` (from the catalog, verbatim).
- `misconceptions`: 6 to 10 real misconceptions learners have about this unit's concepts, each `{ id: "<kebab-case>", description }`. Every wrong option of a PREDICT_OUTPUT, TRACE and CONCEPT_MCQ item names the misconception it encodes; write distractors FROM misconceptions (what would a learner who believes X answer?), never random wrong values.
- `sources`: the pages you consulted for topic coverage (MDN, ECMA-262), each `{ url, retrievedAt: "2026-11-14", sha256: "" }` — leave `sha256` empty; a later step fills it. Consult sources for coverage and ordering ONLY. Never take wording or code from any source or from any question you remember: invent every snippet — your own identifiers, values and program shape. Use varied, concrete, everyday domains for names and data (a bakery's orders, a hiking log, a library, a bus timetable, a plant shop…), and do not reuse the same domain in more than two items.
- `lessons`: 4, ids `{{UNIT}}.lesson-1` … `-4`, each with a `conceptCard` (title, body ≤ 60 words that teaches the concept in plain words, a worked example of 3–8 lines, and its exact output) and `itemIds` in recipe order.
- `reference` on every item: the most specific MDN page (en-US URL) or ECMA-262 section for that item's concept; vary them where a more specific page exists.

## Legacy items to convert into this unit
{{LEGACY_BLOCK}}
For each legacy key listed: read the legacy item at its `source` file, then write a NEW item on the same concept in the new format (restyled to all the rules here: three options, per-option feedback, hints, invented snippet — do not keep its wording or code), and set `"legacyKeys": ["<key>"]` on that item so learners' progress carries over. A legacy item marked `rewrite` is replaced by a code-based item on the same idea. Converted items count toward your {{ITEM_COUNT}} and take a recipe slot of a fitting lesson. If a listed legacy item truly does not belong to any of your four concepts, attach its key to the closest item anyway and tell me in the report.

## Quality bar for items
- Each item tests ONE idea, anchored in code. No trick wording, no ambiguity: exactly one defensible answer.
- Snippets are small and realistic: ≤ 12 lines, ≤ 36 characters per line, 2-space indentation. Loops run a handful of iterations (a trace may not exceed 60 steps).
- Beginner-track prose assumes week-one learners: short sentences, no jargon that has not been taught.
- TRACE items: choose a probe that requires following the execution (a loop variable mid-way, a value before it is overwritten), not the final answer.
- PARSONS: at most 8 lines, no distractor lines; prefer programs with ONE valid order. If execution shows another order also works, record it in `acceptedOrders` or restructure the program.
- FILL_BLANK: 1–3 blanks, 3–6 chips; every chip that is not accepted must make the program print something else or fail.
- FIX_BUG: the bug is a real mistake a learner makes about this concept; both distractor fixes must still produce a wrong result.
- CODE_WRITE: `entry` is an expression over named variables (Beginner) or a short function body; ≥ 3 tests including an edge case; 3 wrong solutions that are typical learner mistakes, each failing at least one test. Never requires I/O.
- `duelEligible: true` (with `timeLimitSec` 15–45, longer for longer code) on PREDICT_OUTPUT, PARSONS, FILL_BLANK, FIX_BUG and CONCEPT_MCQ items whose code is at most 8 lines and that can be answered without the lesson's context; otherwise false.
- Difficulty per README; `prompt` ≤ 30 words; explanation ≤ 60 words; option feedback ≤ 45 words.

## Verify until clean — this is mandatory
Run from the repository root (it executes every snippet, every Parsons ordering, every chip placement, the sandbox for CODE_WRITE, and the structural, banned-construct, duplicate and construct-level checks):
```
npm --prefix tools/content run verify -- --unit {{UNIT}} --offline
```
Fix and re-run until it prints "clean" for Pre-check, Gate D construct scan and Gate A — EXCEPT one expected Gate A finding, `trace-file-stale` for your unit (trace files are written later by the orchestrator), and pre-check findings that are only about OTHER units or about prerequisites declared in units that do not exist yet (check: `prerequisite … not declared` for a concept that IS in the catalog before your unit is acceptable). Never change a stated answer just to make the gate pass without understanding why the code behaves that way: the execution is the truth, so correct the item's answer, feedback and explanation together.
Then run it once without `--offline` to check your reference links return 200 (fix broken URLs; `source-unreachable`/ledger-hash findings for your `sources` with empty hashes are expected and fine).
Finally re-read every item once as a learner: is the prompt unambiguous, does each feedback explain that specific mistake without revealing the answer, do the hints rise in strength without stating the answer?

## Rules of the repository
English only. Do not run git commands that change state. Do not edit any file other than your unit file. Do not create other files (use the scratch directory {{SCRATCH_DIRECTORY}} if you need a temporary script).

## Final report (under 15 lines)
Item count per format, number of duel-eligible items, the final verify output summary (finding counts per section, listing any remaining finding verbatim), legacy keys converted, and anything in README/catalog/constructs that blocked a good item (so the rules can be improved).

You are the blind solver (Gate B) of the Platyko JavaScript question bank verification, in the monorepo at /Users/idoyahav/Desktop/git/Platyko. You solve every question of ONE unit as a learner would, without being told any answer, and you report what you derived. You work alone and you are not shown how the questions were written.

## Your unit
- Unit: {{UNIT}}
- Read: `{{INPUT_FILE}}`
- Write: `{{OUTPUT_FILE}}` (create it; it is the only file you may create or change)

## Strict rules
- Derive every answer by tracing the code BY HAND, line by line, in your head or in your own reasoning. You may NOT execute code of any kind: no node, no shell snippets, no REPL, no script, no test run.
- You may open exactly two files: your input file and `content/README.md` (the "Execution model" section: how values are printed and formatted). Open nothing else in the repository, search nothing, and never look for the unit file, the answers, the traces, other gate outputs or any earlier run. If you have seen one of these questions before, ignore that memory and derive the answer anyway.
- Do not guess. If a question is ambiguous or you find two defensible answers, pick the one you would defend, and still write it down; the comparison afterwards will show the problem. Never skip an item.

## The input file
`items` holds one entry per item. Fields you may find: `id`, `format`, `variant`, `prompt`, `code` (the lines you see: for `FIX_BUG` the buggy code, for `PARSONS` the lines in their shuffled display order, for `FILL_BLANK` the code with `___` for each blank), `dom` (a drawn DOM tree the code runs against), `options` (option texts, in a shuffled order), `probe` (`TRACE`: the variable, the line after which to look, and which visit of that line), `shuffledOutput` (`PARSONS` with `variant` `ORDER_OUTPUT`: the printed lines in a shuffled order), `entry` and `testInputs` (`CODE_WRITE`: what you must write, and the inputs your code will be tried with), `context` (code that comes before your code, if any).

## What to write for each item
For every item write an entry in `solutions`, with the answer in the shape of its format:

| Item | `answer` |
|---|---|
| `PREDICT_OUTPUT`, `TRACE`, `CONCEPT_MCQ` | `{ "optionText": "<the exact text of the option you choose>" }` |
| `PARSONS` | `{ "lines": [...] }`: the program, the given lines in the order they must run (copy each line exactly; a repeated line appears as often as it is given) |
| `PARSONS` with `variant` `ORDER_OUTPUT` | `{ "lines": [...] }`: the lines the program prints, in the order they are printed |
| `FILL_BLANK` | `{ "blanks": [...] }`: the text that goes into each `___`, in reading order |
| `FIX_BUG` | `{ "bugLine": <1-based line number of the bug>, "fixText": "<the exact text of the option that repairs it>" }` |
| `CODE_WRITE` | `{ "code": [...] }`: your own solution, as lines, that satisfies the prompt for every possible input of the `entry` (the body of the function, or the expression) |

Besides the answer, every item EXCEPT `CODE_WRITE` needs two facts about the SOLVED program (the program with your answer applied: for `FIX_BUG`, after your fix; for `PARSONS`, in your order; for `FILL_BLANK`, with your blanks filled; for `ORDER_OUTPUT`, the program as given), which you derive by tracing it:
- `printedOutput`: the lines it prints, as an array of strings, in the format of the README (the canonical printed form).
- `finalGlobals`: an object with every top-level `let`, `const` and `var` binding of the program whose final value is a primitive, an array or a plain object, and that value when the program ends, in the canonical printed form of the README (strings in single quotes, arrays as `[1, 2]`, and so on). Leave out bindings that hold a function, a class or an instance of one, a Map, a Set, a WeakMap, a WeakSet, a Proxy, an object with symbol keys, a promise, a DOM node or list, an iterator or a generator.

## Output file shape
```json
{
  "unit": "{{UNIT}}",
  "solutions": [
    {
      "id": "beg.example-unit.loops.predict-01",
      "answer": { "optionText": "9" },
      "printedOutput": ["9"],
      "finalGlobals": { "total": "9" }
    },
    {
      "id": "beg.example-unit.functions.write-01",
      "answer": { "code": ["let best = numbers[0];", "return best;"] }
    }
  ]
}
```
Write valid JSON only, one entry for every item of the input, with `id` exactly as given. Write the file once, when you have solved every item. Do not add comments, explanations or any other field.

## Final report (under 5 lines)
The number of items solved and the ids of any item you found ambiguous or could not solve with confidence.

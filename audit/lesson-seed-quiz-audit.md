# Lesson Seed Quiz Audit (READ-ONLY)

**Scope:** All MCQ/PUZZLE questions in the lesson seed data.
**Source:** `backend/prisma/seed/lessons/data/block0{1..9}.p{1,2}.ts`
**Data shape (`SeedExercise`):** `type` (`MCQ` | `PUZZLE`), `prompt` (stem), `codeSnippet`, `options[]`, `correctAnswer` (must equal one option), `explanation`.
**Total questions:** 90 (84 MCQ + 6 PUZZLE). PUZZLE items also carry 4 mutually-exclusive options, so they were audited under the same MCQ criteria.

**Verdict legend:** VALID = passes all 5 criteria. FLAGGED = at least one criterion fails (criterion # noted).
Criteria: (1) technical accuracy, (2) single unambiguous answer, (3) clarity/self-contained, (4) deterministic code, (5) well-formed MCQ.

---

## Block 01 — Types, variables, truthiness

### Q1 — B01.P1 #1 — `typeof null`
VALID. `typeof null === "object"` (historical bug). Distractors all wrong; exactly one correct.

### Q2 — B01.P1 #2 — keyword allowing reassignment
VALID. `let` reassignable; `const` binding is not; `final`/`immutable` are not JS keywords. One correct.

### Q3 — B01.P1 #3 — `Boolean("")`
VALID. Empty string is falsy → `false`. Distractors wrong.

### Q4 — B01.P1 #4 — `typeof 100`
VALID. Number literal → `"number"`. `"integer"` not a JS type.

### Q5 — B01.P1 #5 — reassigning a `const`
VALID. `const MAX = 100; MAX = 200;` throws a runtime `TypeError` (assignment to constant variable). Deterministic, one correct.

### Q6 — B01.P1 #6 — `typeof undefined`
VALID. Returns `"undefined"`. `"void"` not a type string.

### Q7 — B01.P1 #7 — pick the falsy value
VALID. Among `[0, "false", 1, true]` only `0` is falsy; `"false"` is a non-empty (truthy) string. Exactly one correct.

### Q8 — B01.P2 #1 — `1 + "2"`
VALID. String concatenation → `"12"`. Deterministic.

### Q9 — B01.P2 #2 — `typeof true`
VALID. → `"boolean"`. `"bool"` is not a type string.

### Q10 — B01.P2 #3 — primitive copy by value
VALID. `b = a; b = 10;` leaves `a === 5`. One correct.

---

## Block 02 — Operators, control flow

### Q11 — B02.P1 #1 — what `===` checks that `==` does not
**FLAGGED — criterion 3/5 (clarity/precision), LOW severity.**
Marked-correct option is "Type and value". But `==` *also* compares value (after coercion), so the clause "value" is something `==` does too — the literal answer to "what does `===` check that `==` does **not**" is *type / no coercion*. The intended option is still the only defensible choice (other distractors are clearly wrong), so it is answerable, but the wording is imprecise.
**Suggested fix:** reword the stem to "What does `===` compare?" (then "Type and value" is exactly correct), or change the option to "Type and value, with no coercion".

### Q12 — B02.P1 #2 — `1 == '1'`
VALID. Coercion → `true`. Deterministic.

### Q13 — B02.P1 #3 — `!false`
VALID. → `true`.

### Q14 — B02.P1 #4 — ternary `10 > 3 ? 'yes' : 'no'`
VALID. → `"yes"`.

### Q15 — B02.P1 #5 — loop count `i < 4`
VALID. Runs for i = 0,1,2,3 → 4 times.

### Q16 — B02.P1 #6 — `break`
VALID. Exits the enclosing loop immediately. Distractors describe `continue`/other.

### Q17 — B02.P1 #7 — `continue`
VALID. Skips to next iteration. Mutually exclusive with the `break` distractor.

### Q18 — B02.P2 #1 — `0 && 'hello'`
VALID. `&&` with falsy left returns the left operand (`0`). Explanation consistent.

### Q19 — B02.P2 #2 — `while (x < 5) x++`
VALID. Final `x === 5`. Deterministic.

### Q20 — B02.P2 #3 — `'hello' || 'world'`
VALID. `||` with truthy left returns the left operand.

---

## Block 03 — Functions, arrays

### Q21 — B03.P1 #1 — declaration vs expression
VALID. Declarations are hoisted; `const` expression is not (TDZ). One correct.

### Q22 — B03.P1 #2 — `arr.push(5)`
VALID. Appends to end.

### Q23 — B03.P1 #3 — arrow `n => n * 2`, `double(4)`
VALID. Implicit return → `8`.

### Q24 — B03.P1 #4 — `.filter(n => n > 2)` on `[1,2,3,4]`
VALID. → `[3, 4]`.

### Q25 — B03.P1 #5 — `arr.pop()`
VALID. Removes and returns the last element.

### Q26 — B03.P1 #6 — `.map(n => n + 10)`
VALID. → `[11, 12, 13]`.

### Q27 — B03.P2 #1 — `['a','b','c'][1]`
VALID. Zero-indexed → `"b"`.

### Q28 — B03.P2 #2 — `.find(n => n > 10)` on `[5,12,3]`
VALID. Returns the first match `12` (a value, not an array).

### Q29 — B03.P2 #3 — function with no `return`
VALID. Implicitly returns `undefined`.

### Q30 — B03.P2 #4 (PUZZLE) — method to append `'c'`
VALID. `push`. `add`/`append`/`insert` are not Array methods. One correct.

---

## Block 04 — Objects, classes

### Q31 — B04.P1 #1 — bracket notation
VALID. `obj["name"]`. Other syntaxes are invalid JS.

### Q32 — B04.P1 #2 — `this` in a class method
VALID. Refers to the instance the method is invoked on (normal invocation). Distractors wrong.

### Q33 — B04.P1 #3 — inheritance keyword
VALID. `extends`. `implements`/`inherits`/`derives` are not JS class keywords.

### Q34 — B04.P1 #4 — `super()`
VALID. Calls the parent class constructor.

### Q35 — B04.P1 #5 — `new`
VALID. Creates an instance. Distractors wrong; one defensible answer.

### Q36 — B04.P1 #6 — missing property access
VALID. `obj.b` → `undefined` (no throw).

### Q37 — B04.P2 #1 — `Object.keys(obj)`
VALID. Array of own enumerable string-keyed property names.

### Q38 — B04.P2 #2 — `hasOwnProperty`
VALID. Checks own (not inherited) property. Distractor describing the prototype chain (`in`) is wrong.

### Q39 — B04.P2 #3 (PUZZLE) — increment instance property
VALID. `this.count` matches the constructor field. One correct.

### Q40 — B04.P2 #4 — object literal
VALID. `{ key: value }` syntax. Distractors wrong.

---

## Block 05 — Map/Set, spread, destructuring

### Q41 — B05.P1 #1 — what `Map` preserves
VALID. Insertion order for any key type (objects don't reorder integer-like keys / don't keep non-string keys). Correct contrast.

### Q42 — B05.P1 #2 — `Set` guarantee
VALID. Each value appears at most once. Sorting/immutability distractors wrong.

### Q43 — B05.P1 #3 — spread in `Math.max(...[3,1,4])`
VALID. Expands array into individual args.

### Q44 — B05.P1 #4 — `const [a, b] = [10, 20]`
VALID. Positional destructuring assigns 10→a, 20→b.

### Q45 — B05.P1 #5 — `Array.from('hello')`
VALID. → `['h','e','l','l','o']`.

### Q46 — B05.P2 #1 — rest `...args` in `f(a, ...args)`
VALID. Collects all args after `a` → `[2,3,4]`.

### Q47 — B05.P2 #2 — `[...new Set([1,1,2,2,3])]`
VALID. → `[1, 2, 3]`.

### Q48 — B05.P2 #3 — `.reduce((acc,n)=>acc+n,0)`
VALID. Sum → `10`.

### Q49 — B05.P2 #4 (PUZZLE) — destructure `name`
VALID. `const { name } = user`. `user.name`/`'name'`/`this.name` are invalid in a destructuring target. One correct.

### Q50 — B05.P2 #5 — `WeakMap` key type
**FLAGGED — criterion 1 (technical accuracy), LOW severity.**
Marked-correct option is "Objects only". Since ES2023 ("Symbols as WeakMap keys", shipped in V8 / Node 20+ / modern browsers), non-registered **symbols** are also valid `WeakMap` keys, so "Objects only" is no longer strictly accurate. It remains the conventionally-taught answer and every distractor ("Strings only", "Numbers and strings", "Any primitive") is more wrong, so the item is still answerable.
**Suggested fix:** change the correct option to "Objects (and symbols)" — or keep "Objects only" but treat this as a known simplification. Optional given the curriculum level.

---

## Block 06 — Async/await, promises, errors

### Q51 — B06.P1 #1 — `async` return value
VALID. Always returns a Promise.

### Q52 — B06.P1 #2 — `await`
VALID. Pauses the current async function (not the whole thread).

### Q53 — B06.P1 #3 — `.catch(handler)`
VALID. Handles rejections / thrown errors in the chain.

### Q54 — B06.P1 #4 — omitted `await`
VALID. `const result = fetch(...)` yields the Promise object, not the resolved value.

### Q55 — B06.P1 #5 — `Promise.resolve(5).then(v => v*2)`
VALID. Resolves to `10`.

### Q56 — B06.P2 #1 — `setTimeout(fn, 0)`
VALID. `fn` runs after all synchronous code (macrotask). Distractor "before any Promises resolve" is false (microtasks run first).

### Q57 — B06.P2 #2 — error handling in async/await
VALID. Both `try/catch` inside and `.catch()` on the returned Promise. Most complete and correct.

### Q58 — B06.P2 #3 — `try/catch`
VALID. Catches any thrown value within the try block.

### Q59 — B06.P2 #4 (PUZZLE) — async keyword
VALID. `async`. `await`/`Promise`/`defer` don't mark a function async. One correct.

### Q60 — B06.P2 #5 — unhandled promise rejection
VALID. A rejected Promise with no `.catch`/`try-catch`. Distractor "await outside async" is a SyntaxError, not a rejection.

---

## Block 07 — Design patterns & SOLID (conceptual)

### Q61 — B07.P1 #1 — Singleton
VALID. Ensures only one instance exists.

### Q62 — B07.P1 #2 — Observer
VALID. Subject notifies dependent observers on state change.

### Q63 — B07.P1 #3 — Single Responsibility Principle
VALID. One reason to change. Distractors are common misstatements.

### Q64 — B07.P1 #4 — Dependency Injection
VALID. Dependencies provided from outside rather than created internally.

### Q65 — B07.P1 #5 — Factory pattern
VALID. Centralises/abstracts object creation.

### Q66 — B07.P2 #1 — Separation of concerns
VALID. Distinct responsibilities in separate modules.

### Q67 — B07.P2 #2 — Open/Closed Principle
VALID. Open for extension, closed for modification.

### Q68 — B07.P2 #3 — Liskov Substitution Principle
VALID. Subclasses substitutable for the parent without breaking behaviour.

### Q69 — B07.P2 #4 — Inversion of Control
VALID. Framework controls flow instead of app code.

### Q70 — B07.P2 #5 — module pattern vs namespace
VALID. Module pattern uses closure for truly private state.

---

## Block 08 — Event loop, performance, memory

### Q71 — B08.P1 #1 — event loop role
VALID. Moves tasks to the call stack when it is empty.

### Q72 — B08.P1 #2 — queue drained before macrotasks
VALID. Microtask queue.

### Q73 — B08.P1 #3 — memory leak cause
VALID. Forgotten event listeners holding references.

### Q74 — B08.P1 #4 — debounce vs throttle
VALID. Debounce fires after inactivity; throttle at most once per interval. Precise.

### Q75 — B08.P1 #5 — memoization
VALID. Caches results so repeated inputs skip recomputation.

### Q76 — B08.P2 #1 — lazy loading
VALID. Defer loading until needed. Distractor (load all upfront) is the opposite.

### Q77 — B08.P2 #2 — garbage collector
VALID. Frees memory for objects with no remaining references.

### Q78 — B08.P2 #3 — `performance.now()`
VALID. High-resolution timestamp relative to time origin. Distractor "ms since Jan 1 1970" is `Date.now()`.

### Q79 — B08.P2 #4 — closure memory leak
VALID. Closure capturing a large variable on a long-lived object.

### Q80 — B08.P2 #5 (PUZZLE) — debounce scheduler
VALID. `setTimeout`. `setInterval`/`requestAnimationFrame`/`Promise.resolve` are wrong for this pattern. One correct.

---

## Block 09 — Advanced async & metaprogramming

### Q81 — B09.P1 #1 — `Promise.all`
VALID. Resolves when all resolve; rejects as soon as any rejects.

### Q82 — B09.P1 #2 — `Promise.race`
VALID. Settles with the first promise to settle (resolve or reject).

### Q83 — B09.P1 #3 — `Promise.allSettled`
VALID. Waits for all regardless of rejection; never rejects.

### Q84 — B09.P1 #4 — generator functions
VALID. Can pause and yield multiple values over time.

### Q85 — B09.P1 #5 — `Symbol('id')`
VALID. Each call is unique even with the same description.

### Q86 — B09.P2 #1 — `Proxy`
VALID. Intercepts fundamental operations via traps.

### Q87 — B09.P2 #2 — currying
VALID. Multi-arg function → chain of single-arg functions.

### Q88 — B09.P2 #3 — partial application
VALID. Pre-fills some args to produce a specialised function. Distractor (calling with fewer args) is a different concept.

### Q89 — B09.P2 #4 (PUZZLE) — generator keyword
VALID. `yield`. `return`/`await`/`emit` are wrong here. One correct.

### Q90 — B09.P2 #5 — `Reflect.ownKeys` vs `Object.keys`
VALID. Returns symbol-keyed and non-enumerable string-keyed properties in addition.

---

## Phase 2 — Second-pass verification

Re-audited all 90 from scratch against the recorded verdicts. No verdict changed on review.
Particular re-checks: Q5 (const reassignment is a runtime `TypeError`, not a SyntaxError — confirmed), Q11 and Q50 (both confirmed as genuine but LOW-severity flags), Q18/Q20 (`&&`/`||` return-operand semantics — confirmed), Q56 (microtask-before-macrotask ordering — confirmed), Q90 (`Reflect.ownKeys` superset semantics — confirmed). No code snippet is non-deterministic (no `Math.random`/`Date`/environment-dependent output that changes the answer).

---

## Summary

**88 of 90 questions VALID, 2 flagged.**

Flagged ids: **Q11 (B02.P1 #1)**, **Q50 (B05.P2 #5)** — both LOW severity, both answerable as written.

### Suggested fixes
- **Q11 (`===` vs `==`):** reword stem to "What does `===` compare?" so the marked answer "Type and value" is exactly correct; or change the option to "Type and value, with no coercion".
- **Q50 (`WeakMap` keys):** change the correct option from "Objects only" to "Objects (and symbols)" to reflect ES2023, or knowingly retain the simplification for the target level.
</content>
</invoke>

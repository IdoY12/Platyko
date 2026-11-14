import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Item } from "@project/content-model";
import { CURRICULUM, curriculumPosition } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import { allItems, loadBank } from "../bank/loadBank.js";
import { CONTENT_ROOT } from "../bank/paths.js";
import { FIXTURE_CONTENT_ROOT, FIXTURE_CURRICULUM } from "../fixtures/fixtureUnit.js";
import { loadConstructsMap, scanConstructs } from "./constructScan.js";

const constructsMap = loadConstructsMap(CONTENT_ROOT) ?? {};
const fixtureItems = allItems(loadBank(FIXTURE_CONTENT_ROOT).units);

/** A unit before the whole curriculum: every mapped construct is above its level. */
const BEFORE_EVERYTHING: CurriculumUnit[] = [{ track: "BEGINNER", unit: "nothing-taught-yet", title: "Start" }, ...CURRICULUM];

function predictItem(code: string, unit: string): Item {
  return { ...fixtureItems[0], unit, code: code.split("\n") };
}

/** Constructs reported as above the level of an item in `unit`. */
function aboveLevel(code: string, unit = "nothing-taught-yet"): string[] {
  return scanConstructs(predictItem(code, unit), constructsMap, BEFORE_EVERYTHING)
    .filter((finding) => finding.check === "construct-above-level")
    .map((finding) => /"([^"]+)"/.exec(finding.message)?.[1] ?? "");
}

/** One snippet per construct id of `content/constructs.json`. */
const SNIPPET_BY_CONSTRUCT: Record<string, string> = {
  typeof: "console.log(typeof 1);",
  "template-literal": "console.log(`a`);",
  "let-const": "let count = 1;",
  "arithmetic-operator": "console.log(1 + 2);",
  "comparison-operator": "console.log(1 === 2);",
  "logical-operator": "console.log(true && false);",
  "if-statement": "if (true) console.log(1);",
  ternary: "console.log(true ? 1 : 2);",
  switch: "switch (1) {\n  case 1:\n    console.log(1);\n}",
  "for-loop": "for (;;) {}",
  "while-loop": "do {} while (false);",
  "break-continue": "while (true) {\n  break;\n}",
  "function-declaration": "function go() {}",
  "function-expression": "(function () {});",
  "arrow-function": "(() => 1);",
  return: "function go() {\n  return 1;\n}",
  "default-parameter": "function go(step = 1) {}",
  "array-literal": "console.log([1]);",
  "index-access": "console.log(list[0]);",
  "array-length": "console.log(list.length);",
  "array-basic-method": "list.push(1);",
  "for-of": "for (const entry of list) {}",
  "object-literal": "console.log({});",
  "property-access": "console.log(user.name);",
  "in-operator": 'console.log("name" in user);',
  "delete-operator": "delete user.name;",
  "object-keys-values-entries": "Object.entries(user);",
  "for-in": "for (const key in user) {}",
  "array-iteration-method": "list.map(String);",
  destructuring: "const { name } = user;",
  spread: "console.log([...list]);",
  rest: "function go(...parts) {}",
  "optional-chaining": "console.log(user?.name);",
  "nullish-coalescing": "console.log(user ?? 1);",
  "shorthand-property": "console.log({ name });",
  "computed-key": "console.log({ [key]: 1 });",
  "object-copy-helper": "Object.freeze(user);",
  var: "var count = 1;",
  shadowing: "let count = 1;\n{\n  let count = 2;\n}",
  "function-returning-function": "function make() {\n  return () => 1;\n}",
  this: "console.log(this);",
  class: "class Point {}",
  new: "new Point();",
  extends: "class Dot extends Point {}",
  super: "class Dot extends Point {\n  constructor() {\n    super();\n  }\n}",
  static: "class Point {\n  static origin = 0;\n}",
  "getter-setter": "const box = {\n  get size() {\n    return 1;\n  },\n};",
  "call-apply-bind": "go.call(user);",
  "try-catch": "try {\n} catch {}",
  throw: "throw 1;",
  "error-constructor": 'new TypeError("wrong");',
  timer: "setTimeout(go);",
  promise: "Promise.resolve(1);",
  "promise-chain": "task.then(go);",
  "async-await": "async function go() {}",
  dom: "document.title;",
  "promise-combinator": "Promise.all([]);",
  "queue-microtask": "queueMicrotask(go);",
  prototype: "Point.prototype.size = 1;",
  instanceof: "console.log(user instanceof Point);",
  generator: "function* go() {}",
  "iterator-protocol": "list[Symbol.iterator]();",
  "import-export": 'import("./other.js");',
  "map-set": "new Set();",
  symbol: 'Symbol("id");',
  "bigint-literal": "console.log(10n);",
  "proxy-reflect": "new Proxy(user, {});",
};

describe("content/constructs.json", () => {
  it("maps every construct to a unit of the curriculum", () => {
    expect(Object.keys(constructsMap).length).toBeGreaterThan(60);
    for (const unit of Object.values(constructsMap)) expect(curriculumPosition(CURRICULUM, unit), unit).toBeGreaterThanOrEqual(0);
  });

  it("lists exactly the constructs the scanner detects", () => {
    expect(Object.keys(SNIPPET_BY_CONSTRUCT).sort()).toEqual(Object.keys(constructsMap).sort());
  });

  it.each(Object.entries(SNIPPET_BY_CONSTRUCT))("detects %s", (construct, snippet) => {
    expect(aboveLevel(snippet)).toContain(construct);
  });

  it("is null when the file is missing or not a map of strings", () => {
    const contentRoot = mkdtempSync(join(tmpdir(), "content-tools-constructs-"));
    expect(loadConstructsMap(contentRoot)).toBeNull();
    writeFileSync(join(contentRoot, "constructs.json"), '{"typeof": 1}');
    expect(loadConstructsMap(contentRoot)).toBeNull();
  });
});

describe("scanConstructs", () => {
  it("passes every fixture item at the fixture unit's place in the curriculum", () => {
    expect(fixtureItems.flatMap((item) => scanConstructs(item, constructsMap, FIXTURE_CURRICULUM))).toEqual([]);
  });

  it("is purely positional: the same snippet passes in its unit and later, and fails earlier", () => {
    const snippet = "const prices = [4, 9];\nconsole.log(prices.map((price) => price * 2));";
    expect(aboveLevel(snippet, "array-methods")).toEqual([]);
    expect(aboveLevel(snippet, "closures")).toEqual([]);
    expect(aboveLevel(snippet, "objects")).toEqual(["array-iteration-method"]);
    expect(aboveLevel(snippet, "variables").sort()).toEqual(["array-iteration-method", "array-literal", "arrow-function"]);
  });

  it("reports the gate, the item, the home unit and the place", () => {
    const item = predictItem("let total = 0;\nsetTimeout(() => console.log(total), 0);", "functions");
    expect(scanConstructs(item, constructsMap, CURRICULUM)).toEqual([
      {
        gate: "D",
        check: "construct-above-level",
        itemId: item.id,
        unit: "functions",
        message: 'uses "timer", which is taught later, in "async-basics" ("code" program, line 2)',
      },
    ]);
  });

  it.each([
    ["a negative number is a value, not arithmetic", "console.log(-5);", "values-and-types"],
    ["break inside switch belongs to switch", "switch (1) {\n  case 1:\n    break;\n}", "conditionals"],
    ["console.log and Math.PI are not property access", "console.log(Math.PI);", "values-and-types"],
    ["a method call on a value is not property access", 'console.log("abc".toUpperCase());', "values-and-types"],
    ["Symbol.iterator needs only the iterators unit", "const steps = list[Symbol.iterator]();\nsteps.next();", "iterators-and-generators"],
    ["two loops may reuse a counter name", "for (let i = 0; i < 2; i++) {}\nfor (let i = 0; i < 2; i++) {}", "loops"],
    ["assigning to an outer variable is not shadowing", "let count = 1;\nfunction bump() {\n  count = 2;\n}", "functions"],
    ["returning a value is not returning a function", "function double(size) {\n  return size * 2;\n}", "functions"],
    ["a default inside destructuring is not a default parameter", "const { size = 1 } = box;", "objects-in-depth"],
    ["names inherited by every object are not constructs", "console.log(constructor, (5).toString());\nvalueOf.hasOwnProperty();", "values-and-types"],
  ])("%s", (_what, snippet, unit) => {
    expect(aboveLevel(snippet, unit)).toEqual([]);
  });

  it.each([
    ["a parameter named like an outer variable", "const price = 5;\nfunction double(price) {\n  return price * 2;\n}", "functions", ["shadowing"]],
    ["a var inside a function named like an outer one", "var count = 1;\nfunction reset() {\n  var count = 0;\n}", "functions", ["shadowing", "var"]],
    ["a caught error named like an outer variable", "const error = 1;\ntry {\n} catch (error) {}", "objects", ["shadowing", "try-catch"]],
    ["an inner function returned by name", "function counter() {\n  let count = 0;\n  function step() {\n    return count + 1;\n  }\n  return step;\n}", "functions", ["function-returning-function"]],
    ["an inner arrow function returned by name", "function counter() {\n  const step = () => 1;\n  return step;\n}", "functions", ["function-returning-function"]],
    ["an arrow function that returns an arrow function", "const add = (left) => (right) => left + right;", "functions", ["function-returning-function"]],
    ["rest inside an object pattern", "const { first, ...others } = user;", "objects", ["destructuring", "rest"]],
    ["await and async arrow functions", "const load = async () => {\n  await task;\n};", "functions", ["async-await"]],
    ["a class with a setter and a static method", "class Box {\n  static make() {}\n  set size(next) {}\n}", "closures", ["class", "getter-setter", "static"]],
    ["a compound comparison and a logical operator", "let ready = 1 < 2 && 2 >= 2;", "variables", ["comparison-operator", "logical-operator"]],
    ["yield and next", "function* steps() {\n  yield 1;\n}\nsteps().next();", "closures", ["generator", "iterator-protocol"]],
  ])("detects %s", (_what, snippet, unit, expected) => {
    expect(aboveLevel(snippet, unit).sort()).toEqual(expected);
  });

  it("scans the solved program of every format and skips deliberately wrong solutions", () => {
    const write = fixtureItems.find((item) => item.format === "CODE_WRITE");
    if (!write) throw new Error("The fixture has no CODE_WRITE item.");
    const withWrongSolution: Item = { ...write, solution: { ...write.solution, wrongSolutions: [["return numbers.map(String);"]] } };
    expect(scanConstructs(withWrongSolution, constructsMap, FIXTURE_CURRICULUM)).toEqual([]);
    const withReference: Item = { ...write, solution: { ...write.solution, reference: ["return Math.max(...numbers);"] } };
    expect(scanConstructs(withReference, constructsMap, FIXTURE_CURRICULUM).map((finding) => finding.message)).toEqual([
      'uses "spread", which is taught later, in "objects-in-depth" ("reference" program, line 2)',
    ]);
  });

  it("reports a construct the map does not place, and nothing for a unit outside the curriculum", () => {
    const item = predictItem("console.log(typeof 1);", "values-and-types");
    expect(scanConstructs(item, {}, CURRICULUM).map((finding) => finding.check)).toEqual(["construct-unmapped"]);
    expect(scanConstructs(item, { typeof: "no-such-unit" }, CURRICULUM).map((finding) => finding.check)).toEqual(["construct-unmapped"]);
    expect(scanConstructs({ ...item, unit: "no-such-unit" }, constructsMap, CURRICULUM)).toEqual([]);
  });

  it("ignores a snippet that does not parse; the banned-construct check reports it", () => {
    expect(aboveLevel("let = ;")).toEqual([]);
  });
});

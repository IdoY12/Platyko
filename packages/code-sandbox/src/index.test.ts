import { describe, expect, it } from "vitest";
import type { CodeWriteEntry } from "@project/content-model";
import { judgeCodeWrite, type SandboxFailure, type SandboxVerdict } from "./index.js";

const PASSED: SandboxVerdict = { passed: true, failedTestIndex: null, failure: null };
const failedFirstTest = (failure: SandboxFailure): SandboxVerdict => ({ passed: false, failedTestIndex: 0, failure });

const sumEntry: CodeWriteEntry = { kind: "function", name: "sum", params: ["numbers"] };
const sumTests = [
  { input: [[1, 2, 3]], expected: 6 },
  { input: [[]], expected: 0 },
];

/** Judges an expression that takes no variables against the one value it must produce. */
const judgeExpression = (source: string, expected: unknown, input: Record<string, unknown> = {}) =>
  judgeCodeWrite({ kind: "expression", variables: Object.keys(input) }, source, [{ input, expected }]);

/** Judges a function body called without arguments against the one value it must return. */
const judgeBody = (source: string, expected: unknown) =>
  judgeCodeWrite({ kind: "function", name: "solve", params: [] }, source, [{ input: [], expected }]);

describe("expression entries", () => {
  const doubleTests = [
    { input: { numbers: [1, 2, 3] }, expected: [2, 4, 6] },
    { input: { numbers: [] }, expected: [] },
  ];
  const doubleEntry: CodeWriteEntry = { kind: "expression", variables: ["numbers"] };

  it("passes a correct expression, ignoring surrounding whitespace and a trailing semicolon", async () => {
    expect(await judgeCodeWrite(doubleEntry, "  numbers.map((n) => n * 2);  ", doubleTests)).toEqual(PASSED);
  });

  it("reports the first failing test of a wrong expression", async () => {
    expect(await judgeCodeWrite(doubleEntry, "numbers.length ? [2, 4, 6] : [0]", doubleTests)).toEqual({
      passed: false,
      failedTestIndex: 1,
      failure: "wrong-result",
    });
  });

  it("rejects text that does not parse", async () => {
    expect(await judgeExpression("1 +", 1)).toEqual(failedFirstTest("syntax-error"));
    expect(await judgeExpression("", null)).toEqual(failedFirstTest("syntax-error"));
  });

  it("rejects text that is more than one expression", async () => {
    expect(await judgeExpression("1); (1", 1)).toEqual(failedFirstTest("syntax-error"));
    expect(await judgeExpression("1; 1", 1)).toEqual(failedFirstTest("syntax-error"));
    expect(await judgeExpression("1 }; (() => { return 1", 1)).toEqual(failedFirstTest("syntax-error"));
  });

  it("keeps a trailing line comment from swallowing the wrapper", async () => {
    expect(await judgeExpression("a + b // sum", 3, { a: 1, b: 2 })).toEqual(PASSED);
  });

  it("runs in strict mode", async () => {
    expect(await judgeExpression("(function () { return this; })()", null)).toEqual(PASSED);
    expect(await judgeExpression("(undeclared = 1)", 1)).toEqual(failedFirstTest("runtime-error"));
  });
});

describe("function entries", () => {
  it("passes a correct body with a loop and local variables", async () => {
    const body = "let total = 0;\nfor (const value of numbers) {\n  total += value;\n}\nreturn total;";
    expect(await judgeCodeWrite(sumEntry, body, sumTests)).toEqual(PASSED);
  });

  it("reports the first failing test of an incorrect body", async () => {
    expect(await judgeCodeWrite(sumEntry, "return numbers.length;", sumTests)).toEqual({
      passed: false,
      failedTestIndex: 0,
      failure: "wrong-result",
    });
  });

  it("lets the body call itself by the entry name and use full Math and Object", async () => {
    const factorial: CodeWriteEntry = { kind: "function", name: "factorial", params: ["n"] };
    expect(await judgeCodeWrite(factorial, "return n <= 1 ? 1 : n * factorial(n - 1);", [{ input: [5], expected: 120 }])).toEqual(PASSED);
    expect(await judgeBody("return [Math.hypot(3, 4), Math.trunc(-1.5), Object.freeze([1]).length];", [5, -1, 1])).toEqual(PASSED);
  });

  it("treats a body that returns nothing as returning null", async () => {
    expect(await judgeBody("const unused = 1;", null)).toEqual(PASSED);
  });

  it("rejects a body that does not parse", async () => {
    expect(await judgeBody("return (;", null)).toEqual(failedFirstTest("syntax-error"));
    expect(await judgeBody("return await 1;", 1)).toEqual(failedFirstTest("syntax-error"));
  });

  it("rejects a body that closes the wrapper and adds top-level code", async () => {
    expect(await judgeBody("return 1; }\nglobalThis.escaped = true;\nfunction other() {", 1)).toEqual(failedFirstTest("syntax-error"));
    expect(await judgeBody("} ; (function () { return 1;", 1)).toEqual(failedFirstTest("syntax-error"));
  });

  it("reports a thrown error, including stack exhaustion, as a runtime error", async () => {
    expect(await judgeBody("throw new SyntaxError('thrown, not parsed');", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody("return null.length;", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody("return solve();", null)).toEqual(failedFirstTest("runtime-error"));
  });

  it("handles a 100 KB source", async () => {
    const padding = "total += 1; // padding line\n".repeat(3_600);
    const body = `let total = 0;\n${padding}return total;`;
    expect(body.length).toBeGreaterThan(100_000);
    expect(await judgeBody(body, 3_600)).toEqual(PASSED);
    expect(await judgeExpression(`[${"1,".repeat(50_000)}].length`, 50_000)).toEqual(PASSED);
  });
});

describe("resource limits", () => {
  it("stops an infinite loop quickly", async () => {
    const startedAt = performance.now();
    expect(await judgeBody("while (true) {}", null)).toEqual(failedFirstTest("timeout"));
    expect(await judgeExpression("(() => { for (;;) {} })()", null)).toEqual(failedFirstTest("timeout"));
    expect(await judgeBody("return /(a+)+$/.test('a'.repeat(40) + '!');", false)).toEqual(failedFirstTest("timeout"));
    expect(performance.now() - startedAt).toBeLessThan(1_500);
  });

  it("stops a loop hidden in a queued microtask", async () => {
    expect(await judgeBody("Promise.resolve().then(() => { for (;;) {} });\nreturn 1;", 1)).toEqual(failedFirstTest("timeout"));
  });

  it("survives a memory bomb", async () => {
    const verdict = await judgeBody("const hoard = [];\nwhile (true) hoard.push('x'.repeat(1000) + hoard.length);", null);
    expect(verdict.passed).toBe(false);
    expect(["timeout", "runtime-error"]).toContain(verdict.failure);
    expect(await judgeCodeWrite(sumEntry, "return numbers.reduce((total, value) => total + value, 0);", sumTests)).toEqual(PASSED);
  });

  it("never serialises an oversized result in the host", async () => {
    const startedAt = performance.now();
    expect(await judgeBody("return new Array(30000).fill('x'.repeat(1e6));", null)).toMatchObject({ passed: false });
    expect(await judgeBody("return 'x'.repeat(2 ** 29 - 24);", null)).toMatchObject({ passed: false });
    expect(await judgeBody("let nested = [1];\nfor (let depth = 0; depth < 40; depth += 1) nested = [nested, nested];\nreturn nested;", null)).toMatchObject({ passed: false });
    expect(performance.now() - startedAt).toBeLessThan(2_000);
  });

  it("runs getters and proxy traps of the result under the time limit", async () => {
    const startedAt = performance.now();
    expect(await judgeBody("return { get value() { for (;;) {} } };", null)).toEqual(failedFirstTest("timeout"));
    expect(await judgeBody("return new Proxy({}, { ownKeys() { for (;;) {} } });", null)).toEqual(failedFirstTest("timeout"));
    expect(await judgeBody("const error = new Error('x');\nObject.defineProperty(error, 'message', { get() { for (;;) {} } });\nthrow error;", null)).toEqual(
      failedFirstTest("runtime-error"),
    );
    expect(performance.now() - startedAt).toBeLessThan(1_500);
  });
});

describe("host isolation", () => {
  it("finds no host object behind any global or constructor", async () => {
    expect(await judgeExpression("typeof globalThis.process", "undefined")).toEqual(PASSED);
    expect(await judgeExpression("typeof require", "undefined")).toEqual(PASSED);
    expect(await judgeExpression("typeof Function('return this')().process", "undefined")).toEqual(PASSED);
    expect(await judgeExpression("typeof (() => {}).constructor('return this')().require", "undefined")).toEqual(PASSED);
    expect(await judgeExpression("typeof console + typeof setTimeout + typeof global", "undefinedundefinedundefined")).toEqual(PASSED);
    expect(await judgeExpression("this.constructor.constructor('return process')()", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("(() => {}).constructor.constructor('return process')()", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("require('fs')", null)).toEqual(failedFirstTest("runtime-error"));
  });

  it("rejects a dynamic import, an async function and any other promise or thenable", async () => {
    expect(await judgeExpression('import("fs")', null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody("return (async () => 1)();", 1)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("Promise.resolve(1)", 1)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("({ then(resolve) { resolve(1); } })", 1)).toEqual(failedFirstTest("runtime-error"));
  });

  it("rejects a result that is not plain data", async () => {
    expect(await judgeExpression("() => 1", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("[1, () => 1]", [1, null])).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("new Map([[1, 2]])", {})).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("Symbol('s')", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("10n", 10)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody("const cycle = {};\ncycle.self = cycle;\nreturn cycle;", {})).toEqual(failedFirstTest("runtime-error"));
  });

  it("reads getters and proxies inside the isolate, so only their data reaches the host", async () => {
    expect(await judgeExpression("({ get value() { return 1; } })", { value: 1 })).toEqual(PASSED);
    expect(await judgeExpression("new Proxy({ value: 1 }, {})", { value: 1 })).toEqual(PASSED);
    expect(await judgeExpression("({ get value() { return process; } })", { value: 1 })).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("new Proxy({}, { ownKeys() { return process; } })", {})).toEqual(failedFirstTest("runtime-error"));
  });

  it("starts every test case from untouched built-ins", async () => {
    const pollutingSource = "(Object.prototype.polluted = (Object.prototype.polluted ?? 0) + 1, {}.polluted)";
    const tests = [
      { input: {}, expected: 1 },
      { input: {}, expected: 1 },
    ];
    expect(await judgeCodeWrite({ kind: "expression", variables: [] }, pollutingSource, tests)).toEqual(PASSED);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("gains nothing from replacing the built-ins the result encoding uses", async () => {
    const replaceArrayEncoding = (replacement: string) => `Array.isArray = () => true;\nArray.from = () => ${replacement};\nreturn {};`;
    expect(await judgeBody("Object.is = () => { for (;;) {} };\nreturn 1;", 1)).toEqual(failedFirstTest("timeout"));
    expect(await judgeBody(replaceArrayEncoding("() => 1"), {})).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody(replaceArrayEncoding("({ toJSON() { return process; } })"), {})).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody(replaceArrayEncoding("'x'.repeat(2 ** 29 - 24)"), {})).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeBody(replaceArrayEncoding("'s' + 'x'.repeat(999_990)"), {})).toEqual(failedFirstTest("wrong-result"));
    expect(await judgeBody(replaceArrayEncoding("'s' + 'x'.repeat(1_000_000)"), {})).toEqual(failedFirstTest("runtime-error"));
  });
});

describe("removed globals", () => {
  it("has no nondeterministic or dangerous built-in", async () => {
    const removedNames = ["Date", "Intl", "eval", "WebAssembly", "SharedArrayBuffer", "Atomics"];
    const typesOfRemoved = removedNames.map((name) => `typeof ${name}`).join(", ");
    expect(await judgeExpression(`[typeof Math.random, ${typesOfRemoved}]`, new Array(7).fill("undefined"))).toEqual(PASSED);
    expect(await judgeExpression("Math.random()", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("new Date().getTime()", null)).toEqual(failedFirstTest("runtime-error"));
    expect(await judgeExpression("Function('return Date.now()')()", null)).toEqual(failedFirstTest("runtime-error"));
  });
});

describe("comparison with the expected value", () => {
  it("compares nested arrays and objects deeply, whatever the key order", async () => {
    const expected = { name: "Ada", tags: ["a", "b"], nested: [{ id: 1, ok: true }, [null, 2.5]] };
    expect(await judgeExpression('({ nested: [{ ok: true, id: 1 }, [null, 2.5]], tags: ["a", "b"], name: "Ada" })', expected)).toEqual(PASSED);
    expect(await judgeExpression('({ nested: [{ ok: true, id: "1" }, [null, 2.5]], tags: ["a", "b"], name: "Ada" })', expected)).toEqual(
      failedFirstTest("wrong-result"),
    );
    expect(await judgeExpression("[1, [2]]", [1, 2])).toEqual(failedFirstTest("wrong-result"));
  });

  it("passes input values through unchanged", async () => {
    const input = { text: "s-prefixed", list: [1, { deep: ["u", "n1"] }], flag: false, nothing: null };
    expect(await judgeExpression("[text, list, flag, nothing]", [input.text, input.list, input.flag, input.nothing], input)).toEqual(PASSED);
  });

  it("treats NaN as equal to NaN", async () => {
    expect(await judgeExpression("0 / 0", NaN)).toEqual(PASSED);
    expect(await judgeExpression("[Number('x'), Infinity, -Infinity]", [NaN, Infinity, -Infinity])).toEqual(PASSED);
    expect(await judgeExpression("NaN", null)).toEqual(failedFirstTest("wrong-result"));
  });

  it("tells -0 from 0", async () => {
    expect(await judgeExpression("-0", -0)).toEqual(PASSED);
    expect(await judgeExpression("-0", 0)).toEqual(failedFirstTest("wrong-result"));
    expect(await judgeExpression("[0]", [-0])).toEqual(failedFirstTest("wrong-result"));
  });

  it("treats only a top-level undefined as null", async () => {
    expect(await judgeExpression("undefined", null)).toEqual(PASSED);
    expect(await judgeExpression("[undefined]", [null])).toEqual(failedFirstTest("wrong-result"));
    expect(await judgeExpression("[undefined]", [undefined])).toEqual(PASSED);
  });

  it("does not confuse a value with the text of another type", async () => {
    expect(await judgeExpression('"1"', 1)).toEqual(failedFirstTest("wrong-result"));
    expect(await judgeExpression('"u"', null)).toEqual(failedFirstTest("wrong-result"));
    expect(await judgeExpression('"nNaN"', NaN)).toEqual(failedFirstTest("wrong-result"));
    expect(await judgeExpression('"null"', null)).toEqual(failedFirstTest("wrong-result"));
  });
});

describe("misauthored tests", () => {
  it("throws instead of blaming the learner", async () => {
    await expect(judgeCodeWrite(sumEntry, "return 0;", [])).rejects.toThrow(RangeError);
    await expect(judgeCodeWrite(sumEntry, "return 0;", [{ input: { numbers: [] }, expected: 0 }])).rejects.toThrow(TypeError);
    await expect(judgeExpression("1", 1, [] as unknown as Record<string, unknown>)).rejects.toThrow(TypeError);
  });
});

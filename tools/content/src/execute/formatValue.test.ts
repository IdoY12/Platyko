import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { formatConsoleArguments, formatValue } from "./formatValue.js";

/** Evaluates an expression in another realm, as the runner does: `instanceof` cannot help the formatter. */
function fromOtherRealm(expression: string): unknown {
  return vm.runInNewContext(`(${expression})`);
}

function printed(expression: string): string {
  return formatConsoleArguments([fromOtherRealm(expression)]);
}

describe("formatConsoleArguments", () => {
  it("joins the arguments with one space and prints a top-level string raw", () => {
    expect(formatConsoleArguments(["total:", 3, "it's", true])).toBe("total: 3 it's true");
  });

  it("prints primitives as written", () => {
    expect(formatConsoleArguments([0, -0, NaN, Infinity, -Infinity, 1.5])).toBe("0 -0 NaN Infinity -Infinity 1.5");
    expect(formatConsoleArguments([10n, null, undefined, false])).toBe("10n null undefined false");
    expect(printed("Symbol('tag')")).toBe("Symbol(tag)");
    expect(printed("Symbol()")).toBe("Symbol()");
  });

  it("quotes a string inside a container and escapes a single quote", () => {
    expect(printed("['a', 'it\\'s']")).toBe("['a', 'it\\'s']");
    expect(printed("{ text: 'two\\nlines' }")).toBe("{text: 'two\\nlines'}");
  });

  it("prints arrays, with holes as empty", () => {
    expect(printed("[1, 2, 3]")).toBe("[1, 2, 3]");
    expect(printed("[]")).toBe("[]");
    expect(printed("[1, , 3]")).toBe("[1, empty, 3]");
    expect(printed("[, , 'x', , ]")).toBe("[empty × 2, 'x', empty]");
    expect(printed("new Array(3)")).toBe("[empty × 3]");
  });

  it("prints plain objects, quoting keys only when they are not identifiers", () => {
    expect(printed("{ a: 1, b: 'x' }")).toBe("{a: 1, b: 'x'}");
    expect(printed("{}")).toBe("{}");
    expect(printed("{ 'my-key': 1, $ok_1: 2, 7: 3 }")).toBe("{'7': 3, 'my-key': 1, $ok_1: 2}");
    expect(printed("{ [Symbol('tag')]: 1, a: 2 }")).toBe("{a: 2, [Symbol(tag)]: 1}");
  });

  it("names the class of an instance and marks a null prototype", () => {
    expect(printed("new (class Point { constructor() { this.x = 1; } })()")).toBe("Point {x: 1}");
    expect(printed("new (class Empty {})()")).toBe("Empty {}");
    expect(printed("Object.assign(Object.create(null), { a: 1 })")).toBe("[Object: null prototype] {a: 1}");
  });

  it("prints maps and sets with their size", () => {
    expect(printed("new Map([['a', 1], ['b', 2]])")).toBe("Map(2) {'a' => 1, 'b' => 2}");
    expect(printed("new Map()")).toBe("Map(0) {}");
    expect(printed("new Set([1, 2])")).toBe("Set(2) {1, 2}");
    expect(printed("new Set(['a'])")).toBe("Set(1) {'a'}");
  });

  it("prints functions and classes by name", () => {
    expect(printed("function named() {}")).toBe("[Function: named]");
    expect(printed("() => 1")).toBe("[Function (anonymous)]");
    expect(printed("class Shape {}")).toBe("[class Shape]");
    expect(printed("class {}")).toBe("[class (anonymous)]");
    expect(printed("{ classify: (classroom) => classroom }")).toBe("{classify: [Function: classify]}");
  });

  it("prints an error as its name only, never its message", () => {
    expect(printed("new TypeError('secret')")).toBe("TypeError");
    expect(printed("[new Error('secret')]")).toBe("[Error]");
    expect(printed("Object.assign(new Error('secret'), { name: 'ValidationError' })")).toBe("ValidationError");
  });

  it("prints the state of a promise without waiting for it", () => {
    expect(printed("new Promise(() => {})")).toBe("Promise {<pending>}");
    expect(printed("Promise.resolve(1)")).toBe("Promise {<fulfilled>: 1}");
    expect(printed("Promise.resolve('done')")).toBe("Promise {<fulfilled>: 'done'}");
    expect(printed("Promise.reject(new RangeError('secret'))")).toBe("Promise {<rejected>: RangeError}");
    expect(formatConsoleArguments([Promise.resolve([1])])).toBe("Promise {<fulfilled>: [1]}");
  });

  it("never invokes a getter", () => {
    const source = "{ get computed() { throw new Error('invoked'); }, set writable(value) {}, get both() { return 1; }, set both(value) {} }";
    expect(printed(source)).toBe("{computed: [Getter], writable: [Setter], both: [Getter/Setter]}");
  });

  it("marks a circular reference", () => {
    expect(printed("(() => { const node = { name: 'a' }; node.self = node; return node; })()")).toBe("{name: 'a', self: [Circular]}");
    expect(printed("(() => { const list = [1]; list.push(list); return list; })()")).toBe("[1, [Circular]]");
  });

  it("prints a regular expression as written", () => {
    expect(printed("/ab+c/gi")).toBe("/ab+c/gi");
  });

  it("prints three container levels and reports a fourth as a finding", () => {
    const findings: string[] = [];
    expect(formatConsoleArguments([fromOtherRealm("[[[1]]]"), fromOtherRealm("{ a: { b: { c: 1 } } }")], findings)).toBe("[[[1]]] {a: {b: {c: 1}}}");
    expect(findings).toEqual([]);
    expect(formatConsoleArguments([fromOtherRealm("[[[[1]]]]")], findings)).toBe("[[[[Array]]]]");
    expect(formatConsoleArguments([fromOtherRealm("{ a: [{ b: { c: 1 } }] }")], findings)).toBe("{a: [{b: [Object]}]}");
    expect(findings).toEqual(["output nests containers deeper than 3 levels", "output nests containers deeper than 3 levels"]);
  });
});

describe("formatValue", () => {
  it("quotes a top-level string, so that '5' and 5 differ", () => {
    expect(formatValue("5")).toBe("'5'");
    expect(formatValue(5)).toBe("5");
  });
});

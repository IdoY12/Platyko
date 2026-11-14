import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import type { AuthoredItem, ItemFormat } from "@project/content-model";
import { FIXTURE_CONTENT_ROOT, loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { allItems, loadBank } from "./loadBank.js";
import { applyBugFix, executableProgramsOf, fillBlanks, solvedProgramOf, wrapCodeWrite } from "./programs.js";

/** Runs a synchronous program and returns what it prints; an uncaught error prints `Uncaught <name>`. */
function run(lines: string[]): string {
  const printed: string[] = [];
  const log = (...values: unknown[]) => printed.push(values.map(String).join(" "));
  try {
    runInNewContext(lines.join("\n"), { console: { log } });
  } catch (error) {
    printed.push(`Uncaught ${(error as { name: string }).name}`);
  }
  return printed.join("\n");
}

function permutations(indexes: number[]): number[][] {
  if (indexes.length <= 1) return [indexes];
  return indexes.flatMap((first) => permutations(indexes.filter((index) => index !== first)).map((rest) => [first, ...rest]));
}

function fixtureItem(format: ItemFormat, variant?: "ORDER_OUTPUT"): AuthoredItem {
  const item = loadFixtureUnit().items.find((candidate) => candidate.format === format && candidate.variant === variant);
  if (!item) throw new Error(`The fixture has no ${format} item.`);
  return item;
}

describe("fillBlanks", () => {
  it("fills the blanks in reading order, also several on one line", () => {
    expect(fillBlanks(["const ___ = [___, 2];", "console.log(___);"], ["list", "1", "list"])).toEqual([
      "const list = [1, 2];",
      "console.log(list);",
    ]);
  });

  it("leaves a blank in place when there is no value for it", () => {
    expect(fillBlanks(["___ + ___"], ["1"])).toEqual(["1 + ___"]);
  });
});

describe("applyBugFix", () => {
  const code = ["if (ready) {", "  count = count - 1;", "}"];

  it("keeps the indentation of the replaced line when the replacement has none", () => {
    expect(applyBugFix(code, 2, "count = count + 1;")).toEqual(["if (ready) {", "  count = count + 1;", "}"]);
  });

  it("uses the replacement's own indentation when it has one", () => {
    expect(applyBugFix(code, 2, "    count++;")[1]).toBe("    count++;");
  });

  it("changes nothing when the line does not exist", () => {
    expect(applyBugFix(code, 9, "count++;")).toEqual(code);
  });
});

describe("wrapCodeWrite", () => {
  it("declares the test input as variables around an expression", () => {
    const program = wrapCodeWrite({ kind: "expression", variables: ["price", "tags"] }, ["price * tags.length"], {
      price: 4,
      tags: ["new", "sale"],
    });
    expect(program).toEqual(['let price = 4;', 'let tags = ["new","sale"];', "console.log(", "price * tags.length", ");"]);
    expect(run(program)).toBe("8");
  });

  it("wraps a function body and calls it with the test input array", () => {
    const program = wrapCodeWrite({ kind: "function", name: "join", params: ["left", "right"] }, ["return left + right;"], ["a", "b"]);
    expect(program).toEqual(["function join(left, right) {", "return left + right;", "}", 'console.log(join("a", "b"));']);
    expect(run(program)).toBe("ab");
  });

  it("still produces a program when the test input has the wrong shape", () => {
    expect(run(wrapCodeWrite({ kind: "expression", variables: ["size"] }, ["size"], null))).toBe("undefined");
    expect(run(wrapCodeWrite({ kind: "function", name: "one", params: [] }, ["return 1;"], "no array"))).toBe("1");
  });
});

describe("executableProgramsOf", () => {
  it("labels the programs of every format", () => {
    const labels = Object.fromEntries(loadFixtureUnit().items.map((item) => [item.id.slice(item.id.lastIndexOf(".") + 1), executableProgramsOf(item).map((program) => program.label)]));
    expect(labels).toEqual({
      "predict-01": ["code"],
      "trace-01": ["code"],
      "fill-01": ["filled blanks"],
      "parsons-01": ["code"],
      "write-01": ["reference", "wrong solution 1", "wrong solution 2", "wrong solution 3"],
      "concept-01": ["code"],
      "fix-01": ["buggy", "fixed"],
    });
    expect(executableProgramsOf(fixtureItem("PARSONS")).map((program) => program.label)).toEqual(["solved order"]);
  });

  it("includes the optional context snippet of a CODE_WRITE item", () => {
    const item = { ...fixtureItem("CODE_WRITE"), code: ["const numbers = [3, 9, 4];"] };
    expect(executableProgramsOf(item)[0]).toEqual({ label: "context", lines: ["const numbers = [3, 9, 4];"] });
  });

  it("returns no program instead of throwing when the solution fields are missing or wrong", () => {
    expect(executableProgramsOf({ ...fixtureItem("PARSONS"), solution: {} })).toEqual([]);
    expect(executableProgramsOf({ ...fixtureItem("PARSONS"), solution: { lineOrder: [0, 99] } })).toEqual([]);
    expect(executableProgramsOf({ ...fixtureItem("FILL_BLANK"), solution: {} })).toEqual([]);
    expect(executableProgramsOf({ ...fixtureItem("CODE_WRITE"), solution: {} })).toEqual([]);
    expect(executableProgramsOf({ ...fixtureItem("FIX_BUG"), solution: {} }).map((program) => program.label)).toEqual(["buggy"]);
    expect(executableProgramsOf({ ...fixtureItem("PREDICT_OUTPUT"), code: undefined })).toEqual([]);
  });
});

describe("the fixture unit states facts", () => {
  it("prints the stated output for every solved program and concept card", () => {
    for (const item of allItems(loadBank(FIXTURE_CONTENT_ROOT).units)) {
      if (item.format !== "CODE_WRITE") expect(run(solvedProgramOf(item) ?? []), item.id).toBe(item.solution.expectedOutput);
    }
    for (const { conceptCard } of loadFixtureUnit().lessons) expect(run(conceptCard.code)).toBe(conceptCard.expectedOutput);
  });

  it("PARSONS: exactly the stated and the accepted orders print the expected output", () => {
    const { code = [], solution } = fixtureItem("PARSONS");
    const working = permutations(code.map((_, index) => index)).filter(
      (order) => run(order.map((lineIndex) => code[lineIndex])) === solution.expectedOutput,
    );
    expect(working.map(String).sort()).toEqual([solution.lineOrder, ...(solution.acceptedOrders ?? [])].map(String).sort());
  });

  it("FILL_BLANK: only the accepted chips give the expected output", () => {
    const { code = [], options = [], solution } = fixtureItem("FILL_BLANK");
    const chips = options.map((option) => option.text);
    for (const first of chips) {
      for (const second of chips) {
        const accepted = solution.blanks?.[0].includes(first) && solution.blanks?.[1].includes(second);
        expect(run(fillBlanks(code, [first, second])) === solution.expectedOutput, `${first}, ${second}`).toBe(accepted);
      }
    }
  });

  it("FIX_BUG: the buggy program and every distractor fix print something else", () => {
    const { code = [], options = [], solution } = fixtureItem("FIX_BUG");
    expect(run(code)).not.toBe(solution.expectedOutput);
    for (const option of options) {
      expect(run(applyBugFix(code, solution.bugLine ?? 0, option.text)) === solution.expectedOutput).toBe(option.correct);
    }
  });

  it("CODE_WRITE: the reference passes every test and every wrong solution fails one", () => {
    const { entry, tests = [], reference = [], wrongSolutions = [] } = fixtureItem("CODE_WRITE").solution;
    if (!entry) throw new Error("The fixture CODE_WRITE item has no entry.");
    const passes = (lines: string[]) => tests.every((test) => run(wrapCodeWrite(entry, lines, test.input)) === String(test.expected));
    expect(passes(reference)).toBe(true);
    expect(wrongSolutions.map(passes)).toEqual([false, false, false]);
  });

  it("TRACE: the probed value is the correct option", () => {
    const { code = [], options = [], solution } = fixtureItem("TRACE");
    const probe = solution.probe ?? { variable: "", afterLine: 0, visit: 0 };
    const instrumented = [...code];
    instrumented.splice(probe.afterLine, 0, `visits.push(${probe.variable});`);
    const visits: unknown[] = [];
    runInNewContext(instrumented.join("\n"), { console: { log: () => undefined }, visits });
    expect(String(visits[probe.visit - 1])).toBe(options.find((option) => option.correct)?.text);
  });
});

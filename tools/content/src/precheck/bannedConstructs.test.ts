import { describe, expect, it } from "vitest";
import type { AuthoredItem, UnitFile } from "@project/content-model";
import { loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { checkBannedConstructs } from "./bannedConstructs.js";

function itemOf(unit: UnitFile, idEnding: string): AuthoredItem {
  const item = unit.items.find((candidate) => candidate.id.endsWith(idEnding));
  if (!item) throw new Error(`The fixture has no item ending in ${idEnding}.`);
  return item;
}

/** Checks reported when the fixture's predict item carries `code`. */
function checksFor(code: string, change: (unit: UnitFile) => void = () => undefined): string[] {
  const unit = loadFixtureUnit();
  itemOf(unit, "predict-01").code = code.split("\n");
  change(unit);
  return checkBannedConstructs(unit).map((finding) => finding.check);
}

describe("checkBannedConstructs", () => {
  it("passes the fixture", () => {
    expect(checkBannedConstructs(loadFixtureUnit())).toEqual([]);
  });

  it.each([
    ["console.log(Math.random());", "banned-math-random"],
    ['console.log(Math["random"]());', "banned-math-random"],
    ["const now = new Date();", "banned-date"],
    ["console.log(Date.now());", "banned-date"],
    ["console.log(typeof Date);", "banned-date"],
    ["console.log(new Intl.NumberFormat().format(1));", "banned-intl"],
    ["console.log((5).toLocaleString());", "banned-locale-method"],
    ['console.log("a".toLocaleUpperCase());', "banned-locale-method"],
    ['console.log("a".localeCompare("b"));', "banned-locale-method"],
    ["try {\n  null.size;\n} catch (error) {\n  console.log(error.message);\n}", "banned-error-text"],
    ["try {\n  null.size;\n} catch (error) {\n  const lines = error.stack;\n}", "banned-error-text"],
    ["try {\n  null.size;\n} catch ({ message }) {\n  console.log(1);\n}", "banned-error-text"],
    ["try {\n  null.size;\n} catch (error) {\n  console.log(error);\n}", "banned-error-print"],
    ['try {\n  null.size;\n} catch (problem) {\n  console.log("failed", problem);\n}', "banned-error-print"],
    ['console.log(new TypeError("wrong"));', "banned-error-print"],
    ["process.exit(1);", "banned-global"],
    ['const fs = require("fs");', "banned-global"],
    ["globalThis.count = 1;", "banned-global"],
    ["window.count = 1;", "banned-global"],
    ["console.log(self.name);", "banned-global"],
    ['eval("1 + 1");', "banned-global"],
    ['const add = new Function("return 1");', "banned-global"],
    ['const add = Function("return 1");', "banned-global"],
    ["alert(1);", "banned-global"],
    ['const answer = prompt("name");', "banned-global"],
    ['if (confirm("sure")) console.log(1);', "banned-global"],
    ['fetch("/data");', "banned-global"],
    ["const request = new XMLHttpRequest();", "banned-global"],
    ['import fs from "fs";', "banned-module-syntax"],
    ["export const size = 1;", "banned-module-syntax"],
    ["await Promise.resolve(1);", "banned-module-syntax"],
    ['import("./other.js");', "banned-module-syntax"],
    ["with (Math) {\n  console.log(PI);\n}", "banned-with"],
    ["outer: for (;;) {\n  break outer;\n}", "banned-label"],
    ["debugger;", "banned-debugger"],
    ['console.error("x");', "banned-console-method"],
    ["console.table([1]);", "banned-console-method"],
    ['console["warn"]("x");', "banned-console-method"],
    ["const method = 'log';\nconsole[method](1);", "banned-console-method"],
    ["const delay = 10;\nsetTimeout(() => console.log(1), delay);", "timer-delay-not-literal"],
    ["setTimeout(() => console.log(1), -1);", "timer-delay-not-literal"],
    ["setTimeout(() => console.log(1), 1.5);", "timer-delay-not-literal"],
    ['setInterval(() => console.log(1), "100");', "timer-delay-not-literal"],
    ["setTimeout(() => console.log(1), 50);\nsetTimeout(() => console.log(2));", "timer-delays-too-close"],
    ["setTimeout(() => console.log(1), 100);\nsetInterval(() => console.log(2), 199);", "timer-delays-too-close"],
    ["var count = 1;", "banned-var"],
    ["for (var index = 0; index < 2; index++) {}", "banned-var"],
    ["let = ;", "program-does-not-parse"],
    ["console.log(1;", "program-does-not-parse"],
  ])("reports %j as %s", (code, check) => {
    expect(checksFor(code)).toEqual([check]);
  });

  it.each([
    "console.log(Math.max(1, 2), Math.PI);",
    "const self = 1;\nconsole.log(self);",
    "function show(prompt) {\n  console.log(prompt);\n}",
    'const card = { Date: 1, text: "x" };\nconsole.log(card.Date, card.text);',
    "try {\n  null.size;\n} catch (error) {\n  console.log(error.name);\n}",
    "try {\n  null.size;\n} catch (error) {\n  console.log(error instanceof TypeError);\n}",
    'const error = "plain text";\nconsole.log(error);',
    'throw new RangeError("too big");',
    "setTimeout(() => console.log(1));\nsetTimeout(() => console.log(2), 0);",
    "setTimeout(() => console.log(1), 0);\nsetTimeout(() => console.log(2), 100);\nsetInterval(() => {}, 200);",
    "let variable = 1;\nconst hoisted = 2;",
    'console.log("Math.random() and Date in a string");',
    "const constructor = 1;\nconsole.log(constructor, toString, valueOf);",
  ])("accepts %j", (code) => {
    expect(checksFor(code)).toEqual([]);
  });

  it("allows var only where the concept or the unit teaches var, hoisting or scope", () => {
    const withConcept = (concept: string) => (unit: UnitFile) => void (itemOf(unit, "predict-01").concept = concept);
    const inUnit = (slug: string) => (unit: UnitFile) => void (unit.unit = slug);
    expect(checksFor("var count = 1;", withConcept("var-is-function-scoped"))).toEqual([]);
    expect(checksFor("var count = 1;", withConcept("let-versus-var"))).toEqual([]);
    expect(checksFor("var count = 1;", withConcept("hoisted-declarations"))).toEqual([]);
    expect(checksFor("var count = 1;", withConcept("block-scope"))).toEqual([]);
    expect(checksFor("var count = 1;", inUnit("scope-and-hoisting"))).toEqual([]);
    expect(checksFor("var count = 1;", withConcept("variable-reassignment"))).toEqual(["banned-var"]);
    expect(checksFor("var count = 1;", inUnit("variables"))).toEqual(["banned-var"]);
  });

  it("names the item, the program and the line", () => {
    const unit = loadFixtureUnit();
    itemOf(unit, "predict-01").code = ["let total = 0;", "total = Math.random();"];
    expect(checkBannedConstructs(unit)).toEqual([
      {
        gate: "PRECHECK",
        check: "banned-math-random",
        itemId: "beg.fixture-unit.loop-running-total.predict-01",
        unit: "fixture-unit",
        message: 'Math.random is not deterministic ("code" program, line 2)',
      },
    ]);
  });

  it("PARSONS: only the solved order has to parse", () => {
    const unit = loadFixtureUnit();
    const parsons = itemOf(unit, "array-index-and-length.parsons-01");
    parsons.code = ["}", "console.log(1);", "if (true) {"];
    parsons.solution.lineOrder = [2, 1, 0];
    expect(checkBannedConstructs(unit)).toEqual([]);
    parsons.solution.lineOrder = [1, 2, 0];
    parsons.code[1] = "console.log(1;";
    expect(checkBannedConstructs(unit).map((finding) => finding.check)).toEqual(["program-does-not-parse"]);
  });

  it("FILL_BLANK: scans the snippet with the first accepted chip in every blank", () => {
    const unit = loadFixtureUnit();
    const fill = itemOf(unit, "fill-01");
    expect(checkBannedConstructs(unit)).toEqual([]);
    fill.solution.blanks = [["random"], ["1"]];
    fill.code = ["const last = Math.___() - ___;", "console.log(last);"];
    expect(checkBannedConstructs(unit).map((finding) => finding.check)).toEqual(["banned-math-random"]);
  });

  it("FIX_BUG: both versions must parse, and a construct in both is reported once", () => {
    const unit = loadFixtureUnit();
    const fix = itemOf(unit, "fix-01");
    fix.code![1] = "const extra = Date.now();";
    expect(checkBannedConstructs(unit).map((finding) => finding.check)).toEqual(["banned-date"]);
    fix.code![1] = "const extra = 15;";
    fix.code![2] = "cart.total = cart.sum + ;";
    const findings = checkBannedConstructs(unit);
    expect(findings.map((finding) => finding.check)).toEqual(["program-does-not-parse"]);
    expect(findings[0].message).toContain('the "buggy" program');
  });

  it("CODE_WRITE: scans the wrapped reference, the wrong solutions and the context", () => {
    const unit = loadFixtureUnit();
    const write = itemOf(unit, "write-01");
    write.solution.wrongSolutions![0] = ["return Math.random();"];
    write.solution.reference![0] = "let best = numbers[0]; debugger;";
    write.code = ["var numbers = [1];"];
    expect(checkBannedConstructs(unit).map((finding) => finding.check)).toEqual(["banned-var", "banned-debugger", "banned-math-random"]);
    write.solution.reference = ["return numbers[0]"];
    write.solution.wrongSolutions = [];
    write.code = undefined;
    write.solution.entry = { kind: "expression", variables: ["numbers"] };
    expect(checkBannedConstructs(unit).map((finding) => finding.check)).toEqual(["program-does-not-parse"]);
  });

  it("scans concept-card code and reports it without an item id", () => {
    const unit = loadFixtureUnit();
    unit.lessons[2].conceptCard.code = ["console.log(new Date());"];
    expect(checkBannedConstructs(unit)).toMatchObject([{ check: "banned-date", itemId: null, unit: "fixture-unit" }]);
  });

  it("skips retired items", () => {
    const unit = loadFixtureUnit();
    Object.assign(itemOf(unit, "predict-01"), { code: ["debugger;"], retired: true });
    expect(checkBannedConstructs(unit)).toEqual([]);
  });
});
